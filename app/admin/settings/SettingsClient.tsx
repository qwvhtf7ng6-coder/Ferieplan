"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Btn } from "@/components/ui/Btn";
import { Card } from "@/components/ui/Card";
import { Calendar, Bell, Users, Shield, Check, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

interface Settings {
  id: string;
  calendarVisibility: "ALL_EMPLOYEES" | "MANAGEMENT_ONLY";
  reminderThresholdDays: number;
  vacationBalanceEnabled: boolean;
}

export default function SettingsClient({ settings }: { settings: Settings | null }) {
  const [visibility, setVisibility] = useState(settings?.calendarVisibility ?? "ALL_EMPLOYEES");
  const [reminderDays, setReminderDays] = useState(settings?.reminderThresholdDays ?? 3);
  const [vacationBalanceEnabled, setVacationBalanceEnabled] = useState(settings?.vacationBalanceEnabled ?? false);
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
      body: JSON.stringify({ calendarVisibility: visibility, reminderThresholdDays: reminderDays, vacationBalanceEnabled }),
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
    <div>
      <PageHeader title="Indstillinger" subtitle="Konfigurer systemets opførsel" />

      <div className="space-y-4 max-w-[640px]">
        {/* Calendar visibility */}
        <Card className="p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-[42px] h-[42px] rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "var(--c-primary-muted)", color: "var(--c-primary)" }}>
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
                  <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: opt.bg, color: opt.color }}>
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

        {/* Reminder threshold */}
        <Card className="p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-[42px] h-[42px] rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "rgba(217,119,6,.1)", color: "var(--c-warning)" }}>
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
            <span className="text-[24px] font-extrabold text-text w-10 text-center">{reminderDays}</span>
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
          <div className="flex items-start gap-3">
            <div className="w-[42px] h-[42px] rounded-lg flex items-center justify-center shrink-0"
              style={{ background: vacationBalanceEnabled ? "rgba(5,150,105,.1)" : "var(--c-bg)", color: vacationBalanceEnabled ? "var(--c-success)" : "var(--c-text-muted)" }}>
              <Wallet size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[15px] font-bold text-text">Feriedagsregnskab</p>
                {/* Toggle switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={vacationBalanceEnabled}
                  onClick={() => setVacationBalanceEnabled((v) => !v)}
                  className={cn(
                    "relative w-11 h-6 rounded-full transition-colors duration-150 shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                    vacationBalanceEnabled ? "bg-success" : "bg-border"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-150",
                      vacationBalanceEnabled ? "translate-x-5" : "translate-x-0.5"
                    )}
                  />
                </button>
              </div>
              <p className="text-[12px] text-text-muted mt-0.5">
                Vis feriesaldo til medarbejdere på dashboardet og aktiver admin-siden til saldostyring.
              </p>
              <p className={cn(
                "text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-block mt-2",
                vacationBalanceEnabled
                  ? "bg-success-bg text-success-text"
                  : "bg-warning-bg text-warning-text"
              )}>
                {vacationBalanceEnabled ? "Aktiv" : "Deaktiveret"}
              </p>
            </div>
          </div>
        </Card>

        {/* Save */}
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
    </div>
  );
}
