import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Loader2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMyRecycler, type Recycler } from "@/lib/services/recyclerService";
import {
  createOffer,
  listMyOffers,
  listOpenListings,
  type Pickup,
  type RecyclerOffer,
} from "@/lib/services/transactionService";
import { conditionLabel, formatRupees } from "@/lib/services/priceService";
import { WastePhoto } from "@/components/WastePhoto";

export const Route = createFileRoute("/_authenticated/recycler/available")({
  head: () => ({
    meta: [
      { title: "Available E-Waste — Kabadiwala Connect" },
      { name: "description", content: "Browse open collector listings that match your materials and send an offer." },
      { property: "og:title", content: "Available E-Waste — Kabadiwala Connect" },
      { property: "og:description", content: "Open collector listings matching your materials." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AvailableWaste,
});

function AvailableWaste() {
  const [recycler, setRecycler] = useState<Recycler | null>(null);
  const [listings, setListings] = useState<Pickup[]>([]);
  const [myOffers, setMyOffers] = useState<RecyclerOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyMyMaterials, setOnlyMyMaterials] = useState(true);
  const [openForm, setOpenForm] = useState<string | null>(null);
  const [rate, setRate] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const mine = await getMyRecycler(data.user.id).catch(() => null);
    setRecycler(mine);
    if (mine?.verified) {
      setListings(await listOpenListings().catch(() => []));
      setMyOffers(await listMyOffers(mine.id).catch(() => []));
      setRate((current) => current || (mine.rate_per_kg ? String(Number(mine.rate_per_kg)) : ""));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitOffer(listing: Pickup) {
    if (!recycler) return;
    setBusy(true);
    setError(null);
    try {
      const pricePerKg = Number(rate);
      await createOffer({
        listingId: listing.id,
        recyclerId: recycler.id,
        pricePerKg,
        totalPrice: Math.round(pricePerKg * Number(listing.weight_kg)),
        pickupDate: pickupDate || null,
        message: message.trim() || null,
      });
      setOpenForm(null);
      setMessage("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Your offer could not be sent.");
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

  const materials = (recycler?.materials ?? []).map((m) => m.toLowerCase());
  const shown = listings.filter(
    (l) => !onlyMyMaterials || materials.length === 0 || materials.includes(l.category.toLowerCase()),
  );

  return (
    <main className="min-h-screen bg-muted pb-12">
      <header className="flex items-center gap-3 bg-card px-4 py-4 shadow-sm">
        <Link to="/recycler/home" aria-label="Back" className="text-muted-foreground">
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <h1 className="text-lg font-bold text-foreground">Available e-waste</h1>
      </header>

      <section className="mx-auto max-w-4xl px-4 py-6">
        {!recycler?.verified ? (
          <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Your organisation must be approved by an administrator before you can see listings or send offers.
          </p>
        ) : (
          <>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={onlyMyMaterials}
                onChange={(e) => setOnlyMyMaterials(e.target.checked)}
                className="size-4 accent-[var(--brand)]"
              />
              Only materials I accept
            </label>

            {shown.length === 0 ? (
              <p className="mt-5 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                No open listings right now.
              </p>
            ) : (
              <ul className="mt-5 grid gap-3 md:grid-cols-2">
                {shown.map((listing) => {
                  const existing = myOffers.find((o) => o.waste_listing_id === listing.id);
                  return (
                    <li key={listing.id} className="rounded-xl border border-border bg-card p-4">
                      <WastePhoto path={listing.photo_url} alt={`${listing.category} available for collection`} />
                      <div className="mt-3 flex items-start justify-between gap-3">
                        <div>
                          <h2 className="font-semibold capitalize text-foreground">{listing.category}</h2>
                          <p className="text-sm text-muted-foreground">
                            {Number(listing.weight_kg)} kg · {conditionLabel(listing.condition)}
                          </p>
                          {listing.quantity_note && (
                            <p className="text-sm text-muted-foreground">{listing.quantity_note}</p>
                          )}
                        </div>
                        <p className="shrink-0 text-xs text-muted-foreground">{listing.listing_code}</p>
                      </div>
                      <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="size-4" aria-hidden /> {listing.pickup_address ?? "Area not shared"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Listed {new Date(listing.created_at).toLocaleDateString("en-IN")} · indicative{" "}
                        {formatRupees(listing.indicative_price)}
                      </p>
                      {listing.notes && <p className="mt-2 text-sm text-muted-foreground">Notes: {listing.notes}</p>}

                      {existing ? (
                        <p className="mt-3 rounded-lg bg-info-light px-3 py-2 text-sm text-info-dark">
                          Offer sent: ₹{Number(existing.price_per_kg)}/kg · {formatRupees(Number(existing.total_price))}
                        </p>
                      ) : openForm === listing.id ? (
                        <div className="mt-3 space-y-2">
                          <label className="block text-sm font-medium text-foreground" htmlFor={`rate-${listing.id}`}>
                            Your price per kg (₹)
                          </label>
                          <input
                            id={`rate-${listing.id}`}
                            inputMode="decimal"
                            value={rate}
                            onChange={(e) => setRate(e.target.value)}
                            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-base outline-none"
                          />
                          <label className="block text-sm font-medium text-foreground" htmlFor={`date-${listing.id}`}>
                            Pickup date
                          </label>
                          <input
                            id={`date-${listing.id}`}
                            type="date"
                            value={pickupDate}
                            onChange={(e) => setPickupDate(e.target.value)}
                            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-base outline-none"
                          />
                          <label className="block text-sm font-medium text-foreground" htmlFor={`msg-${listing.id}`}>
                            Message (optional)
                          </label>
                          <textarea
                            id={`msg-${listing.id}`}
                            rows={2}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base outline-none"
                          />
                          <p className="text-sm text-muted-foreground">
                            Total offer:{" "}
                            <span className="font-semibold text-foreground">
                              {rate && Number(rate) > 0
                                ? formatRupees(Math.round(Number(rate) * Number(listing.weight_kg)))
                                : "—"}
                            </span>
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => submitOffer(listing)}
                              disabled={busy || !rate || Number(rate) <= 0}
                              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
                            >
                              {busy && <Loader2 className="size-4 animate-spin" aria-hidden />} Send offer
                            </button>
                            <button
                              type="button"
                              onClick={() => setOpenForm(null)}
                              className="h-11 rounded-lg border border-border px-4 text-sm font-medium text-foreground"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setOpenForm(listing.id)}
                          className="mt-3 h-11 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground"
                        >
                          Make an offer
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-destructive/30 bg-card px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
