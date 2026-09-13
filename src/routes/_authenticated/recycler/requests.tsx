import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMyRecycler } from "@/lib/services/recyclerService";
import {
  listMyOffers,
  listRecyclerPickups,
  STATUS_LABEL,
  statusTone,
  type Pickup,
  type RecyclerOffer,
} from "@/lib/services/transactionService";
import { conditionLabel, formatRupees } from "@/lib/services/priceService";

export const Route = createFileRoute("/_authenticated/recycler/requests")({
  head: () => ({
    meta: [
      { title: "Collection Requests — Kabadiwala Connect" },
      { name: "description", content: "Collections assigned to you and the offers you have sent to collectors." },
      { property: "og:title", content: "Collection Requests — Kabadiwala Connect" },
      { property: "og:description", content: "Assigned collections and your sent offers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Requests,
});

function Requests() {
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [offers, setOffers] = useState<RecyclerOffer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const mine = await getMyRecycler(data.user.id).catch(() => null);
      if (mine) {
        setPickups(await listRecyclerPickups(mine.id).catch(() => []));
        setOffers(await listMyOffers(mine.id).catch(() => []));
      }
      setLoading(false);
    });
  }, []);

  const pendingOffers = offers.filter((o) => o.status === "requested");

  return (
    <main className="min-h-screen bg-muted pb-12">
      <header className="flex items-center gap-3 bg-card px-4 py-4 shadow-sm">
        <Link to="/recycler/home" aria-label="Back" className="text-muted-foreground">
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <h1 className="text-lg font-bold text-foreground">Collection requests</h1>
      </header>

      <section className="mx-auto max-w-4xl px-4 py-6">
        <Link
          to="/recycler/available"
          className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
        >
          Browse available e-waste
        </Link>

        {loading ? (
          <Loader2 className="mt-6 size-6 animate-spin text-brand" aria-hidden />
        ) : (
          <>
            {pendingOffers.length > 0 && (
              <p className="mt-5 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                {pendingOffers.length} of your {pendingOffers.length === 1 ? "offer is" : "offers are"} waiting for a
                collector's decision.
              </p>
            )}
            {pickups.length === 0 ? (
              <p className="mt-5 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                No collections assigned to you yet. Send offers on available e-waste to get started.
              </p>
            ) : (
              <ul className="mt-5 space-y-3">
                {pickups.map((p) => (
                  <li key={p.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold capitalize text-foreground">{p.category}</p>
                        <p className="text-sm text-muted-foreground">
                          {Number(p.final_weight_kg ?? p.weight_kg)} kg · {conditionLabel(p.condition)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">{p.listing_code}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">{formatRupees(p.final_price ?? p.indicative_price)}</p>
                        <span
                          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusTone(p.status)}`}
                        >
                          {STATUS_LABEL[p.status]}
                        </span>
                      </div>
                    </div>
                    <Link
                      to="/recycler/request/$id"
                      params={{ id: p.id }}
                      className="mt-3 flex h-11 w-full items-center justify-center gap-1 rounded-lg border border-border text-sm font-medium text-foreground"
                    >
                      View transaction <ChevronRight className="size-4" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </main>
  );
}
