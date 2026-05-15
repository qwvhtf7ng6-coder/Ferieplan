import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./actions/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary:          "var(--c-primary)",
        "primary-hover":  "var(--c-primary-hover)",
        "primary-light":  "var(--c-primary-light)",
        "primary-muted":  "var(--c-primary-muted)",
        accent:           "var(--c-accent)",
        surface:          "var(--c-surface)",
        bg:               "var(--c-bg)",
        border: {
          DEFAULT: "var(--c-border)",
          hover:   "var(--c-border-hover)",
        },
        text: {
          DEFAULT: "var(--c-text)",
          muted:   "var(--c-text-muted)",
          subtle:  "var(--c-text-subtle)",
        },
        success:       "var(--c-success)",
        "success-bg":  "var(--c-success-bg)",
        "success-text":"var(--c-success-text)",
        warning:       "var(--c-warning)",
        "warning-bg":  "var(--c-warning-bg)",
        "warning-text":"var(--c-warning-text)",
        danger:        "var(--c-danger)",
        "danger-bg":   "var(--c-danger-bg)",
        "danger-text": "var(--c-danger-text)",
      },
      borderRadius: {
        sm:  "6px",
        DEFAULT: "10px",
        md:  "10px",
        lg:  "14px",
        xl:  "20px",
        full:"999px",
      },
      boxShadow: {
        xs: "0 1px 2px rgba(0,0,0,0.05)",
        sm: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
        md: "0 4px 12px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)",
        lg: "0 12px 28px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.06)",
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
