import type { NextConfig } from "next";

const securityHeaders = [
  // Forhindrer clickjacking
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Forhindrer MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Begrænser referrer-info til kun origin
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Forhindrer browser-sideXSS (ældre browsere)
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
