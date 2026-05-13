"use client";

import { useState, useEffect, useRef, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationRow,
} from "@/actions/notifications";

const POLL_INTERVAL = 30_000;

function timeAgo(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Lige nu";
  if (mins < 60) return `${mins} min siden`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} t siden`;
  return `${Math.floor(hours / 24)} d siden`;
}

interface NotificationBellProps {
  variant?: "sidebar" | "topbar" | "bottomnav";
}

export default function NotificationBell({ variant = "topbar" }: NotificationBellProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const fetchNotifications = useCallback(async () => {
    const result = await getMyNotifications();
    if (result.ok && result.data) {
      setNotifications(result.data);
      setUnreadCount(result.unreadCount ?? 0);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on outside click (desktop only)
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open && variant !== "bottomnav") {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, variant]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Lock body scroll when bottom sheet is open
  useEffect(() => {
    if (open && variant === "bottomnav") {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open, variant]);

  async function handleMarkRead(id: string, link: string | null) {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date() } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    if (link) {
      setOpen(false);
      startTransition(() => router.push(link));
    }
  }

  async function handleMarkAll() {
    setLoading(true);
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date() })));
    setUnreadCount(0);
    setLoading(false);
  }

  // ── Shared panel content ──────────────────────────────────────────────────
  const panelContent = (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <h3 className="font-semibold text-gray-800 text-sm">Notifikationer</h3>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAll}
              disabled={loading}
              className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50 py-1"
            >
              Marker alle som læst
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            aria-label="Luk"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="overflow-y-auto flex-1">
        {notifications.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-gray-400 text-sm">Ingen notifikationer endnu</p>
          </div>
        ) : (
          <ul role="list">
            {notifications.map((n) => {
              const unread = !n.readAt;
              return (
                <li key={n.id}>
                  <button
                    onClick={() => handleMarkRead(n.id, n.link)}
                    className={cn(
                      "w-full text-left px-4 py-3 border-b border-gray-50 last:border-0 transition-colors",
                      unread ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-gray-50"
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={cn("mt-1.5 w-2 h-2 rounded-full shrink-0", unread ? "bg-blue-500" : "bg-transparent")}
                        aria-hidden="true"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm leading-snug", unread ? "font-semibold text-gray-900" : "font-medium text-gray-700")}>
                          {n.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-snug">{n.message}</p>
                        <p className="text-[11px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                      {n.link && <span className="text-gray-300 text-xs mt-1 shrink-0" aria-hidden="true">›</span>}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );

  // ── Mobile: bottom sheet ──────────────────────────────────────────────────
  if (variant === "bottomnav") {
    return (
      <>
        <button
          ref={buttonRef}
          onClick={() => setOpen((o) => !o)}
          aria-label={`Notifikationer${unreadCount > 0 ? ` (${unreadCount} ulæste)` : ""}`}
          aria-expanded={open}
          className="flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl flex-1 text-gray-400"
        >
          <span className="relative text-xl leading-none" aria-hidden="true">
            🔔
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </span>
          <span className="text-[10px] font-medium leading-tight">Notif.</span>
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setOpen(false)} aria-hidden="true" />
            <div
              ref={panelRef}
              role="dialog"
              aria-label="Notifikationer"
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl flex flex-col"
              style={{ maxHeight: "80dvh" }}
            >
              <div className="pt-3 pb-1 flex justify-center shrink-0">
                <div className="w-10 h-1 rounded-full bg-gray-300" aria-hidden="true" />
              </div>
              {panelContent}
            </div>
          </>
        )}
      </>
    );
  }

  // ── Desktop sidebar link style ────────────────────────────────────────────
  if (variant === "sidebar") {
    return (
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={() => setOpen((o) => !o)}
          aria-label={`Notifikationer${unreadCount > 0 ? ` (${unreadCount} ulæste)` : ""}`}
          aria-expanded={open}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
            open ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"
          )}
        >
          <span className="relative text-base leading-none w-5 text-center shrink-0" aria-hidden="true">
            🔔
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </span>
          <span>Notifikationer</span>
          {unreadCount > 0 && (
            <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {open && (
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Notifikationer"
            className="absolute left-full top-0 ml-2 z-50 bg-white border border-gray-200 rounded-xl shadow-xl flex flex-col w-80"
            style={{ maxHeight: "min(420px, 70vh)" }}
          >
            {panelContent}
          </div>
        )}
      </div>
    );
  }

  // ── Topbar compact icon ───────────────────────────────────────────────────
  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifikationer${unreadCount > 0 ? ` (${unreadCount} ulæste)` : ""}`}
        aria-expanded={open}
        className={cn(
          "relative w-9 h-9 flex items-center justify-center rounded-xl transition-colors",
          open ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-100"
        )}
      >
        <span className="text-lg leading-none" aria-hidden="true">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notifikationer"
          className="absolute right-0 top-11 z-50 bg-white border border-gray-200 rounded-xl shadow-xl flex flex-col w-80 max-w-[calc(100vw-1rem)]"
          style={{ maxHeight: "min(420px, 70vh)" }}
        >
          {panelContent}
        </div>
      )}
    </div>
  );
}
