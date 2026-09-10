import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMyRecycler } from "@/lib/services/recyclerService";
import { listRecyclerPickups, type Pickup } from "@/lib/services/transactionService";
import { conditionLabel, formatRupees } from "@/lib/services/priceService";

export const Route = createFileRoute("/_authenticated/recycler/requests")({
  head: () => ({
    meta: [
      { title: "Collection Requests — Kabadiwala Connect" },
      { name: "description", content: "Every e-waste pickup request sent to your recycling business." },
      { property: "og:title", content: "Collection Requests — Kabadiwala Connect" },
      { property: "og:description", content: "Every e-waste pickup request sent to your business." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RequestsPage,
});

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-warning-light text-warning-dark",
  accepted: "bg-info-light text-info-dark",
  confirmed: "bg-info-light text-info-dark",
  completed: "bg-brand-light text-brand-dark",
  rejected: "bg-destructive/10 text-destructive",
};

function RequestsPage() {
  const navigate = useNavigate();
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const r = await getMyRecycler(data.user.id).catch(() => null);
      if (!r) {
        navigate({ to: "/recycler/register" });
        return;
      }
      setPickups(await listRecyclerPickups(r.id).catch(() => []));
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-brand" aria-hidden />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-muted pb-12">
      <header className="flex items-center gap-3 bg-card px-5 py-4 shadow-sm">
        <Link to="/recycler/home" aria-label="Back" className="text-muted-foreground">
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <h1 className="text-lg font-bold text-foreground">Collection requests</h1>
      </header>

      <section className="mx-auto max-w-5xl px-5 pt-6">
        {pickups.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
            No collection requests yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {pickups.map((p) => (
              <li key={p.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold capitalize text-foreground">{p.category}</p>
                    <p className="text-sm text-muted-foreground">
                      {Number(p.weight_kg)} kg · {conditionLabel(p.condition)} · {p.receipt_number}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                        STATUS_STYLES[p.status] ?? "bg-muted text-muted-foreground"
                      }`}
                    >
                      {p.status}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {formatRupees(p.final_price ?? p.indicative_price)}
                    </span>
                    <Link
                      to="/recycler/request/$id"
                      params={{ id: p.id }}
                      className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
                    >
                      Open
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
