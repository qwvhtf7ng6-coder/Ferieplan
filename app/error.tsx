"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Error]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="text-center max-w-sm">
        <div
          className="mx-auto mb-6 flex items-center justify-center rounded-full"
          style={{ width: 64, height: 64, background: "var(--c-danger-bg)" }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--c-danger)"
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
            color: "var(--c-text)",
            marginBottom: 8,
          }}
        >
          Noget gik galt
        </h1>
        <p style={{ fontSize: 14, color: "var(--c-text-muted)", marginBottom: 24 }}>
          Der opstod en uventet fejl. Prøv at genindlæse siden.
        </p>
        <button
          onClick={reset}
          style={{
            padding: "9px 20px",
            borderRadius: "var(--r-md)",
            background: "var(--c-primary)",
            color: "#fff",
            fontSize: 13.5,
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
            transition: "background .15s",
          }}
        >
          Prøv igen
        </button>
      </div>
    </div>
  );
}
