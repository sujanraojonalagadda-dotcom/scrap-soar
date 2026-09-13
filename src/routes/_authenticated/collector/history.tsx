import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  listCollectorPickups,
  STATUS_LABEL,
  statusTone,
  type Pickup,
  type RecyclerOffer,
} from "@/lib/services/transactionService";
import { conditionLabel, formatRupees } from "@/lib/services/priceService";
import { listQueuedPickups, type QueuedPickup } from "@/lib/services/offlineService";

export const Route = createFileRoute("/_authenticated/collector/history")({
  head: () => ({
    meta: [
      { title: "My Listings — Kabadiwala Connect" },
      { name: "description", content: "Every e-waste listing you posted, its stage, offers received and final payment." },
      { property: "og:title", content: "My Listings — Kabadiwala Connect" },
      { property: "og:description", content: "Your listings, their stage, offers and payment." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [offers, setOffers] = useState<RecyclerOffer[]>([]);
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
      const { data: offerRows } = await supabase.from("recycler_offers").select("*");
      setOffers((offerRows ?? []) as RecyclerOffer[]);
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
        <h1 className="text-lg font-bold text-foreground">My listings</h1>
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
                      <p className="text-sm text-muted-foreground">
                        {p.weightKg} kg · {conditionLabel(p.condition)}
                      </p>
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
            No listings yet. Post your first item and verified recyclers can send offers.
          </p>
        ) : (
          <ul className="space-y-3">
            {pickups.map((p) => {
              const open = offers.filter((o) => o.waste_listing_id === p.id && o.status === "requested").length;
              return (
                <li key={p.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold capitalize text-foreground">{p.category}</p>
                      <p className="text-sm text-muted-foreground">
                        {Number(p.weight_kg)} kg · {conditionLabel(p.condition)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{p.listing_code}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{formatRupees(p.final_price ?? p.indicative_price)}</p>
                      <span
                        className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusTone(p.status)}`}
                      >
                        {p.payment_status === "paid" ? "Paid" : STATUS_LABEL[p.status]}
                      </span>
                    </div>
                  </div>
                  {open > 0 && (
                    <p className="mt-3 rounded-lg bg-brand-light px-3 py-2 text-sm font-medium text-brand-dark">
                      {open} recycler {open === 1 ? "offer" : "offers"} waiting for your decision
                    </p>
                  )}
                  <Link
                    to="/collector/listing/$id"
                    params={{ id: p.id }}
                    className="mt-3 flex h-11 w-full items-center justify-center gap-1 rounded-lg border border-border text-sm font-medium text-foreground"
                  >
                    View transaction <ChevronRight className="size-4" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
