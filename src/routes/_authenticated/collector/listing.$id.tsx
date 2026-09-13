import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Camera, CheckCircle2, Loader2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  acceptOffer,
  cancelListing,
  getPickup,
  listOffersForListing,
  recordHandover,
  rejectOffer,
  STATUS_LABEL,
  statusTone,
  type Pickup,
  type RecyclerOffer,
} from "@/lib/services/transactionService";

import { getRecyclerById, listRecyclers, type Recycler } from "@/lib/services/recyclerService";
import { conditionLabel, formatRupees } from "@/lib/services/priceService";
import { WastePhoto } from "@/components/WastePhoto";
import { uploadWastePhoto } from "@/lib/photo.functions";
import { geolocationErrorMessage, getCurrentPosition, type GeolocationErrorKind } from "@/lib/services/locationService";

export const Route = createFileRoute("/_authenticated/collector/listing/$id")({
  head: () => ({
    meta: [
      { title: "Listing & Transaction — Kabadiwala Connect" },
      { name: "description", content: "Compare recycler offers, record the handover and see the final receipt." },
      { property: "og:title", content: "Listing & Transaction — Kabadiwala Connect" },
      { property: "og:description", content: "Offers, handover and receipt for one e-waste listing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ListingDetail,
});

function ListingDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const upload = useServerFn(uploadWastePhoto);
  const [listing, setListing] = useState<Pickup | null>(null);
  const [offers, setOffers] = useState<RecyclerOffer[]>([]);
  const [recyclers, setRecyclers] = useState<Recycler[]>([]);
  const [selected, setSelected] = useState<Recycler | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [actualWeight, setActualWeight] = useState("");

  const [handoverNotes, setHandoverNotes] = useState("");
  const [handoverPhoto, setHandoverPhoto] = useState<File | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const record = await getPickup(id).catch(() => null);
    setListing(record);
    if (record) {
      setActualWeight((current) => current || String(Number(record.final_weight_kg ?? record.weight_kg)));
      setOffers(await listOffersForListing(record.id).catch(() => []));
      setRecyclers(await listRecyclers().catch(() => []));
      setSelected(record.recycler_id ? await getRecyclerById(record.recycler_id).catch(() => null) : null);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAccept(offer: RecyclerOffer) {
    if (!listing) return;
    setBusy(true);
    setError(null);
    try {
      await acceptOffer(listing, offer);
      setConfirming(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That sale could not be confirmed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReject(offer: RecyclerOffer) {
    if (!listing) return;
    setBusy(true);
    setError(null);
    try {
      await rejectOffer(listing, offer);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That purchase request could not be rejected.");
    } finally {
      setBusy(false);
    }
  }


  async function handleCancel() {
    if (!listing) return;
    setBusy(true);
    try {
      await cancelListing(listing.id);
      navigate({ to: "/collector/history" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "This listing could not be cancelled.");
    } finally {
      setBusy(false);
    }
  }

  async function locate() {
    try {
      setCoords(await getCurrentPosition());
    } catch (err) {
      setError(geolocationErrorMessage((err as { kind?: GeolocationErrorKind }).kind ?? "unavailable"));
    }
  }

  async function handleHandover(e: React.FormEvent) {
    e.preventDefault();
    if (!listing) return;
    setBusy(true);
    setError(null);
    try {
      let photoPath: string | null = null;
      if (handoverPhoto) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
          reader.onerror = () => reject(new Error("That photo could not be read."));
          reader.readAsDataURL(handoverPhoto);
        });
        const type =
          handoverPhoto.type === "image/png" ? "image/png" : handoverPhoto.type === "image/webp" ? "image/webp" : "image/jpeg";
        photoPath = await upload({ data: { base64, contentType: type } })
          .then((r) => r.path)
          .catch(() => null);
      }
      await recordHandover(listing, {
        actualWeightKg: Number(actualWeight),
        notes: handoverNotes.trim() || null,
        photoUrl: photoPath,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The handover could not be recorded.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-brand" aria-hidden />
      </div>
    );
  }

  if (!listing) {
    return (
      <main className="min-h-screen bg-muted px-4 py-10">
        <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          This listing is not available.
        </p>
        <Link to="/collector/history" className="mt-4 inline-block text-sm text-info underline">
          Back to my listings
        </Link>
      </main>
    );
  }

  const openOffers = offers.filter((o) => o.status === "requested");
  const nameFor = (recyclerId: string) => recyclers.find((r) => r.id === recyclerId)?.name ?? "Recycler";
  const verifiedFor = (recyclerId: string) => recyclers.find((r) => r.id === recyclerId)?.verified ?? false;


  return (
    <main className="min-h-screen bg-muted pb-12">
      <header className="flex items-center gap-3 bg-card px-4 py-4 shadow-sm">
        <Link to="/collector/history" aria-label="Back" className="text-muted-foreground">
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-foreground">{listing.listing_code}</h1>
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusTone(listing.status)}`}>
            {STATUS_LABEL[listing.status]}
          </span>
        </div>
      </header>

      <section className="space-y-4 px-4 py-6">
        <article className="rounded-xl border border-border bg-card p-4">
          <WastePhoto path={listing.photo_url} alt={`${listing.category} listed for recycling`} />
          <h2 className="mt-3 font-semibold capitalize text-foreground">{listing.category}</h2>
          <p className="text-sm text-muted-foreground">
            {Number(listing.weight_kg)} kg · {conditionLabel(listing.condition)}
          </p>
          {listing.quantity_note && <p className="mt-1 text-sm text-muted-foreground">{listing.quantity_note}</p>}
          {listing.pickup_address && (
            <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-4" aria-hidden /> {listing.pickup_address}
            </p>
          )}
          {listing.notes && <p className="mt-2 text-sm text-muted-foreground">Notes: {listing.notes}</p>}
          <p className="mt-3 text-sm text-muted-foreground">
            Indicative value: <span className="font-semibold text-foreground">{formatRupees(listing.indicative_price)}</span>
          </p>
          {listing.asking_price != null && (
            <p className="text-sm text-muted-foreground">
              Your asking price: <span className="font-semibold text-foreground">₹{Number(listing.asking_price)}/kg</span>
            </p>
          )}
        </article>

        {(listing.status === "available_for_purchase" || listing.status === "purchase_requested") && (
          <article className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-semibold text-foreground">Purchase requests</h2>
            {openOffers.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Your waste is available to authorized recyclers. No purchase request yet.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {openOffers.map((offer) => (
                  <li key={offer.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">
                          {nameFor(offer.recycler_id)}
                          {verifiedFor(offer.recycler_id) && (
                            <span className="ml-1 text-xs font-semibold text-brand-dark">✓ VERIFIED</span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          ₹{Number(offer.price_per_kg)}/kg · pickup{" "}
                          {offer.pickup_date ? new Date(`${offer.pickup_date}T00:00:00`).toLocaleDateString("en-IN") : "to be agreed"}
                        </p>
                        {offer.message && <p className="mt-1 text-sm text-muted-foreground">“{offer.message}”</p>}
                        <Link
                          to="/collector/organization/$id"
                          params={{ id: offer.recycler_id }}
                          className="mt-1 inline-block text-sm text-info underline"
                        >
                          View recycler
                        </Link>
                      </div>
                      <p className="shrink-0 text-lg font-bold text-brand-dark">{formatRupees(Number(offer.total_price))}</p>
                    </div>
                    {confirming === offer.id ? (
                      <div className="mt-3 rounded-lg bg-muted p-3">
                        <p className="text-sm font-semibold text-foreground">Confirm sale</p>
                        <dl className="mt-2 space-y-1 text-sm">
                          <Row label="Buyer" value={nameFor(offer.recycler_id)} />
                          <Row label="Material" value={listing.category} />
                          <Row label="Weight" value={`${Number(listing.weight_kg)} kg`} />
                          <Row label="Price" value={`₹${Number(offer.price_per_kg)}/kg`} />
                          <Row label="Total" value={formatRupees(Number(offer.total_price))} />
                        </dl>
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleAccept(offer)}
                            disabled={busy}
                            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
                          >
                            {busy && <Loader2 className="size-4 animate-spin" aria-hidden />} Confirm sale
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirming(null)}
                            className="h-11 rounded-lg border border-border px-4 text-sm font-medium text-foreground"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirming(offer.id)}
                          disabled={busy}
                          className="h-11 flex-1 rounded-lg bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
                        >
                          Accept sale
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(offer)}
                          disabled={busy}
                          className="h-11 rounded-lg border border-destructive/40 px-4 text-sm font-medium text-destructive disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={handleCancel}
              disabled={busy}
              className="mt-4 h-11 w-full rounded-lg border border-destructive/40 text-sm font-medium text-destructive disabled:opacity-50"
            >
              Cancel this listing
            </button>
          </article>
        )}


        {selected && (
          <article className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-semibold text-foreground">Selected recycler</h2>
            <p className="mt-1 text-sm text-foreground">{selected.name}</p>
            <p className="text-sm text-muted-foreground">{selected.location ?? "Location not set"}</p>
            {listing.agreed_price_per_kg && (
              <p className="mt-2 text-sm text-muted-foreground">
                Agreed rate: ₹{Number(listing.agreed_price_per_kg)}/kg
                {listing.pickup_date && ` · pickup ${new Date(`${listing.pickup_date}T00:00:00`).toLocaleDateString("en-IN")}`}
              </p>
            )}
            <Link
              to="/collector/organization/$id"
              params={{ id: selected.id }}
              className="mt-2 inline-block text-sm text-info underline"
            >
              View organisation details
            </Link>
            {listing.handover_code && listing.status !== "completed" && (
              <p className="mt-3 rounded-lg bg-info-light px-3 py-2 text-sm text-info-dark">
                Handover code: <span className="font-bold tracking-[0.3em]">{listing.handover_code}</span>
              </p>
            )}
          </article>
        )}

        {listing.status === "recycler_selected" && (
          <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Waiting for {selected?.name ?? "the recycler"} to accept the collection request.
          </p>
        )}

        {listing.status === "pickup_scheduled" && (
          <form onSubmit={handleHandover} className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-semibold text-foreground">Record handover</h2>
            <label htmlFor="aw" className="mt-3 mb-1.5 block text-sm font-medium text-foreground">
              Actual weight handed over (kg)
            </label>
            <input
              id="aw"
              inputMode="decimal"
              value={actualWeight}
              onChange={(e) => setActualWeight(e.target.value)}
              className="h-12 w-full rounded-lg border border-border bg-background px-3 text-base outline-none focus:ring-2 focus:ring-ring"
            />
            <label htmlFor="hn" className="mt-4 mb-1.5 block text-sm font-medium text-foreground">
              Notes
            </label>
            <textarea
              id="hn"
              rows={2}
              value={handoverNotes}
              onChange={(e) => setHandoverNotes(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring"
            />
            <label className="mt-3 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-border text-sm font-medium text-foreground">
              <Camera className="size-4" aria-hidden /> {handoverPhoto ? "Photo added" : "Add handover photo (optional)"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => setHandoverPhoto(e.target.files?.[0] ?? null)}
              />
            </label>
            <button
              type="button"
              onClick={locate}
              className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border text-sm font-medium text-foreground"
            >
              <MapPin className="size-4" aria-hidden /> {coords ? "Handover location added" : "Add handover location"}
            </button>
            <button
              type="submit"
              disabled={busy || !actualWeight || Number(actualWeight) <= 0}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden />} CONFIRM HANDOVER
            </button>
          </form>
        )}

        {listing.status === "handed_over" && (
          <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Handover recorded on {new Date(listing.handover_at ?? listing.created_at).toLocaleString("en-IN")}. Waiting for the
            recycler to confirm receipt, weight and price.
          </p>
        )}

        {(listing.status === "recycler_confirmed" || listing.status === "completed") && (
          <article className="rounded-xl border border-brand bg-card p-4">
            <h2 className="flex items-center gap-2 font-semibold text-brand-dark">
              <CheckCircle2 className="size-5" aria-hidden />
              {listing.status === "completed" ? "Transaction complete" : "Confirmed by recycler"}
            </h2>
            <dl className="mt-3 space-y-1 text-sm">
              <Row label="E-waste" value={listing.category} />
              <Row label="Final weight" value={`${Number(listing.final_weight_kg ?? listing.weight_kg)} kg`} />
              <Row label="Final price" value={formatRupees(listing.final_price)} />
              <Row label="Recycler" value={selected?.name ?? "—"} />
              <Row label="Receipt" value={listing.receipt_number} />
              <Row
                label="Payment"
                value={
                  listing.payment_status === "paid"
                    ? `${listing.payment_method ?? "Recorded"}${listing.payment_reference ? ` · ${listing.payment_reference}` : ""}`
                    : "Awaiting payment"
                }
              />
            </dl>
          </article>
        )}

        {listing.handover_photo_url && (
          <article className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-2 font-semibold text-foreground">Handover photo</h2>
            <WastePhoto path={listing.handover_photo_url} alt="Handover photo" />
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
