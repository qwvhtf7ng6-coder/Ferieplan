"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DarkModeToggleProps {
  /** "sidebar" = dark bg styling, "topbar" = light bg styling (default) */
  variant?: "sidebar" | "topbar";
  className?: string;
}

export function DarkModeToggle({ variant = "topbar", className }: DarkModeToggleProps) {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
  }

  if (!mounted) return <div className="w-8 h-8" />;

  const sidebarCls = "text-white/50 hover:text-white hover:bg-white/[0.07]";
  const topbarCls  = "text-text-muted hover:text-text hover:bg-bg";

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Skift til lys tilstand" : "Skift til mørk tilstand"}
      className={cn(
        "w-8 h-8 flex items-center justify-center rounded-md transition-colors",
        variant === "sidebar" ? sidebarCls : topbarCls,
        className,
      )}
    >
      {dark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
