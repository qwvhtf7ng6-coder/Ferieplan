"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, CheckCircle, Shield, Users } from "lucide-react";
import { Btn } from "@/components/ui/Btn";
import { FieldInput } from "@/components/ui/FieldInput";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // orgSlug kan komme fra URL-parameter (?org=odense) sat af middleware/redirect
  const [orgSlug, setOrgSlug]     = useState(searchParams.get("org") ?? "");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [attempts, setAttempts]   = useState(0);
  const [step, setStep]           = useState<"org" | "credentials">(
    searchParams.get("org") ? "credentials" : "org"
  );

  async function handleOrgSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgSlug.trim()) return;
    setError("");
    setStep("credentials");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      orgSlug: orgSlug.trim() || undefined,
      redirect: false,
    });

    if (res?.error) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= 5) {
        setError("Kontoen er midlertidigt låst i 15 minutter pga. for mange fejlede forsøg.");
      } else if (newAttempts >= 3) {
        setError(`Forkert email eller adgangskode. ${5 - newAttempts} forsøg tilbage før kontoen låses.`);
      } else {
        setError("Forkert email eller adgangskode.");
      }
      setLoading(false);
    } else {
      router.push(`/${orgSlug.trim() || ""}`);
    }
  }

  const features = [
    { icon: <CalendarDays size={16} />, text: "Ferie- og fraværshåndtering" },
    { icon: <Users size={16} />,        text: "Teamoversigt og godkendelser" },
    { icon: <Shield size={16} />,       text: "Rollebaseret adgangskontrol" },
  ];

  return (
    <div className="min-h-screen flex md:flex-row flex-col" style={{ background: "var(--c-bg)" }}>
      {/* Left panel */}
      <div className="hidden md:flex flex-col justify-between w-[420px] shrink-0 p-10"
        style={{ background: "#0d1117" }}>
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
              <CalendarDays size={20} className="text-white" />
            </div>
            <span className="font-extrabold text-white text-[18px]">WorkPlan</span>
          </div>

          <h2 className="text-[32px] font-extrabold text-white leading-tight tracking-[-0.025em] mb-4">
            Planlæg ferier.<br />Effektivt.
          </h2>
          <p className="text-white/50 text-[14px] mb-10 leading-relaxed">
            Én platform til ferieplanlægning, fraværshåndtering og teamkoordinering for hele virksomheden.
          </p>

          <div className="space-y-4">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(79,70,229,.2)", color: "#818cf8" }}>
                  {f.icon}
                </div>
                <span className="text-white/70 text-[13px]">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/20 text-[12px]">© {new Date().getFullYear()} WorkPlan</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 md:hidden">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
              <CalendarDays size={16} className="text-white" />
            </div>
            <span className="font-extrabold text-text text-[16px]">WorkPlan</span>
          </div>

          {step === "org" ? (
            <>
              <div className="mb-8">
                <h1 className="text-[22px] font-extrabold tracking-[-0.025em] text-text">Vælg organisation</h1>
                <p className="text-[13px] text-text-muted mt-1">Indtast din organisations slug for at fortsætte</p>
              </div>
              <form onSubmit={handleOrgSubmit} className="space-y-4">
                <FieldInput
                  id="orgSlug"
                  label="Organisation"
                  type="text"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value)}
                  required
                  placeholder="fx odense"
                  autoComplete="off"
                  hint="Organisationens unikke navn (slug)"
                />
                {error && (
                  <div className="text-[13px] rounded-md px-3.5 py-2.5 border bg-danger-bg text-danger-text border-danger/20">
                    {error}
                  </div>
                )}
                <Btn type="submit" full size="lg">
                  Fortsæt
                </Btn>
                <button
                  type="button"
                  onClick={() => { setOrgSlug(""); setStep("credentials"); }}
                  className="text-[12px] text-text-muted underline w-full text-center mt-2"
                >
                  Log ind som Super Admin
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-[22px] font-extrabold tracking-[-0.025em] text-text">Log ind</h1>
                <p className="text-[13px] text-text-muted mt-1">
                  {orgSlug ? (
                    <>Organisation: <strong>{orgSlug}</strong> · <button type="button" onClick={() => setStep("org")} className="underline">Skift</button></>
                  ) : (
                    "Super Admin login"
                  )}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <FieldInput
                  id="email"
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="din@email.dk"
                  autoComplete="email"
                />
                <FieldInput
                  id="password"
                  label="Adgangskode"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                />

                {error && (
                  <div className={`text-[13px] rounded-md px-3.5 py-2.5 border ${
                    attempts >= 5
                      ? "bg-danger-bg text-danger-text border-danger/20"
                      : "bg-warning-bg text-warning-text border-warning/20"
                  }`}>
                    {error}
                  </div>
                )}

                <Btn
                  type="submit"
                  disabled={loading}
                  full
                  size="lg"
                  icon={loading ? undefined : <CheckCircle size={16} />}
                >
                  {loading ? "Logger ind..." : "Log ind"}
                </Btn>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
