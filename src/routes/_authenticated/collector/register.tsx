import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Recycle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createProfile, getMyProfile } from "@/lib/services/profileService";

export const Route = createFileRoute("/_authenticated/collector/register")({
  head: () => ({
    meta: [
      { title: "Complete your collector profile — Kabadiwala Connect" },
      { name: "description", content: "Add your name, preferred language and area to start logging e-waste pickups." },
      { property: "og:title", content: "Complete your collector profile — Kabadiwala Connect" },
      { property: "og:description", content: "Add your name, preferred language and area to start logging pickups." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("en");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const existing = await getMyProfile(data.user.id).catch(() => null);
      if (existing) navigate({ to: "/collector/home" });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setBusy(false);
      setError("Your session ended. Please sign in again.");
      return;
    }
    try {
      await createProfile({
        userId: data.user.id,
        name: name.trim(),
        phone: data.user.phone ? `+${data.user.phone.replace(/^\+/, "")}` : null,
        language,
        location: location.trim() || null,
      });
      navigate({ to: "/collector/home" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your profile.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-brand-light">
            <Recycle className="size-6 text-brand-dark" aria-hidden />
          </span>
          <h1 className="mt-3 text-lg font-bold text-brand-dark">Complete your profile</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-foreground">
              Your name
            </label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 w-full rounded-lg border border-border bg-background px-3 text-base outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="language" className="mb-1.5 block text-sm font-medium text-foreground">
              Preferred language
            </label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="h-12 w-full rounded-lg border border-border bg-background px-3 text-base outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी (Hindi)</option>
            </select>
          </div>
          <div>
            <label htmlFor="location" className="mb-1.5 block text-sm font-medium text-foreground">
              Area / city
            </label>
            <input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="h-12 w-full rounded-lg border border-border bg-background px-3 text-base outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            type="submit"
            disabled={busy || name.trim().length < 2}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-base font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
            SAVE & CONTINUE
          </button>
          {error && (
            <p role="alert" className="rounded-lg border border-destructive/30 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
