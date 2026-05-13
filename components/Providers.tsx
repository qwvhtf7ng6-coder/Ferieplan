"use client";

import { SessionProvider } from "next-auth/react";
import InactivityLogout from "@/components/InactivityLogout";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <InactivityLogout />
      {children}
    </SessionProvider>
  );
}
