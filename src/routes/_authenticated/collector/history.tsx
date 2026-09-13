import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listCollectorPickups, type Pickup } from "@/lib/services/transactionService";
import { conditionLabel, formatRupees } from "@/lib/services/priceService";
import { listQueuedPickups, type QueuedPickup } from "@/lib/services/offlineService";

export const Route = createFileRoute("/_authenticated/collector/history")({
  head: () => ({
    meta: [
      { title: "My Pickups — Kabadiwala Connect" },
      { name: "description", content: "Every e-waste pickup you have logged, its status and what you were paid." },
      { property: "og:title", content: "My Pickups — Kabadiwala Connect" },
      { property: "og:description", content: "Your logged pickups, their status and payment." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [queued, setQueued] = useState<QueuedPickup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let userId: string | null = null;
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      userId = data.user.id;
      setQueued(listQueuedPickups(data.user.id));
      setPickups(await listCollectorPickups(data.user.id).catch(() => []));
      setLoading(false);
    };
    const refreshQueued = () => {
      if (userId) setQueued(listQueuedPickups(userId));
    };
    window.addEventListener("kc:queue-changed", refreshQueued);
    window.addEventListener("kc:queue-synced", load);
    void load();
    return () => {
      window.removeEventListener("kc:queue-changed", refreshQueued);
      window.removeEventListener("kc:queue-synced", load);
    };
  }, []);

  return (
    <main className="min-h-screen bg-muted pb-10">
      <header className="flex items-center gap-3 bg-card px-4 py-4 shadow-sm">
        <Link to="/collector/home" aria-label="Back" className="text-muted-foreground">
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <h1 className="text-lg font-bold text-foreground">My pickups</h1>
      </header>

      <section className="px-4 py-6">
        {queued.length > 0 && (
          <div className="mb-4">
            <h2 className="mb-2 text-sm font-semibold text-warning-dark">Waiting to sync</h2>
            <ul className="space-y-3">
              {queued.map((p) => (
                <li key={p.id} className="rounded-xl border border-warning bg-warning-light p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold capitalize text-foreground">{p.category}</p>
                      <p className="text-sm text-muted-foreground">{p.weightKg} kg · {conditionLabel(p.condition)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{formatRupees(p.indicativePrice)}</p>
                      <p className="text-xs font-medium text-warning-dark">Saved on this device</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        {loading ? (
          <Loader2 className="size-6 animate-spin text-brand" aria-hidden />
        ) : pickups.length === 0 && queued.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            No pickups recorded yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {pickups.map((p) => (
              <li key={p.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold capitalize text-foreground">{p.category}</p>
                    <p className="text-sm text-muted-foreground">
                      {Number(p.weight_kg)} kg · {conditionLabel(p.condition)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{p.receipt_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">
                      {formatRupees(p.final_price ?? p.indicative_price)}
                    </p>
                    <p className="text-xs capitalize text-muted-foreground">
                      {p.payment_status === "paid" ? "Paid" : p.status}
                    </p>
                  </div>
                </div>
                {(p.status === "pending" || p.status === "accepted") && p.handover_code && (
                  <p className="mt-3 rounded-lg bg-info-light px-3 py-2 text-sm text-info-dark">
                    Handover code: <span className="font-bold tracking-[0.3em]">{p.handover_code}</span>
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
