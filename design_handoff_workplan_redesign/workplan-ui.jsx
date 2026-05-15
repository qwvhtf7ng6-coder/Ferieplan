// workplan-ui.jsx — shared UI primitives, TopBar, Sidebar
const { useState, useEffect, useRef } = React;

/* ── Helpers ──────────────────────────────────────────────────── */
function fmtDK(s) {if (!s) return "—";return new Date(s).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" });}
function fmtShort(s) {if (!s) return "—";return new Date(s).toLocaleDateString("da-DK", { day: "numeric", month: "short" });}

/* ── Icons ────────────────────────────────────────────────────── */
const IP = {
  home: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
  plus: "M12 5v14M5 12h14",
  list: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6M9 16h4",
  calendar: "M8 2v3M16 2v3M3 8h18M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z",
  users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  building: "M3 21h18M9 21V7l6-4v18M9 11h6M9 15h6",
  flag: "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7",
  chart: "M18 20V10M12 20V4M6 20v-6",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z",
  user: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8",
  logout: "M17 16l4-4m0 0l-4-4m4 4H7M13 16v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h6a2 2 0 012 2v3",
  bell: "M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0",
  check: "M20 6L9 17l-5-5",
  x: "M18 6L6 18M6 6l12 12",
  alert: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0",
  edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  sun: "M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 6a6 6 0 100 12 6 6 0 000-12z",
  moon: "M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z",
  chevL: "M15 18l-6-6 6-6",
  chevR: "M9 18l6-6-6-6",
  download: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6",
  trash: "M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2",
  key: "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  clock: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2",
  history: "M3 12a9 9 0 109-9 9.74 9.74 0 00-6.74 2.74L3 8M3 3v5h5M12 7v5l3 2",
  filter: "M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
  printer: "M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z",
  briefcase: "M20 7h-4V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM10 5h4v2h-4z",
  send: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
};

function Icon({ name, size = 18, color = "currentColor", sw = 1.75 }) {
  const d = IP[name];if (!d) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d.split("M").filter(Boolean).map((seg, i) => <path key={i} d={"M" + seg} />)}
    </svg>);

}

function Avatar({ name, size = 32, gradient = "linear-gradient(135deg,#2454ff,#7c3aed)" }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, fontWeight: 700, color: "white", flexShrink: 0, letterSpacing: "-0.01em" }}>
      {name?.charAt(0).toUpperCase()}
    </div>);

}

/* ── StatusBadge ──────────────────────────────────────────────── */
const STATUS_MAP = {
  PENDING: { label: "Afventer", bg: "var(--c-warning-bg)", color: "var(--c-warning-text)" },
  APPROVED: { label: "Godkendt", bg: "var(--c-success-bg)", color: "var(--c-success-text)" },
  REJECTED: { label: "Afvist", bg: "var(--c-danger-bg)", color: "var(--c-danger-text)" },
  CANCELLED: { label: "Annulleret", bg: "var(--c-bg)", color: "var(--c-text-subtle)" }
};
function StatusBadge({ status }) {
  const m = STATUS_MAP[status] ?? { label: status, bg: "var(--c-bg)", color: "var(--c-text)" };
  return <span style={{ display: "inline-flex", alignItems: "center", fontSize: 11, fontWeight: 700, letterSpacing: "0.02em", padding: "3px 10px", borderRadius: "var(--r-full)", background: m.bg, color: m.color, whiteSpace: "nowrap" }}>{m.label}</span>;
}

/* ── Btn ──────────────────────────────────────────────────────── */
function Btn({ children, variant = "primary", size = "md", onClick, disabled, icon, type = "button", full }) {
  const pad = size === "sm" ? "6px 13px" : size === "lg" ? "12px 26px" : "9px 18px";
  const fz = size === "sm" ? 12.5 : size === "lg" ? 14.5 : 13.5;
  const VM = {
    primary: { bg: "var(--c-primary)", fg: "#fff", hbg: "var(--c-primary-hover)", sh: "0 1px 4px rgba(36,84,255,.3)" },
    secondary: { bg: "var(--c-surface)", fg: "var(--c-text)", hbg: "var(--c-bg)", sh: "none" },
    success: { bg: "#10b981", fg: "#fff", hbg: "#059669", sh: "0 1px 4px rgba(16,185,129,.3)" },
    danger: { bg: "#ef4444", fg: "#fff", hbg: "#dc2626", sh: "0 1px 4px rgba(239,68,68,.3)" },
    ghost: { bg: "transparent", fg: "var(--c-text-muted)", hbg: "var(--c-bg)", sh: "none" },
    outline: { bg: "var(--c-primary-light)", fg: "var(--c-primary)", hbg: "var(--c-primary-muted)", sh: "none" }
  };
  const v = VM[variant] ?? VM.primary;
  const [h, setH] = useState(false);
  const border = variant === "secondary" ? "1.5px solid var(--c-border)" : variant === "outline" ? "1.5px solid var(--c-primary)" : "none";
  return (
    <button type={type} onClick={onClick} disabled={disabled}
    onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
    style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: pad, border, borderRadius: "var(--r-md)", fontSize: fz, fontWeight: 600, background: h && !disabled ? v.hbg : v.bg, color: v.fg, boxShadow: v.sh, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, transition: "background .15s", whiteSpace: "nowrap", width: full ? "100%" : undefined, justifyContent: full ? "center" : undefined, fontFamily: "var(--font)" }}>
      {icon && <Icon name={icon} size={14} sw={2} />}
      {children}
    </button>);

}

