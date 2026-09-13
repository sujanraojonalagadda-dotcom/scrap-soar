import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, LogOut, Recycle, IndianRupee } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMyRecycler, updateRate, VERIFICATION_LABEL, type Recycler } from "@/lib/services/recyclerService";
import { listRecyclerPickups, type Pickup } from "@/lib/services/transactionService";
import { formatRupees } from "@/lib/services/priceService";
import { signOut } from "@/lib/services/authService";

export const Route = createFileRoute("/_authenticated/recycler/home")({
  head: () => ({
    meta: [
      { title: "Recycler Dashboard — Kabadiwala Connect" },
      { name: "description", content: "See incoming e-waste pickup requests, confirm weights and pay collectors." },
      { property: "og:title", content: "Recycler Dashboard — Kabadiwala Connect" },
      { property: "og:description", content: "Incoming pickup requests, confirmed weights and payments." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RecyclerHome,
});

function RecyclerHome() {
  const navigate = useNavigate();
  const [recycler, setRecycler] = useState<Recycler | null>(null);
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [loading, setLoading] = useState(true);
  const [rate, setRate] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const r = await getMyRecycler(data.user.id).catch(() => null);
      if (!r) {
        navigate({ to: "/recycler/register" });
        return;
      }
      setRecycler(r);
      setRate(r.rate_per_kg ? String(r.rate_per_kg) : "");
      setPickups(await listRecyclerPickups(r.id).catch(() => []));
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSaveRate() {
    if (!recycler || !rate.trim()) return;
    await updateRate(recycler.id, Number(rate));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

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

  const pending = pickups.filter((p) => p.status === "sale_accepted").length;
  const inProgress = pickups.filter((p) =>
    ["pickup_scheduled", "handed_over", "recycler_confirmed"].includes(p.status),
  ).length;
  const completed = pickups.filter((p) => p.status === "completed").length;
  const paidTotal = pickups
    .filter((p) => p.payment_status === "paid")
    .reduce((sum, p) => sum + Number(p.final_price ?? 0), 0);

  return (
    <main className="min-h-screen bg-muted pb-12">
      <header className="flex flex-wrap items-center justify-between gap-3 bg-brand-dark px-5 py-4">
        <div className="flex items-center gap-2 text-primary-foreground">
          <Recycle className="size-5" aria-hidden />
          <span className="font-bold tracking-tight">KABADIWALA CONNECT — RECYCLER</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/recycler/available" className="rounded-lg bg-card px-3 py-2 text-sm font-medium text-foreground">
            Available waste
          </Link>
          <Link to="/recycler/requests" className="rounded-lg bg-card px-3 py-2 text-sm font-medium text-foreground">
            Requests
          </Link>
          <Link to="/recycler/nearby" className="rounded-lg bg-card px-3 py-2 text-sm font-medium text-foreground">
            🗺️ Map
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-1.5 rounded-lg border border-primary-foreground/40 px-3 py-2 text-sm text-primary-foreground"
          >
            <LogOut className="size-4" aria-hidden /> Log out
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 pt-6">
        <h1 className="text-xl font-bold text-foreground">{recycler?.name}</h1>
        <p className="text-sm text-muted-foreground">
          {recycler?.location || "No city set"} ·{" "}
          {recycler?.verified ? "Verified" : "Verification pending"}
        </p>

        {recycler && !recycler.verified && (
          <p className="mt-4 rounded-xl border border-warning bg-warning-light p-4 text-sm text-warning-dark">
            {VERIFICATION_LABEL[recycler.verification_status]}. You can browse and offer on collector listings once an
            administrator approves your organisation.
            {recycler.verification_note ? ` Admin note: ${recycler.verification_note}` : ""}
          </p>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <Stat label="Purchase accepted" value={pending} />
          <Stat label="In progress" value={inProgress} />
          <Stat label="Completed" value={completed} />
          <Stat label="Paid out" value={formatRupees(paidTotal)} />
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Your rate per kg</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Collectors' indicative values are calculated from this rate.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-11 w-40 items-center gap-1 rounded-lg border border-border bg-background px-3">
              <IndianRupee className="size-4 text-muted-foreground" aria-hidden />
              <input
                aria-label="Rate per kg"
                inputMode="decimal"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="w-full bg-transparent text-base outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleSaveRate}
              className="h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              Save rate
            </button>
            {saved && <span className="text-sm text-brand-dark">Saved</span>}
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Latest collections</h2>
            <div className="flex gap-3">
              <Link to="/recycler/available" className="text-sm text-info underline">
                Available waste
              </Link>
              <Link to="/recycler/requests" className="text-sm text-info underline">
                View all
              </Link>
            </div>
          </div>
          {pickups.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No collections assigned yet. Buy available waste to get started.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {pickups.slice(0, 5).map((p) => (
                <li key={p.id} className="flex items-center justify-between py-3 text-sm">
                  <span className="font-medium capitalize text-foreground">{p.category}</span>
                  <span className="text-muted-foreground">{Number(p.weight_kg)} kg</span>
                  <span className="text-muted-foreground">{formatRupees(p.final_price ?? p.indicative_price)}</span>
                  <Link
                    to="/recycler/request/$id"
                    params={{ id: p.id }}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground"
                  >
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
