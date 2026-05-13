"use client";

import { useEffect, useRef, useCallback } from "react";
import { signOut } from "next-auth/react";

const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const WARN_MS = 60 * 1000;          // warn 1 minute before
const EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];

export default function InactivityLogout() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnToastRef = useRef<HTMLDivElement | null>(null);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warnRef.current) clearTimeout(warnRef.current);
  }, []);

  const hideWarning = useCallback(() => {
    if (warnToastRef.current) {
      warnToastRef.current.style.opacity = "0";
      setTimeout(() => {
        warnToastRef.current?.remove();
        warnToastRef.current = null;
      }, 300);
    }
  }, []);

  const showWarning = useCallback(() => {
    if (warnToastRef.current) return;
    const toast = document.createElement("div");
    toast.setAttribute("role", "alert");
    toast.setAttribute("aria-live", "assertive");
    toast.style.cssText = `
      position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
      z-index: 9999; background: #1e293b; color: white;
      padding: 12px 20px; border-radius: 12px; font-size: 14px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      transition: opacity 0.3s; opacity: 1;
      white-space: nowrap;
    `;
    toast.textContent = "⚠️ Du logges ud om 1 minut pga. inaktivitet";
    document.body.appendChild(toast);
    warnToastRef.current = toast;
  }, []);

  const resetTimer = useCallback(() => {
    clearTimers();
    hideWarning();

    warnRef.current = setTimeout(showWarning, TIMEOUT_MS - WARN_MS);
    timeoutRef.current = setTimeout(() => {
      signOut({ callbackUrl: "/login" });
    }, TIMEOUT_MS);
  }, [clearTimers, hideWarning, showWarning]);

  useEffect(() => {
    resetTimer();
    EVENTS.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    return () => {
      clearTimers();
      hideWarning();
      EVENTS.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [resetTimer, clearTimers, hideWarning]);

  return null;
}
