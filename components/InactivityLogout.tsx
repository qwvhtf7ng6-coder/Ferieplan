"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { signOut } from "next-auth/react";
import { Modal } from "@/components/ui/Modal";
import { Btn } from "@/components/ui/Btn";
import { Clock } from "lucide-react";

const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const WARN_MS    =  2 * 60 * 1000; // warn 2 minutes before
const EVENTS     = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];

export default function InactivityLogout() {
  const timeoutRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(WARN_MS / 1000);

  const clearAll = useCallback(() => {
    if (timeoutRef.current)  clearTimeout(timeoutRef.current);
    if (warnRef.current)     clearTimeout(warnRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const startCountdown = useCallback(() => {
    setSecondsLeft(WARN_MS / 1000);
    setShowWarning(true);
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current!);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, []);

  const resetTimer = useCallback(() => {
    clearAll();
    setShowWarning(false);

    warnRef.current = setTimeout(startCountdown, TIMEOUT_MS - WARN_MS);
    timeoutRef.current = setTimeout(() => {
      signOut({ callbackUrl: "/login" });
    }, TIMEOUT_MS);
  }, [clearAll, startCountdown]);

  function stayLoggedIn() {
    resetTimer();
  }

  useEffect(() => {
    resetTimer();
    EVENTS.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    return () => {
      clearAll();
      EVENTS.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [resetTimer, clearAll]);

  // Format mm:ss
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const countdown = `${mins}:${String(secs).padStart(2, "0")}`;

  return (
    <Modal open={showWarning} onClose={stayLoggedIn} title="Du logges snart ud">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 rounded-lg"
          style={{ background: "var(--c-warning-bg)", border: "1px solid rgba(217,119,6,.2)" }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "rgba(217,119,6,.15)", color: "var(--c-warning)" }}>
            <Clock size={18} />
          </div>
          <div>
            <p className="text-[13px] font-semibold" style={{ color: "var(--c-warning-text)" }}>
              Pga. inaktivitet logges du automatisk ud om
            </p>
            <p className="text-[28px] font-extrabold tracking-tight mt-1" style={{ color: "var(--c-warning)" }}>
              {countdown}
            </p>
          </div>
        </div>
        <p className="text-[13px] text-text-muted">
          Klik på knappen nedenfor for at forblive logget ind.
        </p>
        <Btn onClick={stayLoggedIn} full>Bliv logget ind</Btn>
      </div>
    </Modal>
  );
}
