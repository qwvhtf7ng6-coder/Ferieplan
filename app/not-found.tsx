import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="text-center max-w-sm">
        <div
          className="mx-auto mb-6 flex items-center justify-center rounded-full"
          style={{
            width: 64,
            height: 64,
            background: "var(--c-primary-light)",
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--c-primary)"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
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
          Siden blev ikke fundet
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "var(--c-text-muted)",
            marginBottom: 24,
          }}
        >
          Den side, du leder efter, eksisterer ikke eller er blevet flyttet.
        </p>
        <Link
          href="/dashboard"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 20px",
            borderRadius: "var(--r-md)",
            background: "var(--c-primary)",
            color: "#fff",
            fontSize: 13.5,
            fontWeight: 600,
            textDecoration: "none",
            transition: "background .15s",
          }}
        >
          Gå til forsiden
        </Link>
      </div>
    </div>
  );
}