/* ── Card ─────────────────────────────────────────────────────── */
function Card({ children, style, onClick, hover }) {
  const [h, setH] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => hover && setH(true)} onMouseLeave={() => hover && setH(false)}
    style={{ background: "var(--c-surface)", borderRadius: "var(--r-lg)", border: `1px solid ${h ? "var(--c-border-hover)" : "var(--c-border)"}`, boxShadow: h ? "var(--sh-md)" : "var(--sh-xs)", transition: "box-shadow .2s, border-color .2s", cursor: onClick ? "pointer" : "default", ...style }}>
      {children}
    </div>);

}

/* ── FieldInput ───────────────────────────────────────────────── */
function FieldInput({ label, id, type = "text", value, onChange, placeholder, required, helper }) {
  const [foc, setFoc] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <label htmlFor={id} style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)" }}>{label}</label>}
      <input id={id} type={type} value={value} onChange={onChange} placeholder={placeholder} required={required}
      onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
      style={{ padding: "10px 14px", border: `1.5px solid ${foc ? "var(--c-primary)" : "var(--c-border)"}`, borderRadius: "var(--r-md)", fontSize: 14, outline: "none", background: "var(--c-surface)", color: "var(--c-text)", transition: "border-color .15s", boxShadow: foc ? "0 0 0 3px rgba(36,84,255,.12)" : "none", width: "100%", fontFamily: "var(--font)" }} />
      {helper && <span style={{ fontSize: 12, color: "var(--c-text-subtle)" }}>{helper}</span>}
    </div>);

}

/* ── PageHeader ───────────────────────────────────────────────── */
function PageHeader({ title, sub, actions }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 28 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.2, color: "var(--c-text)" }}>{title}</h1>
        {sub && <p style={{ fontSize: 13, color: "var(--c-text-muted)", marginTop: 4 }}>{sub}</p>}
      </div>
      {actions && <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>{actions}</div>}
    </div>);

}

/* ── Section label helper ─────────────────────────────────────── */
function SectionLabel({ label }) {
  return <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--c-text-subtle)", marginBottom: 12 }}>{label}</p>;
}

/* ── TopBar (notification bell + dark mode toggle) ────────────── */
const NOTIFS_DATA = [
{ id: 1, title: "Maria Hansen ansøgte om ferie", sub: "3 dage · Salgsafdelingen", time: "For 2 timer siden", read: false, icon: "list", accent: "#2454ff" },
{ id: 2, title: "Peter Nielsens ansøgning godkendt", sub: "2 dage · IT-afdelingen", time: "I går kl. 14:32", read: false, icon: "check", accent: "#10b981" },
{ id: 3, title: "Lars Christensens ansøgning afvist", sub: "½ dag · Support", time: "I går kl. 09:10", read: true, icon: "x", accent: "#ef4444" },
{ id: 4, title: "Ny bruger oprettet: Lone Frederiksen", sub: "IT-afdelingen", time: "2 dage siden", read: true, icon: "user", accent: "#7c3aed" }];

