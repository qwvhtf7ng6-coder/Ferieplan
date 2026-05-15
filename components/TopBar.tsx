"use client";

import NotificationBell from "@/components/notifications/NotificationBell";

/**
 * Desktop-only sticky topbar that sits at the top of the content column
 * (to the right of the sidebar). Shows the notification bell right-aligned.
 * Matches the design spec: sticky, 52px tall, right-aligned bell + dark toggle.
 */
export function TopBar() {
  return (
    <div
      className="hidden md:flex items-center justify-end gap-2 sticky top-0 z-30 h-[52px] px-9 border-b border-border no-print"
      style={{ background: "var(--c-topbar-bg)", backdropFilter: "blur(12px)" }}
    >
      <NotificationBell variant="topbar" />
    </div>
  );
}
