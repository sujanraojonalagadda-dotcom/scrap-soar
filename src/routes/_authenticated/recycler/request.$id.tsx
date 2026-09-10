import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, CheckCircle2, IndianRupee } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMyRecycler } from "@/lib/services/recyclerService";
import {
  confirmWeightAndPrice,
  getPickup,
  markPaid,
  setStatus,
  type Pickup,
} from "@/lib/services/transactionService";
import { conditionLabel, formatRupees } from "@/lib/services/priceService";

export const Route = createFileRoute("/_authenticated/recycler/request/$id")({
  head: () => ({
    meta: [
      { title: "Pickup Request — Kabadiwala Connect" },
      { name: "description", content: "Accept a pickup, confirm the weight and final price, then pay the collector." },
      { property: "og:title", content: "Pickup Request — Kabadiwala Connect" },
      { property: "og:description", content: "Accept, confirm the weight and price, then pay the collector." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RequestDetail,
});

const METHODS = ["UPI", "Cash", "Bank transfer"];

function RequestDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [pickup, setPickup] = useState<Pickup | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [finalWeight, setFinalWeight] = useState("");
  const [finalPrice, setFinalPrice] = useState("");
  const [code, setCode] = useState("");
  const [method, setMethod] = useState("UPI");
  const [reference, setReference] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const r = await getMyRecycler(data.user.id).catch(() => null);
      if (!r) {
        navigate({ to: "/recycler/register" });
        return;
      }
      await refresh();
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function refresh() {
    const p = await getPickup(id).catch(() => null);
    setPickup(p);
    if (p) {
      setFinalWeight((f) => f || String(p.final_weight_kg ?? p.weight_kg));
      setFinalPrice((f) => f || String(p.final_price ?? p.indicative_price ?? ""));
    }
  }

  async function act(fn: () => Promise<void>) {
    setError(null);
    setBusy(true);
    try {
      await fn();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    setError(null);
    setBusy(true);
    const result = await confirmWeightAndPrice(
      id,
      Number(finalWeight),
      Number(finalPrice),
      code,
      pickup?.handover_code ?? null,
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.message ?? "Could not confirm this pickup.");
      return;
    }
    await refresh();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-brand" aria-hidden />
      </div>
    );
  }

  if (!pickup) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted px-5">
        <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
          This pickup request is not available.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-muted pb-12">
      <header className="flex items-center gap-3 bg-card px-5 py-4 shadow-sm">
        <Link to="/recycler/requests" aria-label="Back" className="text-muted-foreground">
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <h1 className="text-lg font-bold text-foreground">{pickup.receipt_number}</h1>
      </header>

      <section className="mx-auto max-w-2xl space-y-4 px-5 pt-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Pickup details</h2>
          <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Item</dt>
            <dd className="capitalize text-foreground">{pickup.category}</dd>
            <dt className="text-muted-foreground">Expected weight</dt>
            <dd className="text-foreground">{Number(pickup.weight_kg)} kg</dd>
            <dt className="text-muted-foreground">Condition</dt>
            <dd className="text-foreground">{conditionLabel(pickup.condition)}</dd>
            <dt className="text-muted-foreground">Indicative value</dt>
            <dd className="text-foreground">{formatRupees(pickup.indicative_price)}</dd>
            <dt className="text-muted-foreground">Status</dt>
            <dd className="capitalize text-foreground">{pickup.status}</dd>
          </dl>
        </div>

        {pickup.status === "pending" && (
          <div className="flex gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => act(() => setStatus(id, "accepted"))}
              className="h-12 flex-1 rounded-lg bg-primary text-base font-semibold text-primary-foreground disabled:opacity-50"
            >
              ACCEPT
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => act(() => setStatus(id, "rejected"))}
              className="h-12 flex-1 rounded-lg border border-destructive text-base font-semibold text-destructive disabled:opacity-50"
            >
              REJECT
            </button>
          </div>
        )}

        {pickup.status === "accepted" && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Confirm weight and price</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Ask the collector for the 6-digit handover code shown on their phone.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <label className="text-sm">
                <span className="mb-1.5 block text-muted-foreground">Confirmed weight (kg)</span>
                <input
                  inputMode="decimal"
                  value={finalWeight}
                  onChange={(e) => setFinalWeight(e.target.value)}
                  className="h-11 w-full rounded-lg border border-border bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1.5 block text-muted-foreground">Final price (₹)</span>
                <input
                  inputMode="decimal"
                  value={finalPrice}
                  onChange={(e) => setFinalPrice(e.target.value)}
                  className="h-11 w-full rounded-lg border border-border bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1.5 block text-muted-foreground">Handover code</span>
                <input
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="h-11 w-full rounded-lg border border-border bg-background px-3 tracking-[0.3em] outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
            </div>
            <button
              type="button"
              disabled={busy || !finalWeight || !finalPrice || code.replace(/\D/g, "").length !== 6}
              onClick={handleConfirm}
              className="mt-4 h-12 w-full rounded-lg bg-primary text-base font-semibold text-primary-foreground disabled:opacity-50"
            >
              CONFIRM HANDOVER
            </button>
          </div>
        )}

        {pickup.status === "confirmed" && pickup.payment_status === "unpaid" && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Pay the collector</h2>
            <p className="mt-2 flex items-center gap-1 text-2xl font-bold text-foreground">
              <IndianRupee className="size-5" aria-hidden />
              {Number(pickup.final_price ?? 0).toLocaleString("en-IN")}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    method === m
                      ? "border-brand bg-brand-light text-brand-dark"
                      : "border-border bg-background text-muted-foreground"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <label className="mt-4 block text-sm">
              <span className="mb-1.5 block text-muted-foreground">Payment reference (optional)</span>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="UPI transaction ID / receipt no."
                className="h-11 w-full rounded-lg border border-border bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() => act(() => markPaid(id, method, reference.trim() || null))}
              className="mt-4 h-12 w-full rounded-lg bg-primary text-base font-semibold text-primary-foreground disabled:opacity-50"
            >
              MARK AS PAID
            </button>
            <p className="mt-3 rounded-lg bg-info-light px-3 py-2 text-xs text-info-dark">
              Card and online payment inside the app is not switched on yet.
            </p>
          </div>
        )}

        {pickup.payment_status === "paid" && (
          <div className="rounded-xl border border-border bg-brand-light p-5">
            <p className="flex items-center gap-2 font-semibold text-brand-dark">
              <CheckCircle2 className="size-5" aria-hidden /> Handover complete and paid
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm text-brand-dark">
              <dt>Confirmed weight</dt>
              <dd>{Number(pickup.final_weight_kg ?? 0)} kg</dd>
              <dt>Final price</dt>
              <dd>{formatRupees(pickup.final_price)}</dd>
              <dt>Paid by</dt>
              <dd>{pickup.payment_method}</dd>
              {pickup.payment_reference && (
                <>
                  <dt>Reference</dt>
                  <dd>{pickup.payment_reference}</dd>
                </>
              )}
            </dl>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-card px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
