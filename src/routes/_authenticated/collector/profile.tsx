import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMyProfile, type CollectorProfile } from "@/lib/services/profileService";
import { signOut } from "@/lib/services/authService";

export const Route = createFileRoute("/_authenticated/collector/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — Kabadiwala Connect" },
      { name: "description", content: "Your collector details: name, mobile number, language and area." },
      { property: "og:title", content: "My Profile — Kabadiwala Connect" },
      { property: "og:description", content: "Your collector details: name, mobile number, language and area." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<CollectorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setProfile(await getMyProfile(data.user.id).catch(() => null));
      setLoading(false);
    });
  }, []);

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/" });
  }

  return (
    <main className="min-h-screen bg-muted">
      <header className="flex items-center gap-3 bg-card px-4 py-4 shadow-sm">
        <Link to="/collector/home" aria-label="Back" className="text-muted-foreground">
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <h1 className="text-lg font-bold text-foreground">My profile</h1>
      </header>
      <section className="space-y-4 px-4 py-6">
        {loading ? (
          <Loader2 className="size-5 animate-spin text-brand" aria-hidden />
        ) : profile ? (
          <dl className="rounded-xl border border-border bg-card p-4 text-sm">
            <div className="flex justify-between py-2">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium text-foreground">{profile.name}</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-muted-foreground">Mobile</dt>
              <dd className="font-medium text-foreground">{profile.phone ?? "—"}</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-muted-foreground">Language</dt>
              <dd className="font-medium text-foreground">{profile.language === "hi" ? "हिन्दी" : "English"}</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-muted-foreground">Area</dt>
              <dd className="font-medium text-foreground">{profile.location ?? "—"}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">No profile saved yet.</p>
        )}
        <button
          type="button"
          onClick={handleSignOut}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card text-sm font-medium text-foreground"
        >
          <LogOut className="size-4" aria-hidden /> Log out
        </button>
      </section>
    </main>
  );
}
