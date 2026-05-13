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

const POLL_INTERVAL = 30_000; // 30 seconds

function timeAgo(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Lige nu";
  if (mins < 60) return `${mins} min siden`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} t siden`;
  const days = Math.floor(hours / 24);
  return `${days} d siden`;
}

export default function NotificationBell() {
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

  // Initial fetch + polling
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close panel on outside click
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
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

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

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "relative w-9 h-9 flex items-center justify-center rounded-xl transition-colors",
          open ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-100"
        )}
        aria-label={`Notifikationer${unreadCount > 0 ? ` (${unreadCount} ulæste)` : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className="text-lg leading-none" aria-hidden="true">🔔</span>
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none"
            aria-hidden="true"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notifikationer"
          className="absolute right-0 top-11 z-50 bg-white border border-gray-200 rounded-xl shadow-xl w-80 max-w-[calc(100vw-2rem)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800 text-sm">Notifikationer</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                disabled={loading}
                className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50 py-1"
              >
                Marker alle som læst
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-[360px]">
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
                            className={cn(
                              "mt-1.5 w-2 h-2 rounded-full shrink-0 transition-colors",
                              unread ? "bg-blue-500" : "bg-transparent"
                            )}
                            aria-hidden="true"
                          />
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "text-sm leading-snug",
                              unread ? "font-semibold text-gray-900" : "font-medium text-gray-700"
                            )}>
                              {n.title}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5 leading-snug">
                              {n.message}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-1">
                              {timeAgo(n.createdAt)}
                            </p>
                          </div>
                          {n.link && (
                            <span className="text-gray-300 text-xs mt-1 shrink-0" aria-hidden="true">›</span>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
