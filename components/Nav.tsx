"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import NotificationBell from "@/components/notifications/NotificationBell";

interface NavProps {
  role: string;
  name: string;
  calendarVisible?: boolean;
}

interface NavLink {
  href: string;
  label: string;
  icon: string;
  roles: string[];
}

export default function Nav({ role, name, calendarVisible = false }: NavProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const links: NavLink[] = [
    { href: "/dashboard",         label: "Mine ansøgninger",  icon: "🏠", roles: ["EMPLOYEE", "MANAGER", "ADMIN"] },
    { href: "/requests/new",      label: "Ny ansøgning",      icon: "＋", roles: ["EMPLOYEE", "MANAGER", "ADMIN"] },
    { href: "/manager/requests",  label: "Ansøgninger",       icon: "📋", roles: ["MANAGER", "ADMIN"] },
    { href: "/manager/calendar",  label: "Kalender",          icon: "📅", roles: ["MANAGER", "ADMIN"] },
    ...(calendarVisible && role === "EMPLOYEE"
      ? [{ href: "/manager/calendar", label: "Kalender", icon: "📅", roles: ["EMPLOYEE"] }]
      : []),
    { href: "/admin/users",       label: "Brugere",           icon: "👥", roles: ["ADMIN"] },
    { href: "/admin/departments", label: "Afdelinger",        icon: "🏢", roles: ["ADMIN"] },
    { href: "/admin/holidays",    label: "Helligdage",        icon: "🎌", roles: ["ADMIN"] },
    { href: "/admin/reports",     label: "Rapporter",         icon: "📊", roles: ["ADMIN"] },
    { href: "/admin/settings",    label: "Indstillinger",     icon: "⚙️",  roles: ["ADMIN"] },
    { href: "/profile",           label: "Min profil",        icon: "👤", roles: ["EMPLOYEE", "MANAGER", "ADMIN"] },
  ].filter((l) => l.roles.includes(role));

  // Bottom nav: max 5 most important links for mobile
  const bottomLinks = links.slice(0, 5);

  return (
    <>
      {/* ── Sidebar (desktop) ── */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-56 bg-white border-r border-gray-200 z-40">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-100">
          <span className="font-bold text-blue-700 text-lg">📅 WorkPlan</span>
        </div>

        {/* Links */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1" aria-label="Primær navigation">
          {links.filter(l => l.href !== "/profile").map((l, i) => {
            const active = pathname === l.href;
            return (
              <Link
                key={i}
                href={l.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  active
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100"
                )}
                aria-current={active ? "page" : undefined}
              >
                <span className="text-base leading-none" aria-hidden="true">{l.icon}</span>
                {l.label}
              </Link>
            );
          })}
          {/* Notification bell as nav item */}
          <NotificationBell variant="sidebar" />
        </nav>

        {/* User section */}
        <div className="border-t border-gray-100 p-3">
          <Link
            href="/profile"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors w-full",
              pathname === "/profile"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            )}
            aria-current={pathname === "/profile" ? "page" : undefined}
          >
            <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0" aria-hidden="true">
              {name?.charAt(0).toUpperCase()}
            </span>
            <span className="truncate">{name}</span>
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors w-full mt-1"
          >
            <span className="text-base" aria-hidden="true">🚪</span>
            Log ud
          </button>
        </div>
      </aside>

      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 px-4 h-14 flex items-center justify-between">
        <span className="font-bold text-blue-700 text-base">📅 WorkPlan</span>
        <Link
          href="/profile"
          className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold"
          aria-label={`Profil: ${name}`}
        >
          {name?.charAt(0).toUpperCase()}
        </Link>
      </header>

      {/* ── Mobile full-screen menu overlay ── */}
      {menuOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/50"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      <div
        className={cn(
          "md:hidden fixed top-0 right-0 bottom-0 z-50 w-72 bg-white shadow-xl flex flex-col transition-transform duration-200",
          menuOpen ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className="flex items-center justify-between px-4 h-14 border-b border-gray-100">
          <span className="font-semibold text-gray-800">Menu</span>
          <button
            onClick={() => setMenuOpen(false)}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100"
            aria-label="Luk menu"
          >
            ✕
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1" aria-label="Fuld navigation">
          {links.map((l, i) => {
            const active = pathname === l.href;
            return (
              <Link
                key={i}
                href={l.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors",
                  active
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                )}
                aria-current={active ? "page" : undefined}
              >
                <span className="text-base w-6 text-center" aria-hidden="true">{l.icon}</span>
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-gray-100 p-3">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors w-full"
          >
            <span className="text-base w-6 text-center" aria-hidden="true">🚪</span>
            Log ud
          </button>
        </div>
      </div>

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex items-center justify-around px-1 safe-area-pb"
        aria-label="Primær navigation"
      >
        {bottomLinks.map((l, i) => {
          const active = pathname === l.href;
          return (
            <Link
              key={i}
              href={l.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl transition-colors flex-1",
                active ? "text-blue-600" : "text-gray-400"
              )}
              aria-current={active ? "page" : undefined}
              aria-label={l.label}
            >
              <span className={cn("text-xl leading-none", active && "scale-110 transition-transform")} aria-hidden="true">
                {l.icon}
              </span>
              <span className="text-[10px] font-medium truncate max-w-[56px] text-center leading-tight">
                {l.label}
              </span>
            </Link>
          );
        })}
        {/* Notification bell */}
        <NotificationBell variant="bottomnav" />
        {/* "More" button if > 5 links */}
        {links.length > 5 && (
          <button
            onClick={() => setMenuOpen(true)}
            className="flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl text-gray-400 flex-1"
            aria-label="Flere menupunkter"
          >
            <span className="text-xl leading-none" aria-hidden="true">•••</span>
            <span className="text-[10px] font-medium">Mere</span>
          </button>
        )}
      </nav>
    </>
  );
}
