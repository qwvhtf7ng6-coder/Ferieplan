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
    { href: "/dashboard",         label: "Mine ansøgninger",      roles: ["EMPLOYEE", "MANAGER", "ADMIN"] },
    { href: "/requests/new",      label: "Ny ansøgning",          roles: ["EMPLOYEE", "MANAGER", "ADMIN"] },
    { href: "/manager/requests",  label: "Afdelingsansøgninger",  roles: ["MANAGER", "ADMIN"] },
    { href: "/manager/calendar",  label: "Kalender",              roles: ["MANAGER", "ADMIN"], alwaysShow: true },
    { href: "/manager/calendar",  label: "Kalender",              roles: ["EMPLOYEE"],         alwaysShow: false },
    { href: "/admin/users",       label: "Brugere",               roles: ["ADMIN"] },
    { href: "/admin/departments", label: "Afdelinger",            roles: ["ADMIN"] },
    { href: "/admin/holidays",    label: "Helligdage",            roles: ["ADMIN"] },
    { href: "/admin/settings",    label: "Indstillinger",         roles: ["ADMIN"] },
  ].filter((l) => {
    if (!l.roles.includes(role)) return false;
    // For employees: only show calendar if calendarVisible is true
    if (role === "EMPLOYEE" && l.href === "/manager/calendar") return calendarVisible;
    return true;
  });

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-6 flex-wrap">
      <span className="font-bold text-blue-700 text-lg mr-2">🏖️ Ferieplan</span>
      {links.map((l) => (
        <Link
          key={l.href + l.label}
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
        <span className="text-xs text-gray-500">{name}</span>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-xs text-gray-500 hover:text-red-600"
        >
          Log ud
        </button>
      </div>
    </nav>
  );
}
