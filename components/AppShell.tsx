/**
 * AppShell wraps all authenticated pages.
 * Provides: sidebar offset padding, mobile top/bottom bar offset, and TopBar.
 * Login page does NOT use this — it renders full-screen directly.
 */
import { TopBar } from "@/components/TopBar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="md:pl-56 pt-14 md:pt-0 pb-20 md:pb-0 min-h-screen">
      <TopBar />
      {children}
    </div>
  );
}