function TopBar({ darkMode, onToggleDark }) {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState(NOTIFS_DATA);
  const unread = notifs.filter((n) => !n.read).length;
  const ref = useRef();
  useEffect(() => {
    const h = (e) => {if (ref.current && !ref.current.contains(e.target)) setOpen(false);};
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const markAll = () => setNotifs((n) => n.map((x) => ({ ...x, read: true })));
  const markOne = (id) => setNotifs((n) => n.map((x) => x.id === id ? { ...x, read: true } : x));
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 25, background: "var(--c-topbar-bg)", borderBottom: "1px solid var(--c-border)", height: 52, display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0 36px", gap: 8 }}>
      {/* Dark mode toggle */}
      <button onClick={onToggleDark} title={darkMode ? "Lys tilstand" : "Mørk tilstand"}
      style={{ width: 36, height: 36, borderRadius: "var(--r-md)", border: "1.5px solid var(--c-border)", background: "var(--c-surface)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--c-text-muted)", transition: "background .15s" }}>
        <Icon name={darkMode ? "sun" : "moon"} size={16} />
      </button>

      {/* Bell */}
      <div ref={ref} style={{ position: "relative" }}>
        <button onClick={() => setOpen((o) => !o)}
        style={{ width: 36, height: 36, borderRadius: "var(--r-md)", border: "1.5px solid var(--c-border)", background: open ? "var(--c-primary-light)" : "var(--c-surface)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative", color: open ? "var(--c-primary)" : "var(--c-text-muted)", transition: "background .15s" }}>
          <Icon name="bell" size={17} />
          {unread > 0 && <span style={{ position: "absolute", top: 6, right: 6, width: 9, height: 9, borderRadius: "50%", background: "#ef4444", border: "2px solid var(--c-surface)" }} />}
        </button>

        {open &&
        <div style={{ position: "absolute", right: 0, top: 46, width: 340, background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: "var(--r-lg)", boxShadow: "var(--sh-lg)", zIndex: 100, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px 12px", borderBottom: "1px solid var(--c-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--c-text)" }}>Notifikationer</span>
                {unread > 0 && <span style={{ fontSize: 11, fontWeight: 700, background: "#ef4444", color: "white", padding: "1px 7px", borderRadius: "var(--r-full)" }}>{unread}</span>}
              </div>
              {unread > 0 && <button onClick={markAll} style={{ fontSize: 12, color: "var(--c-primary)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font)", fontWeight: 600 }}>Marker alle som læst</button>}
            </div>
            <div style={{ maxHeight: 340, overflowY: "auto" }}>
              {notifs.map((n, i) =>
            <div key={n.id} onClick={() => markOne(n.id)}
            style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "13px 18px", borderBottom: i < notifs.length - 1 ? "1px solid var(--c-border)" : "none", background: n.read ? "transparent" : "var(--c-primary-muted)", cursor: "pointer", transition: "background .15s" }}>
                  <div style={{ width: 34, height: 34, borderRadius: "var(--r-md)", background: n.read ? "var(--c-bg)" : n.accent + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                    <Icon name={n.icon} size={16} color={n.read ? "var(--c-text-subtle)" : n.accent} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: n.read ? 400 : 600, color: "var(--c-text)", lineHeight: 1.4 }}>{n.title}</p>
                    <p style={{ fontSize: 11.5, color: "var(--c-text-muted)", marginTop: 1 }}>{n.sub}</p>
                    <p style={{ fontSize: 11, color: "var(--c-text-subtle)", marginTop: 3 }}>{n.time}</p>
                  </div>
                  {!n.read && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--c-primary)", flexShrink: 0, marginTop: 6 }} />}
                </div>
            )}
            </div>
            <div style={{ padding: "10px 18px", borderTop: "1px solid var(--c-border)", textAlign: "center" }}>
              <button style={{ fontSize: 12.5, color: "var(--c-primary)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font)", fontWeight: 600 }}>Se alle notifikationer →</button>
            </div>
          </div>
        }
      </div>
    </div>);

}

/* ── Sidebar ──────────────────────────────────────────────────── */
const NAV = [
{ id: "dashboard", icon: "home", label: "Mine ansøgninger", roles: ["EMPLOYEE", "MANAGER", "ADMIN"] },
{ id: "new", icon: "plus", label: "Ny ansøgning", roles: ["EMPLOYEE", "MANAGER", "ADMIN"] },
{ id: "manager", icon: "list", label: "Ansøgninger", roles: ["MANAGER", "ADMIN"] },
{ id: "shifts", icon: "clock", label: "Vagtplan", roles: ["MANAGER", "ADMIN"] },
{ id: "calendar", icon: "calendar", label: "Kalender", roles: ["MANAGER", "ADMIN"] },
{ id: "users", icon: "users", label: "Brugere", roles: ["ADMIN"] },
{ id: "departments", icon: "building", label: "Afdelinger", roles: ["ADMIN"] },
{ id: "holidays", icon: "flag", label: "Helligdage", roles: ["ADMIN"] },
{ id: "reports", icon: "chart", label: "Rapporter", roles: ["ADMIN"] },
{ id: "settings", icon: "settings", label: "Indstillinger", roles: ["ADMIN"] },
{ id: "profile", icon: "user", label: "Min profil", roles: ["EMPLOYEE", "MANAGER", "ADMIN"] }];


function Sidebar({ screen, setScreen, role, userName, onLogout, sidebarStyle, darkMode }) {
  const links = NAV.filter((l) => l.roles.includes(role));
  const isD = sidebarStyle !== "light";
  const bg = darkMode ? "#080d18" :
  sidebarStyle === "gradient" ? "linear-gradient(180deg,#1a1744 0%,#0d1117 100%)" :
  sidebarStyle === "light" ? "var(--c-surface)" :
  "#0d1117";
  const logoC = isD || darkMode ? "white" : "var(--c-text)";
  const linkC = isD || darkMode ? "#7d8fa5" : "var(--c-text-muted)";
  const actBg = isD || darkMode ? "rgba(36,84,255,.2)" : "var(--c-primary-light)";
  const actFg = isD || darkMode ? "#93b8ff" : "var(--c-primary)";
  const hovBg = isD || darkMode ? "rgba(255,255,255,.07)" : "var(--c-bg)";
  const hovFg = isD || darkMode ? "#cbd5e1" : "var(--c-text)";
  const divC = isD || darkMode ? "rgba(255,255,255,.08)" : "var(--c-border)";
  const borderR = !isD && !darkMode ? "1px solid var(--c-border)" : "none";

  const NavBtn = ({ link }) => {
    const active = screen === link.id;
    return (
      <button onClick={() => setScreen(link.id)}
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", border: "none", borderRadius: "var(--r-md)", background: active ? actBg : "transparent", color: active ? actFg : linkC, fontSize: 13.5, fontWeight: active ? 700 : 500, cursor: "pointer", textAlign: "left", width: "100%", transition: "background .12s, color .12s", fontFamily: "var(--font)" }}
      onMouseEnter={(e) => {if (!active) {e.currentTarget.style.background = hovBg;e.currentTarget.style.color = hovFg;}}}
      onMouseLeave={(e) => {if (!active) {e.currentTarget.style.background = "transparent";e.currentTarget.style.color = linkC;}}}>
        <Icon name={link.icon} size={16} />
        <span style={{ flex: 1 }}>{link.label}</span>
        {active && <div style={{ width: 5, height: 5, borderRadius: "50%", background: actFg, flexShrink: 0 }} />}
      </button>);

  };

  return (
    <aside style={{ width: 228, flexShrink: 0, background: bg, display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0, borderRight: borderR, zIndex: 30 }}>
      {/* Logo */}
      <div style={{ padding: "22px 20px 18px", borderBottom: `1px solid ${divC}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg,#2454ff,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 8px rgba(36,84,255,.45)" }}>
            <Icon name="calendar" size={17} color="white" sw={2.2} />
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, color: logoC, letterSpacing: "-0.025em" }}>WorkPlan</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "10px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 1 }}>
        {links.filter((l) => l.id !== "profile").map((l) => <NavBtn key={l.id} link={l} />)}
        <div style={{ height: 1, background: divC, margin: "8px 4px" }} />
        <NavBtn link={links.find((l) => l.id === "profile") ?? { id: "profile", icon: "user", label: "Min profil" }} />
      </nav>

      {/* User footer */}
      <div style={{ padding: "10px", borderTop: `1px solid ${divC}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: "var(--r-md)" }}>
          <Avatar name={userName} size={30} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: isD || darkMode ? "#e2e8f0" : "var(--c-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userName}</div>
            <div style={{ fontSize: 11, color: isD || darkMode ? "#4b6080" : "var(--c-text-subtle)", marginTop: 1 }}>
              {role === "ADMIN" ? "Administrator" : role === "MANAGER" ? "Leder" : "Medarbejder"}
            </div>
          </div>
          <button onClick={onLogout} title="Log ud"
          style={{ background: "none", border: "none", cursor: "pointer", color: isD || darkMode ? "#475569" : "var(--c-text-subtle)", padding: 4, borderRadius: 6, display: "flex" }}
          onMouseEnter={(e) => e.currentTarget.style.color = "#ef4444"}
          onMouseLeave={(e) => e.currentTarget.style.color = isD || darkMode ? "#475569" : "var(--c-text-subtle)"}>
            <Icon name="logout" size={15} />
          </button>
        </div>
      </div>
    </aside>);

}

/* ── Export to window ─────────────────────────────────────────── */
Object.assign(window, {
  fmtDK, fmtShort,
  Icon, Avatar,
  STATUS_MAP, StatusBadge,
  Btn, Card, FieldInput, PageHeader, SectionLabel,
  TopBar, Sidebar, NAV
});