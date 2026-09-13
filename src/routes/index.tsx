import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Recycle, Loader2 } from "lucide-react";
import { sendOtp, verifyOtp, normalisePhone } from "@/lib/services/authService";
import { getMyProfile } from "@/lib/services/profileService";
import { isCurrentUserAdmin } from "@/lib/services/adminService";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kabadiwala Connect — Collector Sign In" },
      {
        name: "description",
        content:
          "Sign in with your mobile number to log e-waste pickups, get an indicative value and hand over to a verified recycler.",
      },
      { property: "og:title", content: "Kabadiwala Connect — Collector Sign In" },
      {
        property: "og:description",
        content: "Log e-waste pickups, get an indicative value and hand over to a verified recycler.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

type Stage = "phone" | "code";

function LoginPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>("phone");
  const [phoneInput, setPhoneInput] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        await routeAfterLogin(data.session.user.id);
        return;
      }
      setChecking(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function routeAfterLogin(userId: string) {
    try {
      if (await isCurrentUserAdmin(userId)) {
        navigate({ to: "/admin/dashboard" });
        return;
      }
      const profile = await getMyProfile(userId);
      if (!profile) {
        navigate({ to: "/collector/register" });
        return;
      }
      navigate({ to: profile.role === "recycler" ? "/recycler/home" : "/collector/home" });
    } catch {
      navigate({ to: "/collector/register" });
    }
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    const result = await sendOtp(phoneInput);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setPhone(result.phone);
    setStage("code");
    setNotice(`Enter the 6-digit verification code for ${result.phone}.`);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = await verifyOtp(phone, code);
    if (!result.ok) {
      setBusy(false);
      setError(result.message);
      return;
    }
    await routeAfterLogin(result.user.id);
  }

  async function handleResend() {
    setError(null);
    setBusy(true);
    const result = await sendOtp(phone);
    setBusy(false);
    setNotice(result.ok ? "You can enter your verification code now." : null);
    if (!result.ok) setError(result.message);
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-brand" aria-hidden />
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-brand-light">
            <Recycle className="size-7 text-brand-dark" aria-hidden />
          </span>
          <h1 className="mt-4 text-xl font-bold tracking-tight text-brand-dark">KABADIWALA CONNECT</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in — collector, recycler or admin</p>
        </div>

        {stage === "phone" ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-foreground">
                Mobile Number
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
                <span className="text-base text-muted-foreground">+91</span>
                <input
                  id="phone"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="XXXXX XXXXX"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="h-13 w-full bg-transparent py-3 text-lg tracking-wide text-foreground outline-none"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={busy || !normalisePhone(phoneInput)}
              className="flex h-13 w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-base font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
              SEND OTP
            </button>
            <p className="text-center text-xs text-muted-foreground">
              A 6-digit verification code is required to continue.
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label htmlFor="code" className="mb-1.5 block text-sm font-medium text-foreground">
                Enter the code for {phone}
              </label>
              <input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                placeholder="______"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="h-13 w-full rounded-lg border border-border bg-background px-3 py-3 text-center text-2xl tracking-[0.4em] text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              type="submit"
              disabled={busy || code.replace(/\D/g, "").length < 4}
              className="flex h-13 w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-base font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
              VERIFY & CONTINUE
            </button>
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => {
                  setStage("phone");
                  setCode("");
                  setError(null);
                  setNotice(null);
                }}
                className="text-muted-foreground underline"
              >
                Change number
              </button>
              <button type="button" onClick={handleResend} disabled={busy} className="font-medium text-info underline">
                Resend code
              </button>
            </div>
          </form>
        )}

        {notice && !error && (
          <p className="mt-4 rounded-lg bg-info-light px-3 py-2 text-sm text-info-dark">{notice}</p>
        )}
        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-destructive/30 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
