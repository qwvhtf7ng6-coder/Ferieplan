"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Btn } from "@/components/ui/Btn";
import { Card } from "@/components/ui/Card";
import { Tabs, type TabDef } from "@/components/ui/Tabs";
import { Calendar, Bell, Users, Shield, Check, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import HolidaysPanel from "@/app/admin/holidays/HolidaysPanel";
import DepartmentsPanel from "@/app/admin/departments/DepartmentsPanel";
import VacationBalancePanel from "@/app/admin/vacation-balance/VacationBalancePanel";
import type { Holiday } from "@/app/admin/holidays/HolidaysPanel";
import type { Department } from "@/app/admin/departments/DepartmentsPanel";
import type { BalanceRow } from "@/app/admin/vacation-balance/VacationBalancePanel";

interface Settings {
  id: string;
  calendarVisibility: "ALL_EMPLOYEES" | "MANAGEMENT_ONLY";
  reminderThresholdDays: number;
  vacationBalanceEnabled: boolean;
}

type TabId = "general" | "calendar" | "holidays" | "balance" | "departments";

interface Props {
  settings: Settings | null;
  holidays: Holiday[];
  departments: Department[];
  balanceRows: BalanceRow[];
  balanceYear: number;
  /** Hvilke tabs brugeren har tilladelse til at se. */
  perms: {
    settings: boolean;
    holidays: boolean;
    departments: boolean;
    balance: boolean;
  };
  initialTab: TabId;
}

export default function SettingsClient({
  settings,
  holidays,
  departments,
  balanceRows,
  balanceYear,
  perms,
  initialTab,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabId>(initialTab);

  // Hold URL'en synkroniseret med valgt tab så links/refresh virker
  useEffect(() => {
    const current = searchParams.get("tab");
    if (current !== tab) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      router.replace(`/admin/settings?${params.toString()}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Byg tab-liste baseret på tilladelser. Hver tab har sin egen permission-gate.
  // "general" og "calendar" kræver begge settings.edit (samme bagvedliggende ressource).
  const tabs: TabDef<TabId>[] = [];
  if (perms.settings) {
    tabs.push({ id: "general", label: "Generelt" });
    tabs.push({ id: "calendar", label: "Kalender" });
  }
  if (perms.holidays) tabs.push({ id: "holidays", label: "Helligdage" });
  if (perms.balance && settings?.vacationBalanceEnabled) {
    tabs.push({ id: "balance", label: "Feriedagsregnskab" });
  }
  if (perms.departments) tabs.push({ id: "departments", label: "Afdelinger" });

  // Fall-back hvis URL'en peger på en tab brugeren ikke kan se
  useEffect(() => {
    if (tabs.length > 0 && !tabs.find((t) => t.id === tab)) {
      setTab(tabs[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs.length]);

  return (
    <div>
      <PageHeader title="Indstillinger" subtitle="Konfigurer systemets opførsel" />

      <Tabs tabs={tabs} active={tab} onChange={setTab} bleed="none" />

      <div className="mt-6">
        {tab === "general" && perms.settings && (
          <GeneralTab settings={settings} />
        )}
        {tab === "calendar" && perms.settings && (
          <CalendarTab settings={settings} />
        )}
        {tab === "holidays" && perms.holidays && (
          <HolidaysPanel holidays={holidays} />
        )}
        {tab === "balance" && perms.balance && settings?.vacationBalanceEnabled && (
          <VacationBalancePanel rows={balanceRows} year={balanceYear} />
        )}
        {tab === "departments" && perms.departments && (
          <DepartmentsPanel departments={departments} />
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Generelt-tab: påmindelses-tærskel + feriedagsregnskab-toggle
 * (toggle bor her fordi den styrer hvorvidt feriedagsregnskab-tabben vises)
 * ────────────────────────────────────────────────────────────────────────── */
function GeneralTab({ settings }: { settings: Settings | null }) {
  const router = useRouter();
  const [reminderDays, setReminderDays] = useState(settings?.reminderThresholdDays ?? 3);
  const [vacationBalanceEnabled, setVacationBalanceEnabled] = useState(
    settings?.vacationBalanceEnabled ?? false,
  );
  // Vi gemmer også calendarVisibility i payload'en så vi ikke overskriver den
  const [visibility] = useState(settings?.calendarVisibility ?? "ALL_EMPLOYEES");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2200);
    return () => clearTimeout(t);
  }, [saved]);

  async function save() {
    setLoading(true);
    setSaved(false);
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        calendarVisibility: visibility,
        reminderThresholdDays: reminderDays,
        vacationBalanceEnabled,
      }),
    });
    setSaved(true);
    setLoading(false);
    // refresh så feriedagsregnskab-tabben dukker op/forsvinder
    router.refresh();
  }

  return (
    <div className="space-y-4 max-w-[640px]">
      {/* Reminder threshold */}
      <Card className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div
            className="w-[42px] h-[42px] rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "rgba(217,119,6,.1)", color: "var(--c-warning)" }}
          >
            <Bell size={20} />
          </div>
          <div>
            <p className="text-[15px] font-bold text-text">Påmindelsestærskel til leder</p>
            <p className="text-[12px] text-text-muted mt-0.5">
              Managere får en notifikation hvis en ansøgning har ventet mere end X dage. Sæt til 0 for at deaktivere.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setReminderDays(Math.max(0, reminderDays - 1))}
            className="w-9 h-9 rounded-md border border-border flex items-center justify-center text-text-muted hover:border-primary hover:text-primary transition-colors text-lg font-bold"
          >
            −
          </button>
          <span className="text-[24px] font-extrabold text-text w-10 text-center">
            {reminderDays}
          </span>
          <button
            type="button"
            onClick={() => setReminderDays(Math.min(30, reminderDays + 1))}
            className="w-9 h-9 rounded-md border border-border flex items-center justify-center text-text-muted hover:border-primary hover:text-primary transition-colors text-lg font-bold"
          >
            +
          </button>
          <span className="text-[13px] text-text-muted">dage</span>
          {reminderDays === 0 && (
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-warning-bg text-warning-text">
              Deaktiveret
            </span>
          )}
        </div>
        <p className="text-[12px] text-text-subtle mt-3">Tjekkes automatisk hver dag kl. 08:00.</p>
      </Card>

      {/* Vacation balance toggle */}
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <div
            className="w-[42px] h-[42px] rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: vacationBalanceEnabled ? "rgba(5,150,105,.1)" : "var(--c-bg)",
              color: vacationBalanceEnabled ? "var(--c-success)" : "var(--c-text-muted)",
            }}
          >
            <Wallet size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-text">Feriedagsregnskab</p>
            <p className="text-[12px] text-text-muted mt-0.5">
              Vis feriesaldo til medarbejdere på dashboardet og aktiver fanen til saldostyring.
            </p>
            <p
              className={cn(
                "text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-block mt-2",
                vacationBalanceEnabled
                  ? "bg-success-bg text-success-text"
                  : "bg-warning-bg text-warning-text",
              )}
            >
              {vacationBalanceEnabled ? "Aktiv" : "Deaktiveret"}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={vacationBalanceEnabled}
            onClick={() => setVacationBalanceEnabled((v) => !v)}
            className={cn(
              "relative w-[44px] h-[24px] rounded-full transition-colors duration-150 shrink-0 self-start mt-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              vacationBalanceEnabled ? "bg-success" : "bg-border",
            )}
          >
            <span
              className={cn(
                "absolute top-[2px] w-[20px] h-[20px] rounded-full bg-white shadow-sm transition-all duration-150",
                vacationBalanceEnabled ? "left-[22px]" : "left-[2px]",
              )}
            />
          </button>
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Btn onClick={save} disabled={loading} icon={saved ? <Check size={14} /> : undefined}>
          {loading ? "Gemmer..." : "Gem indstillinger"}
        </Btn>
        {saved && (
          <span className="text-[13px] font-semibold text-success flex items-center gap-1">
            <Check size={14} /> Gemt
          </span>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Kalender-tab: synlighed (alle medarbejdere vs. kun ledelse)
 * ────────────────────────────────────────────────────────────────────────── */
function CalendarTab({ settings }: { settings: Settings | null }) {
  const [visibility, setVisibility] = useState(settings?.calendarVisibility ?? "ALL_EMPLOYEES");
  const [reminderDays] = useState(settings?.reminderThresholdDays ?? 3);
  const [vacationBalanceEnabled] = useState(settings?.vacationBalanceEnabled ?? false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2200);
    return () => clearTimeout(t);
  }, [saved]);

  async function save() {
    setLoading(true);
    setSaved(false);
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        calendarVisibility: visibility,
        reminderThresholdDays: reminderDays,
        vacationBalanceEnabled,
      }),
    });
    setSaved(true);
    setLoading(false);
  }

  const visibilityOptions = [
    {
      value: "ALL_EMPLOYEES",
      label: "Alle medarbejdere",
      description: "Alle kan se teamkalenderen",
      icon: <Users size={18} />,
      color: "var(--c-primary)",
      bg: "var(--c-primary-muted)",
    },
    {
      value: "MANAGEMENT_ONLY",
      label: "Kun ledelse",
      description: "Kun managere og administratorer",
      icon: <Shield size={18} />,
      color: "var(--c-accent)",
      bg: "rgba(124,58,237,.1)",
    },
  ];

  return (
    <div className="space-y-4 max-w-[640px]">
      <Card className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div
            className="w-[42px] h-[42px] rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "var(--c-primary-muted)", color: "var(--c-primary)" }}
          >
            <Calendar size={20} />
          </div>
          <div>
            <p className="text-[15px] font-bold text-text">Kalendersynlighed</p>
            <p className="text-[12px] text-text-muted mt-0.5">
              Bestem hvem der kan se teamkalenderen med alle ansøgninger.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {visibilityOptions.map((opt) => {
            const active = visibility === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setVisibility(opt.value as any)}
                className={cn(
                  "flex items-start gap-3 p-3.5 rounded-lg border-[1.5px] text-left transition-all duration-150",
                  active
                    ? "border-primary bg-primary-light"
                    : "border-border hover:border-border-hover bg-bg",
                )}
              >
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: opt.bg, color: opt.color }}
                >
                  {opt.icon}
                </div>
                <div>
                  <p className={cn("text-[13px] font-semibold", active ? "text-primary" : "text-text")}>
                    {opt.label}
                  </p>
                  <p className="text-[12px] text-text-muted mt-0.5">{opt.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Btn onClick={save} disabled={loading} icon={saved ? <Check size={14} /> : undefined}>
          {loading ? "Gemmer..." : "Gem indstillinger"}
        </Btn>
        {saved && (
          <span className="text-[13px] font-semibold text-success flex items-center gap-1">
            <Check size={14} /> Gemt
          </span>
        )}
      </div>
    </div>
  );
}
