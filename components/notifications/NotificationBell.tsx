"use client";

import { useState, useEffect, useRef, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Bell, X } from "lucide-react";
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
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <h3 className="font-bold text-text text-[14px]">Notifikationer</h3>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAll}
              disabled={loading}
              className="text-[12px] font-semibold text-primary hover:text-primary-hover disabled:opacity-50 py-1"
            >
              Marker alle som læst
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 flex items-center justify-center rounded-md text-text-subtle hover:text-text hover:bg-bg"
            aria-label="Luk"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="overflow-y-auto flex-1">
        {notifications.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-text-subtle text-[13px]">Ingen notifikationer endnu</p>
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
                      "w-full text-left px-4 py-3 border-b border-border last:border-0 transition-colors",
                      unread ? "bg-primary-muted hover:bg-primary-light" : "hover:bg-bg"
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={cn("mt-1.5 w-2 h-2 rounded-full shrink-0", unread ? "bg-primary" : "bg-transparent")}
                        aria-hidden="true"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-[13px] leading-snug", unread ? "font-semibold text-text" : "font-medium text-text-muted")}>
                          {n.title}
                        </p>
                        <p className="text-[12px] text-text-muted mt-0.5 leading-snug">{n.message}</p>
                        <p className="text-[11px] text-text-subtle mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                      {n.link && <span className="text-text-subtle text-[12px] mt-1 shrink-0" aria-hidden="true">›</span>}
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
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg min-w-[52px] text-text-subtle hover:text-text-muted transition-colors"
        >
          <span className="relative" aria-hidden="true">
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute -top-[5px] -right-[5px] w-[9px] h-[9px] bg-danger rounded-full border-2 border-[var(--c-topbar-bg)]" />
            )}
          </span>
          <span className="text-[10px] font-semibold leading-tight">Notif.</span>
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]" onClick={() => setOpen(false)} aria-hidden="true" />
            <div
              ref={panelRef}
              role="dialog"
              aria-label="Notifikationer"
              className="fixed bottom-0 left-0 right-0 z-50 bg-surface rounded-t-2xl shadow-lg flex flex-col"
              style={{ maxHeight: "80dvh" }}
            >
              <div className="pt-3 pb-1 flex justify-center shrink-0">
                <div className="w-10 h-1 rounded-full bg-border" aria-hidden="true" />
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
            "flex items-center gap-3 w-full px-3 py-[9px] rounded-md text-[13px] font-medium transition-colors",
            open ? "bg-white/[0.12] text-white font-semibold" : "text-white/60 hover:text-white hover:bg-white/[0.07]"
          )}
        >
          <span className="relative shrink-0" aria-hidden="true">
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute -top-[4px] -right-[4px] w-2 h-2 bg-danger rounded-full border border-[#0d1117]" />
            )}
          </span>
          <span className="flex-1">Notifikationer</span>
          {unreadCount > 0 && (
            <span className="ml-auto bg-danger text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {open && (
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Notifikationer"
            className="absolute left-full top-0 ml-2 z-50 bg-surface border border-border rounded-lg shadow-lg flex flex-col w-[340px]"
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
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute top-[6px] right-[6px] w-[9px] h-[9px] bg-danger rounded-full border-2 border-surface" aria-hidden="true" />
        )}
        {unreadCount > 0 && (
          <span className="sr-only">
            {unreadCount} ulæste
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notifikationer"
          className="absolute right-0 top-11 z-50 bg-surface border border-border rounded-lg shadow-lg flex flex-col w-[340px] max-w-[calc(100vw-1rem)]"
          style={{ maxHeight: "min(420px, 70vh)" }}
        >
          {panelContent}
        </div>
      )}
    </div>
  );
}
