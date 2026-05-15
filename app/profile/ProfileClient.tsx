"use client";

import { useState } from "react";
import { updateProfile, updatePassword } from "@/actions/profile";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Btn } from "@/components/ui/Btn";
import { FieldInput } from "@/components/ui/FieldInput";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { ROLE_LABELS } from "@/lib/utils";
import { Save, Lock } from "lucide-react";

interface ProfileClientProps {
  initialName: string;
  initialEmail: string;
  role: string;
  departmentName?: string;
}

export function ProfileClient({ initialName, initialEmail, role, departmentName }: ProfileClientProps) {
  const [name, setName]   = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [profileMsg, setProfileMsg]     = useState<{ ok: boolean; text: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwMsg, setPwMsg]       = useState<{ ok: boolean; text: string } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  async function handleProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileLoading(true); setProfileMsg(null);
    const result = await updateProfile({ name, email });
    setProfileMsg({ ok: result.ok, text: result.ok ? "Profil opdateret" : result.error ?? "Fejl" });
    setProfileLoading(false);
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwLoading(true); setPwMsg(null);
    const result = await updatePassword({ currentPassword, newPassword, confirmPassword });
    if (result.ok) {
      setPwMsg({ ok: true, text: "Adgangskode opdateret" });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } else {
      setPwMsg({ ok: false, text: result.error ?? "Fejl" });
    }
    setPwLoading(false);
  }

  return (
    <div className="space-y-4 max-w-[640px]">
      {/* Profile card */}
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6 pb-5 border-b border-border">
          <Avatar name={name || initialName} size={72} />
          <div>
            <p className="text-[17px] font-extrabold text-text">{name}</p>
            <p className="text-[13px] text-text-muted">{email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary-muted text-primary">
                {ROLE_LABELS[role] ?? role}
              </span>
              {departmentName && (
                <span className="text-[11px] text-text-subtle">{departmentName}</span>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleProfile} className="space-y-4">
          <SectionLabel>Stamoplysninger</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldInput label="Fulde navn" value={name} onChange={(e) => setName(e.target.value)} required />
            <FieldInput label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <div>
              <label className="block text-[13px] font-semibold text-text mb-1">Rolle</label>
              <div className="px-3.5 py-2.5 rounded-md border-[1.5px] border-border bg-bg text-sm text-text-muted cursor-not-allowed">
                {ROLE_LABELS[role] ?? role}
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-text mb-1">Afdeling</label>
              <div className="px-3.5 py-2.5 rounded-md border-[1.5px] border-border bg-bg text-sm text-text-muted cursor-not-allowed">
                {departmentName ?? "—"}
              </div>
              <p className="text-[11px] text-text-subtle mt-1">Ændres af administrator under Brugere</p>
            </div>
          </div>

          {profileMsg && (
            <p className={`text-[12px] font-semibold ${profileMsg.ok ? "text-success" : "text-danger"}`}>
              {profileMsg.ok ? "✓ " : "✕ "}{profileMsg.text}
            </p>
          )}
          <div className="flex justify-end">
            <Btn type="submit" disabled={profileLoading} icon={<Save size={14} />}>
              {profileLoading ? "Gemmer..." : "Gem ændringer"}
            </Btn>
          </div>
        </form>
      </Card>

      {/* Password card */}
      <Card className="p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "rgba(217,119,6,.1)", color: "var(--c-warning)" }}>
            <Lock size={18} />
          </div>
          <div>
            <p className="text-[15px] font-bold text-text">Skift adgangskode</p>
            <p className="text-[12px] text-text-muted mt-0.5">Adgangskoden skal være mindst 8 tegn</p>
          </div>
        </div>

        <form onSubmit={handlePassword} className="space-y-4">
          <FieldInput label="Nuværende adgangskode" type="password" value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)} required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldInput label="Ny adgangskode" type="password" value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)} required minLength={8} hint="Mindst 8 tegn" />
            <FieldInput label="Bekræft ny adgangskode" type="password" value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>

          {pwMsg && (
            <p className={`text-[12px] font-semibold ${pwMsg.ok ? "text-success" : "text-danger"}`}>
              {pwMsg.ok ? "✓ " : "✕ "}{pwMsg.text}
            </p>
          )}
          <div className="flex justify-end">
            <Btn type="submit" variant="secondary" disabled={pwLoading} icon={<Lock size={14} />}>
              {pwLoading ? "Opdaterer..." : "Opdater adgangskode"}
            </Btn>
          </div>
        </form>
      </Card>
    </div>
  );
}
