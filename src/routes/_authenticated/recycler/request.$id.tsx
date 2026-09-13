import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMyRecycler, type Recycler } from "@/lib/services/recyclerService";
import {
  confirmWeightAndPrice,
  getPickup,
  markPaid,
  recyclerAcceptRequest,
  recyclerDeclineRequest,
  STATUS_LABEL,
  statusTone,
  type Pickup,
} from "@/lib/services/transactionService";
import { conditionLabel, formatRupees } from "@/lib/services/priceService";
import { WastePhoto } from "@/components/WastePhoto";

export const Route = createFileRoute("/_authenticated/recycler/request/$id")({
  head: () => ({
    meta: [
      { title: "Collection Transaction — Kabadiwala Connect" },
      { name: "description", content: "Accept the collection, confirm the received weight and record the payment." },
      { property: "og:title", content: "Collection Transaction — Kabadiwala Connect" },
      { property: "og:description", content: "Accept, confirm receipt and record payment for one collection." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RequestDetail,
});

const METHODS = [
  { value: "upi", label: "UPI" },
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
];

function RequestDetail() {
  const { id } = Route.useParams();
  const [listing, setListing] = useState<Pickup | null>(null);
  const [recycler, setRecycler] = useState<Recycler | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickupDate, setPickupDate] = useState("");
  const [finalWeight, setFinalWeight] = useState("");
  const [finalPrice, setFinalPrice] = useState("");
  const [code, setCode] = useState("");
  const [method, setMethod] = useState("upi");
  const [reference, setReference] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    setRecycler(await getMyRecycler(data.user.id).catch(() => null));
    const record = await getPickup(id).catch(() => null);
    setListing(record);
    if (record) {
      const weight = Number(record.final_weight_kg ?? record.weight_kg);
      setFinalWeight((current) => current || String(weight));
      const rate = Number(record.agreed_price_per_kg ?? 0);
      setFinalPrice((current) => current || (rate ? String(Math.round(rate * weight)) : ""));
      setPickupDate((current) => current || record.pickup_date || "");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: () => Promise<void>, fallback: string) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback);
    } finally {
      setBusy(false);
    }
  }

  async function confirmReceipt(e: React.FormEvent) {
    e.preventDefault();
    if (!listing) return;
    setBusy(true);
    setError(null);
    const result = await confirmWeightAndPrice(
      listing.id,
      Number(finalWeight),
      Number(finalPrice),
      code,
      listing.handover_code,
    );
    if (!result.ok) setError(result.message ?? "Receipt could not be confirmed.");
    else await load();
    setBusy(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-brand" aria-hidden />
      </div>
    );
  }

  if (!listing || !recycler || listing.recycler_id !== recycler.id) {
    return (
      <main className="min-h-screen bg-muted px-4 py-10">
        <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          This collection is not available to you.
        </p>
        <Link to="/recycler/requests" className="mt-4 inline-block text-sm text-info underline">
          Back to requests
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-muted pb-12">
      <header className="flex items-center gap-3 bg-card px-4 py-4 shadow-sm">
        <Link to="/recycler/requests" aria-label="Back" className="text-muted-foreground">
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-foreground">{listing.listing_code}</h1>
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusTone(listing.status)}`}>
            {STATUS_LABEL[listing.status]}
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        <article className="rounded-xl border border-border bg-card p-4">
          <WastePhoto path={listing.photo_url} alt={`${listing.category} for collection`} />
          <h2 className="mt-3 font-semibold capitalize text-foreground">{listing.category}</h2>
          <p className="text-sm text-muted-foreground">
            {Number(listing.weight_kg)} kg listed · {conditionLabel(listing.condition)}
          </p>
          {listing.quantity_note && <p className="text-sm text-muted-foreground">{listing.quantity_note}</p>}
          <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-4" aria-hidden /> {listing.pickup_address ?? "Area not shared"}
          </p>
          {listing.agreed_price_per_kg && (
            <p className="mt-2 text-sm text-muted-foreground">
              Agreed rate: ₹{Number(listing.agreed_price_per_kg)}/kg · agreed total{" "}
              {formatRupees(listing.indicative_price)}
            </p>
          )}
          {listing.notes && <p className="mt-2 text-sm text-muted-foreground">Notes: {listing.notes}</p>}
        </article>

        {listing.status === "sale_accepted" && (
          <article className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-semibold text-foreground">Purchase accepted — schedule pickup</h2>
            <label htmlFor="pd" className="mt-3 mb-1.5 block text-sm font-medium text-foreground">
              Pickup date
            </label>
            <input
              id="pd"
              type="date"
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-base outline-none"
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => run(() => recyclerAcceptRequest(listing.id, pickupDate || null), "Could not accept this collection.")}
                disabled={busy}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {busy && <Loader2 className="size-4 animate-spin" aria-hidden />} Schedule pickup
              </button>
              <button
                type="button"
                onClick={() => run(() => recyclerDeclineRequest(listing), "Could not decline this collection.")}
                disabled={busy}
                className="h-11 rounded-lg border border-destructive/40 px-4 text-sm font-medium text-destructive disabled:opacity-50"
              >
                Decline
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Backing out returns this listing to other authorized recyclers.
            </p>
          </article>
        )}

        {listing.status === "pickup_scheduled" && (
          <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Pickup scheduled
            {listing.pickup_date ? ` for ${new Date(`${listing.pickup_date}T00:00:00`).toLocaleDateString("en-IN")}` : ""}.
            The collector records the handover with the actual weight.
          </p>
        )}

        {listing.status === "handed_over" && (
          <form onSubmit={confirmReceipt} className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-semibold text-foreground">Confirm what you received</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Collector recorded {Number(listing.final_weight_kg ?? listing.weight_kg)} kg on{" "}
              {new Date(listing.handover_at ?? listing.created_at).toLocaleString("en-IN")}.
              {listing.handover_notes ? ` Notes: ${listing.handover_notes}` : ""}
            </p>
            {listing.handover_photo_url && (
              <div className="mt-3">
                <WastePhoto path={listing.handover_photo_url} alt="Handover photo" />
              </div>
            )}
            <label htmlFor="fw" className="mt-3 mb-1.5 block text-sm font-medium text-foreground">
              Final weight (kg)
            </label>
            <input
              id="fw"
              inputMode="decimal"
              value={finalWeight}
              onChange={(e) => setFinalWeight(e.target.value)}
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-base outline-none"
            />
            <label htmlFor="fp" className="mt-4 mb-1.5 block text-sm font-medium text-foreground">
              Final price (₹)
            </label>
            <input
              id="fp"
              inputMode="decimal"
              value={finalPrice}
              onChange={(e) => setFinalPrice(e.target.value)}
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-base outline-none"
            />
            <label htmlFor="oc" className="mt-4 mb-1.5 block text-sm font-medium text-foreground">
              Collector's handover code
            </label>
            <input
              id="oc"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="6 digits"
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-base tracking-[0.3em] outline-none"
            />
            <button
              type="submit"
              disabled={busy || !finalWeight || !finalPrice || code.replace(/\D/g, "").length !== 6}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden />} CONFIRM RECEIPT
            </button>
          </form>
        )}

        {listing.status === "recycler_confirmed" && listing.payment_status === "unpaid" && (
          <article className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-semibold text-foreground">Pay the collector</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Amount due: <span className="font-semibold text-foreground">{formatRupees(listing.final_price)}</span>
            </p>
            <span className="mt-3 mb-1.5 block text-sm font-medium text-foreground">Method</span>
            <div className="space-y-2">
              {METHODS.map((m) => (
                <label key={m.value} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm">
                  <input
                    type="radio"
                    name="method"
                    checked={method === m.value}
                    onChange={() => setMethod(m.value)}
                    className="size-4 accent-[var(--brand)]"
                  />
                  {m.label}
                </label>
              ))}
            </div>
            <label htmlFor="ref" className="mt-4 mb-1.5 block text-sm font-medium text-foreground">
              Reference (UPI ID, transfer number or note)
            </label>
            <input
              id="ref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-base outline-none"
            />
            <button
              type="button"
              onClick={() => run(() => markPaid(listing.id, method, reference.trim() || null), "Payment could not be recorded.")}
              disabled={busy}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden />} RECORD PAYMENT & COMPLETE
            </button>
          </article>
        )}

        {listing.status === "completed" && (
          <article className="rounded-xl border border-brand bg-card p-4">
            <h2 className="flex items-center gap-2 font-semibold text-brand-dark">
              <CheckCircle2 className="size-5" aria-hidden /> Transaction complete
            </h2>
            <dl className="mt-3 space-y-1 text-sm">
              <Row label="Final weight" value={`${Number(listing.final_weight_kg ?? listing.weight_kg)} kg`} />
              <Row label="Final price" value={formatRupees(listing.final_price)} />
              <Row label="Receipt" value={listing.receipt_number} />
              <Row label="Payment" value={`${listing.payment_method ?? "Recorded"}${listing.payment_reference ? ` · ${listing.payment_reference}` : ""}`} />
            </dl>
          </article>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium capitalize text-foreground">{value}</dd>
    </div>
  );
}
