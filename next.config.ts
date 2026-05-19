import type { NextConfig } from "next";

// Content-Security-Policy:
// - default-src 'self'               — alt blokeres medmindre eksplicit tilladt
// - script-src 'self' 'unsafe-inline'— Next.js inline scripts (hydration) kræver unsafe-inline
// - style-src 'self' 'unsafe-inline' — Tailwind + Next.js inline styles
// - font-src 'self' fonts.gstatic.com— Plus Jakarta Sans via next/font/google
// - connect-src 'self'               — fetch/XHR kun til egen origin
// - img-src 'self' data:             — data: til favicon/inline SVGs
// - frame-ancestors 'none'           — forhindrer embedding i iframe (erstatter X-Frame-Options)
// - base-uri 'self'                  — forhindrer base-tag hijacking
// - form-action 'self'               — forhindrer form-submission til externe sites
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' fonts.gstatic.com",
  "connect-src 'self'",
  "img-src 'self' data:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  // Content-Security-Policy
  { key: "Content-Security-Policy", value: CSP },
  // Forhindrer clickjacking (legacy fallback — frame-ancestors i CSP er primær)
  { key: "X-Frame-Options", value: "DENY" },
  // Forhindrer MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Begrænser referrer-info til kun origin
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Forhindrer browser-side XSS (ældre browsere)
  { key: "X-XSS-Protection", value: "1; mode=block" },
  // Tillader kun HTTPS i 1 år (inkl. subdomæner)
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // Permissions Policy: slå unødvendige browser-API'er fra
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Gælder alle routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
