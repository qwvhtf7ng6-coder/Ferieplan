"use client";

import { useEffect } from "react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[SectionError]", error);
  }, [error]);

  return (
    <div style={{ padding: "32px 36px", maxWidth: 860, margin: "0 auto" }}>
      <div
        style={{
          border: "2px dashed var(--c-danger-bg)",
          borderRadius: "var(--r-lg)",
          padding: "40px 24px",
          textAlign: "center",
          background: "var(--c-surface)",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "var(--c-danger-bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <svg
            width="24"
            height="24"
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
        <h2
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "var(--c-text)",
            marginBottom: 6,
          }}
        >
          Siden kunne ikke indlæses
        </h2>
        <p
          style={{
            fontSize: 13.5,
            color: "var(--c-text-muted)",
            marginBottom: 20,
          }}
        >
          Der opstod en uventet fejl. Prøv at genindlæse siden.
        </p>
        <button
          onClick={reset}
          style={{
            padding: "8px 18px",
            borderRadius: "var(--r-md)",
            background: "var(--c-primary)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
          }}
        >
          Prøv igen
        </button>
      </div>
    </div>
  );
}
