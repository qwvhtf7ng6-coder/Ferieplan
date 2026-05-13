"use client";

import { useState } from "react";

interface Settings {
  id: string;
  calendarVisibility: "ALL_EMPLOYEES" | "MANAGEMENT_ONLY";
  reminderThresholdDays: number;
}

export default function SettingsClient({ settings }: { settings: Settings | null }) {
  const [visibility, setVisibility] = useState(
    settings?.calendarVisibility ?? "ALL_EMPLOYEES"
  );
  const [reminderDays, setReminderDays] = useState(
    settings?.reminderThresholdDays ?? 3
  );
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    setSaved(false);
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        calendarVisibility: visibility,
        reminderThresholdDays: reminderDays,
      }),
    });
    setSaved(true);
    setLoading(false);
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-6">Indstillinger</h1>

      <div className="space-y-4">
        {/* Calendar visibility */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Kalendersynlighed
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="ALL_EMPLOYEES"
                checked={visibility === "ALL_EMPLOYEES"}
                onChange={() => setVisibility("ALL_EMPLOYEES")}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700">Alle medarbejdere</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="MANAGEMENT_ONLY"
                checked={visibility === "MANAGEMENT_ONLY"}
                onChange={() => setVisibility("MANAGEMENT_ONLY")}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700">Kun ledelse</span>
            </label>
          </div>
        </div>

        {/* Reminder threshold */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Påmindelsestærskel til leder
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Managere får en notifikation hvis en ansøgning har ventet mere end X dage.
            Sæt til 0 for at deaktivere.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              max={30}
              value={reminderDays}
              onChange={(e) => setReminderDays(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <span className="text-sm text-gray-600">dage</span>
            {reminderDays === 0 && (
              <span className="text-xs text-orange-600 bg-orange-50 border border-orange-200 px-2 py-1 rounded-lg">
                Deaktiveret
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Tjekkes automatisk hver dag kl. 08:00.
          </p>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={loading}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Gemmer..." : "Gem indstillinger"}
          </button>
          {saved && (
            <span className="text-green-600 text-sm flex items-center gap-1">
              ✓ Gemt
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
