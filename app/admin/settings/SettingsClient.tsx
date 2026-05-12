"use client";

import { useState } from "react";

interface Settings {
  id: string;
  calendarVisibility: "ALL_EMPLOYEES" | "MANAGEMENT_ONLY";
}

export default function SettingsClient({ settings }: { settings: Settings | null }) {
  const [visibility, setVisibility] = useState(
    settings?.calendarVisibility ?? "ALL_EMPLOYEES"
  );
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    setSaved(false);
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calendarVisibility: visibility }),
    });
    setSaved(true);
    setLoading(false);
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-6">Indstillinger</h1>

      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Kalendersynlighed
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="ALL_EMPLOYEES"
                checked={visibility === "ALL_EMPLOYEES"}
                onChange={() => setVisibility("ALL_EMPLOYEES")}
              />
              <span className="text-sm text-gray-700">Alle medarbejdere</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="MANAGEMENT_ONLY"
                checked={visibility === "MANAGEMENT_ONLY"}
                onChange={() => setVisibility("MANAGEMENT_ONLY")}
              />
              <span className="text-sm text-gray-700">Kun ledelse</span>
            </label>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Gemmer..." : "Gem indstillinger"}
          </button>
          {saved && <span className="text-green-600 text-sm">✓ Gemt</span>}
        </div>
      </div>
    </div>
  );
}
