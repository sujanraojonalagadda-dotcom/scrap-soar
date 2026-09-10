import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Laptop, Smartphone, Monitor, Plug, Plus, LogOut, Loader2, History, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMyProfile, type CollectorProfile } from "@/lib/services/profileService";
import { signOut } from "@/lib/services/authService";

export const Route = createFileRoute("/_authenticated/collector/home")({
  head: () => ({
    meta: [
      { title: "Collector Home — Kabadiwala Connect" },
      { name: "description", content: "Choose what you are collecting and add a new e-waste pickup." },
      { property: "og:title", content: "Collector Home — Kabadiwala Connect" },
      { property: "og:description", content: "Choose what you are collecting and add a new e-waste pickup." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CollectorHome,
});

const CATEGORIES = [
  { key: "mobile", label: "Mobile", Icon: Smartphone },
  { key: "laptop", label: "Laptop", Icon: Laptop },
  { key: "monitor", label: "Monitor", Icon: Monitor },
  { key: "other", label: "Other", Icon: Plug },
];

function CollectorHome() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<CollectorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const p = await getMyProfile(data.user.id).catch(() => null);
      if (!p) {
        navigate({ to: "/collector/register" });
        return;
      }
      setProfile(p);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/" });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-brand" aria-hidden />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-muted pb-10">
      <header className="flex items-center justify-between bg-card px-4 py-4 shadow-sm">
        <h1 className="text-lg font-bold text-foreground">Hello, {profile?.name} 👋</h1>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground"
        >
          <LogOut className="size-4" aria-hidden /> Log out
        </button>
      </header>

      <section className="px-4 pt-6">
        <h2 className="text-base font-semibold text-foreground">What are you collecting?</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {CATEGORIES.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(key === selected ? null : key)}
              className={`flex h-28 flex-col items-center justify-center gap-2 rounded-xl border text-base font-medium transition-colors ${
                selected === key
                  ? "border-brand bg-brand-light text-brand-dark"
                  : "border-border bg-card text-foreground"
              }`}
            >
              <Icon className="size-7" aria-hidden />
              {label}
            </button>
          ))}
        </div>

        <Link
          to="/collector/add-ewaste"
          search={{ category: selected ?? undefined }}
          className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground"
        >
          <Plus className="size-5" aria-hidden /> ADD E-WASTE
        </Link>

        <Link
          to="/collector/identify"
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-base font-medium text-foreground"
        >
          <Camera className="size-5" aria-hidden /> Identify with a photo
        </Link>

        <div className="mt-8 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Recent pickups</h3>
            <Link to="/collector/history" className="flex items-center gap-1 text-sm text-info underline">
              <History className="size-4" aria-hidden /> History
            </Link>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">No pickups recorded yet.</p>
        </div>
      </section>
    </main>
  );
}
