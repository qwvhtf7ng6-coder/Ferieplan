"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

interface NavProps {
  role: string;
  name: string;
  calendarVisible?: boolean;
}

export default function Nav({ role, name, calendarVisible = false }: NavProps) {
  const pathname = usePathname();

  const links = [
    { href: "/dashboard",         label: "Mine ansøgninger",     roles: ["EMPLOYEE", "MANAGER", "ADMIN"] },
    { href: "/requests/new",      label: "Ny ansøgning",         roles: ["EMPLOYEE", "MANAGER", "ADMIN"] },
    { href: "/manager/requests",  label: "Afdelingsansøgninger", roles: ["MANAGER", "ADMIN"] },
    { href: "/manager/calendar",  label: "Kalender",             roles: ["MANAGER", "ADMIN"] },
    ...(calendarVisible && role === "EMPLOYEE"
      ? [{ href: "/manager/calendar", label: "Kalender", roles: ["EMPLOYEE"] }]
      : []),
    { href: "/admin/users",       label: "Brugere",              roles: ["ADMIN"] },
    { href: "/admin/departments", label: "Afdelinger",           roles: ["ADMIN"] },
    { href: "/admin/holidays",    label: "Helligdage",           roles: ["ADMIN"] },
    { href: "/admin/settings",    label: "Indstillinger",        roles: ["ADMIN"] },
  ].filter((l) => l.roles.includes(role));

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 flex-wrap">
      <span className="font-bold text-blue-700 text-lg mr-2">🏖️ Ferieplan</span>
      {links.map((l, i) => (
        <Link
          key={i}
          href={l.href}
          className={cn(
            "text-sm font-medium px-2 py-1 rounded transition-colors",
            pathname === l.href
              ? "text-blue-700 bg-blue-50"
              : "text-gray-600 hover:text-blue-700"
          )}
        >
          {l.label}
        </Link>
      ))}
      <div className="ml-auto flex items-center gap-3">
        <Link
          href="/profile"
          className={cn(
            "text-xs font-medium px-2 py-1 rounded transition-colors",
            pathname === "/profile"
              ? "text-blue-700 bg-blue-50"
              : "text-gray-500 hover:text-blue-700"
          )}
        >
          {name}
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-xs text-gray-400 hover:text-red-600 transition-colors"
        >
          Log ud
        </button>
      </div>
    </nav>
  );
}
