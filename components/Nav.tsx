"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import NotificationBell from "@/components/notifications/NotificationBell";
import {
  Home, Plus, ClipboardList, Calendar, Users, Building2, Flag,
  BarChart3, Settings, User, LogOut, Menu, X, CalendarDays, Wallet,
} from "lucide-react";
import { DarkModeToggle } from "@/components/DarkModeToggle";

interface NavProps {
  role: string;
  name: string;
  calendarVisible?: boolean;
  shiftsVisible?: boolean;
  vacationBalanceEnabled?: boolean;
}

interface NavLink {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles: string[];
}

export default function Nav({ role, name, calendarVisible = false, shiftsVisible = true, vacationBalanceEnabled = false }: NavProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const links: NavLink[] = [
    { href: "/dashboard",         label: "Mine ansøgninger",  icon: <Home size={16} />,        roles: ["EMPLOYEE", "MANAGER", "ADMIN"] },
    { href: "/requests/new",      label: "Ny ansøgning",      icon: <Plus size={16} />,        roles: ["EMPLOYEE", "MANAGER", "ADMIN"] },
    { href: "/manager/requests",  label: "Ansøgninger",       icon: <ClipboardList size={16} />, roles: ["MANAGER", "ADMIN"] },
    ...(shiftsVisible ? [{ href: "/manager/shifts", label: "Vagtplan", icon: <CalendarDays size={16} />, roles: ["EMPLOYEE", "MANAGER", "ADMIN"] }] : []),
    { href: "/manager/calendar",  label: "Kalender",          icon: <Calendar size={16} />,    roles: ["MANAGER", "ADMIN"] },
    ...(calendarVisible && role === "EMPLOYEE"
      ? [{ href: "/manager/calendar", label: "Kalender", icon: <Calendar size={16} />, roles: ["EMPLOYEE"] }]
      : []),
    { href: "/admin/users",       label: "Brugere",           icon: <Users size={16} />,       roles: ["ADMIN"] },
    { href: "/admin/departments",  label: "Afdelinger",       icon: <Building2 size={16} />,   roles: ["ADMIN"] },
    { href: "/admin/holidays",    label: "Helligdage",        icon: <Flag size={16} />,        roles: ["ADMIN"] },
    ...(vacationBalanceEnabled ? [{ href: "/admin/vacation-balance", label: "Feriesaldo", icon: <Wallet size={16} />, roles: ["ADMIN"] }] : []),
    { href: "/admin/reports",     label: "Rapporter",         icon: <BarChart3 size={16} />,   roles: ["ADMIN"] },
    { href: "/admin/settings",    label: "Indstillinger",     icon: <Settings size={16} />,    roles: ["ADMIN"] },
    { href: "/profile",           label: "Min profil",        icon: <User size={16} />,        roles: ["EMPLOYEE", "MANAGER", "ADMIN"] },
  ].filter((l) => l.roles.includes(role));

  const mainLinks = links.filter((l) => l.href !== "/profile");
  const bottomLinks = links.slice(0, 5);

  return (
    <>
      {/* ── Desktop Sidebar ─────────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-56 z-40 no-print"
        style={{ background: "linear-gradient(180deg, #1a1744 0%, #0d1117 100%)" }}>

        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/[0.07]">
          <div className="flex items-center gap-2.5">
            <div className="w-[34px] h-[34px] rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
              <CalendarDays size={18} className="text-white" />
            </div>
            <span className="font-extrabold text-white text-[15px] tracking-tight">WorkPlan</span>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {mainLinks.map((l) => {
            const active = pathname === l.href || (l.href !== "/dashboard" && pathname.startsWith(l.href));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-[9px] rounded-md text-[13px] font-medium transition-colors duration-150 relative",
                  active
                    ? "bg-white/[0.12] text-white font-semibold"
                    : "text-white/60 hover:text-white hover:bg-white/[0.07]",
                )}
              >
                <span className="shrink-0">{l.icon}</span>
                <span className="flex-1">{l.label}</span>
                {active && (
                  <span className="w-[5px] h-[5px] rounded-full bg-primary shrink-0" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/[0.07] px-3 py-3 space-y-0.5">
          <Link
            href="/profile"
            className={cn(
              "flex items-center gap-3 px-3 py-[9px] rounded-md text-[13px] font-medium transition-colors",
              pathname === "/profile"
                ? "bg-white/[0.12] text-white font-semibold"
                : "text-white/60 hover:text-white hover:bg-white/[0.07]",
            )}
          >
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-[11px]"
              style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-[12px] font-semibold truncate">{name}</p>
              <p className="text-white/40 text-[11px] truncate capitalize">{role.toLowerCase()}</p>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex-1 flex items-center gap-3 px-3 py-[9px] rounded-md text-[13px] text-white/50 hover:text-white hover:bg-white/[0.07] transition-colors"
            >
              <LogOut size={16} />
              <span>Log ud</span>
            </button>
            <DarkModeToggle variant="sidebar" />
          </div>
        </div>
      </aside>

      {/* ── Mobile Top Bar ───────────────────────────────────────────────── */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 z-40 flex items-center justify-between px-4 border-b border-border no-print"
        style={{ background: "var(--c-topbar-bg)", backdropFilter: "blur(12px)" }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
            <CalendarDays size={14} className="text-white" />
          </div>
          <span className="font-extrabold text-text text-[14px]">WorkPlan</span>
        </div>
        <div className="flex items-center gap-1">
          <DarkModeToggle className="text-text-muted hover:text-text hover:bg-bg" />
          <NotificationBell variant="topbar" />
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-9 h-9 flex items-center justify-center rounded-md text-text-muted hover:text-text hover:bg-primary-muted transition-colors"
            aria-label="Menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile full-screen menu */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col no-print"
          style={{ background: "linear-gradient(180deg, #1a1744 0%, #0d1117 100%)", top: 56 }}>
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-md text-[14px] font-medium transition-colors",
                    active ? "bg-white/[0.12] text-white font-semibold" : "text-white/60 hover:text-white hover:bg-white/[0.07]",
                  )}
                >
                  <span className="shrink-0">{l.icon}</span>
                  {l.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-white/[0.07] px-4 py-4">
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-[14px] text-white/50 hover:text-white hover:bg-white/[0.07] transition-colors"
            >
              <LogOut size={16} />
              Log ud
            </button>
          </div>
        </div>
      )}

      {/* ── Mobile Bottom Nav ────────────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border safe-area-pb no-print"
        style={{ background: "var(--c-topbar-bg)", backdropFilter: "blur(12px)" }}>
        <div className="flex items-center justify-around h-16 px-2">
          {bottomLinks.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-[52px]",
                  active ? "text-primary" : "text-text-subtle hover:text-text-muted",
                )}
              >
                <span className="shrink-0">{l.icon}</span>
                <span className="text-[10px] font-semibold leading-tight text-center">{l.label.split(" ")[0]}</span>
              </Link>
            );
          })}
          <NotificationBell variant="bottomnav" />
        </div>
      </nav>
    </>
  );
}
