"use client";

import { useState } from "react";
import { updateProfile, updatePassword } from "@/actions/profile";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { ROLE_LABELS } from "@/lib/utils";

interface ProfileClientProps {
  initialName: string;
  initialEmail: string;
  role: string;
}

export function ProfileClient({ initialName, initialEmail, role }: ProfileClientProps) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  async function handleProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg(null);
    const result = await updateProfile({ name, email });
    setProfileMsg({
      ok: result.ok,
      text: result.ok ? "Profil opdateret ✓" : result.error ?? "Fejl",
    });
    setProfileLoading(false);
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwLoading(true);
    setPwMsg(null);
    const result = await updatePassword({ currentPassword, newPassword, confirmPassword });
    if (result.ok) {
      setPwMsg({ ok: true, text: "Adgangskode opdateret ✓" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      setPwMsg({ ok: false, text: result.error ?? "Fejl" });
    }
    setPwLoading(false);
  }

  return (
    <div className="space-y-6">
      {/* Profile info */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Personlige oplysninger</h2>
        <form onSubmit={handleProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Navn</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rolle</label>
            <input
              type="text"
              value={ROLE_LABELS[role] ?? role}
              disabled
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>

          {profileMsg && (
            <Alert variant={profileMsg.ok ? "success" : "error"}>
              {profileMsg.text}
            </Alert>
          )}

          <button
            type="submit"
            disabled={profileLoading}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {profileLoading && <Spinner />}
            Gem ændringer
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Skift adgangskode</h2>
        <form onSubmit={handlePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nuværende adgangskode
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ny adgangskode
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <p className="text-xs text-gray-400 mt-1">Mindst 8 tegn</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bekræft ny adgangskode
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {pwMsg && (
            <Alert variant={pwMsg.ok ? "success" : "error"}>
              {pwMsg.text}
            </Alert>
          )}

          <button
            type="submit"
            disabled={pwLoading}
            className="flex items-center gap-2 bg-gray-800 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-gray-900 disabled:opacity-50 transition-colors"
          >
            {pwLoading && <Spinner />}
            Skift adgangskode
          </button>
        </form>
      </div>
    </div>
  );
}
