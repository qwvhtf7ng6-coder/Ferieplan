import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "WorkPlan",
  description: "Ferieplanlægning",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="da">
      <body className="min-h-screen bg-gray-50">
        <Providers>
          {/* Sidebar offset on desktop, top+bottom bar offset on mobile */}
          <div className="md:pl-56 pt-14 md:pt-0 pb-20 md:pb-0 min-h-screen">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
