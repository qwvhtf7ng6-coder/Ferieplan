"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log til evt. ekstern fejlrapportering
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="da">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f0f3fb",
          fontFamily: "system-ui, sans-serif",
          padding: "1rem",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 360 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "#fee2e2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#dc2626"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: "-0.025em",
              color: "#111827",
              marginBottom: 8,
            }}
          >
            Noget gik galt
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "#6b7280",
              marginBottom: 24,
            }}
          >
            Der opstod en uventet fejl. Prøv at genindlæse siden.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "9px 20px",
              borderRadius: 10,
              background: "#4f46e5",
              color: "#fff",
              fontSize: 13.5,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            Prøv igen
          </button>
        </div>
      </body>
    </html>
  );
}
