import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Laptop, Smartphone, Monitor, Plug, Plus, LogOut, Loader2, History, Camera, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMyProfile, type CollectorProfile } from "@/lib/services/profileService";
import { signOut } from "@/lib/services/authService";
import { NotificationBell } from "@/components/NotificationBell";
import {
  listCollectorPickups,
  listOffersForListing,
  STATUS_LABEL,
  statusTone,
  type Pickup,
  type RecyclerOffer,
} from "@/lib/services/transactionService";
import { listRecyclers, type Recycler } from "@/lib/services/recyclerService";
import { formatRupees } from "@/lib/services/priceService";
import { formatDistance, getCurrentPosition, haversineKm, isValidCoordinate } from "@/lib/services/locationService";

const ACTIVE_SALE_STATUSES = ["sale_accepted", "pickup_scheduled", "handed_over", "recycler_confirmed"];

export const Route = createFileRoute("/_authenticated/collector/home")({
  head: () => ({
    meta: [
      { title: "Collector Home — Kabadiwala Connect" },
      { name: "description", content: "Choose what you are collecting and add a new e-waste pickup." },
      { property: "og:title", content: "Collector Home — Kabadiwala Connect" },
      { property: "og:description", content: "Choose what you are collecting and add a new e-waste pickup." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CollectorHome,
});

const CATEGORIES = [
  { key: "mobile", label: "Mobile", Icon: Smartphone },
  { key: "laptop", label: "Laptop", Icon: Laptop },
  { key: "monitor", label: "Monitor", Icon: Monitor },
  { key: "other", label: "Other", Icon: Plug },
];

function CollectorHome() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<CollectorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [listings, setListings] = useState<Pickup[]>([]);
  const [recyclers, setRecyclers] = useState<Recycler[]>([]);
  const [offers, setOffers] = useState<RecyclerOffer[]>([]);
  const [myPoint, setMyPoint] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const p = await getMyProfile(data.user.id).catch(() => null);
      if (!p) {
        navigate({ to: "/collector/register" });
        return;
      }
      setProfile(p);
      setUserId(data.user.id);
      const mine = await listCollectorPickups(data.user.id).catch(() => []);
      setListings(mine);
      setRecyclers(await listRecyclers().catch(() => []));
      const pendingLists = mine.filter((item) => item.status === "purchase_requested");
      const loadedOffers = await Promise.all(pendingLists.map((item) => listOffersForListing(item.id).catch(() => [])));
      setOffers(loadedOffers.flat().filter((offer) => offer.status === "requested"));
      getCurrentPosition()
        .then(setMyPoint)
        .catch(() => setMyPoint(null));
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const requested = listings.filter((item) => item.status === "purchase_requested");
  const requestNotices = offers
    .map((offer) => {
      const listing = requested.find((item) => item.id === offer.waste_listing_id);
      if (!listing) return null;
      const buyer = recyclers.find((r) => r.id === offer.recycler_id) ?? null;
      const hasCoords =
        !!buyer &&
        typeof buyer.latitude === "number" &&
        typeof buyer.longitude === "number" &&
        isValidCoordinate(buyer.latitude, buyer.longitude);
      const distance =
        hasCoords && myPoint
          ? formatDistance(haversineKm(myPoint, { latitude: buyer!.latitude!, longitude: buyer!.longitude! }))
          : null;
      return { offer, listing, buyer, distance };
    })
    .filter((entry): entry is { offer: RecyclerOffer; listing: Pickup; buyer: Recycler | null; distance: string | null } => entry !== null);
  const activeSales = listings.filter((item) => ACTIVE_SALE_STATUSES.includes(item.status));

  return (
    <main className="min-h-screen bg-muted pb-10">
      <header className="flex items-center justify-between bg-card px-4 py-4 shadow-sm">
        <h1 className="text-lg font-bold text-foreground">Hello, {profile?.name} 👋</h1>
        <div className="flex items-center gap-2">
        <NotificationBell userId={userId} />
        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground"
        >
          <LogOut className="size-4" aria-hidden /> Log out
        </button>
        </div>
      </header>

      {requestNotices.length > 0 && (
        <section className="px-4 pt-4">
          <div className="rounded-xl border border-warning bg-warning-light p-4">
            <h2 className="text-sm font-semibold text-warning-dark">🔔 New recycler request</h2>
            <ul className="mt-3 space-y-3">
              {requestNotices.map(({ offer, listing, buyer, distance }) => (
                <li key={offer.id} className="rounded-lg border border-warning/50 bg-card p-3">
                  <p className="font-medium text-foreground">
                    {buyer?.name ?? "A recycler"}
                    {buyer?.verified && <span className="ml-1 text-xs font-semibold text-brand-dark">✓ VERIFIED</span>}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {buyer?.name ?? "A recycler"} is interested in buying your {listing.category}.
                  </p>
                  <dl className="mt-2 space-y-0.5 text-sm text-muted-foreground">
                    <div className="flex justify-between gap-3">
                      <dt>Waste</dt>
                      <dd className="font-medium capitalize text-foreground">{listing.category}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>Weight</dt>
                      <dd className="font-medium text-foreground">{Number(listing.weight_kg)} kg</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>Offer</dt>
                      <dd className="font-medium text-foreground">₹{Number(offer.price_per_kg)}/kg</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>Total</dt>
                      <dd className="font-bold text-brand-dark">{formatRupees(Number(offer.total_price))}</dd>
                    </div>
                    {distance && (
                      <div className="flex justify-between gap-3">
                        <dt>Distance</dt>
                        <dd className="font-medium text-foreground">{distance}</dd>
                      </div>
                    )}
                  </dl>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      to="/collector/listing/$id"
                      params={{ id: listing.id }}
                      className="flex h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
                    >
                      View details
                    </Link>
                    <Link
                      to="/collector/organization/$id"
                      params={{ id: offer.recycler_id }}
                      className="flex h-11 items-center rounded-lg border border-border px-4 text-sm font-medium text-foreground"
                    >
                      View recycler
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {activeSales.length > 0 && (
        <section className="px-4 pt-4">
          <h2 className="text-base font-semibold text-foreground">Active sale</h2>
          <ul className="mt-3 space-y-3">
            {activeSales.map((item) => {
              const buyer = recyclers.find((r) => r.id === item.recycler_id);
              return (
                <li key={item.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">{item.listing_code}</p>
                      <p className="font-medium capitalize text-foreground">{item.category}</p>
                      <p className="text-sm text-muted-foreground">{Number(item.weight_kg)} kg</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Buyer: {buyer?.name ?? "Recycler"}
                        {buyer?.verified && <span className="ml-1 text-xs font-semibold text-brand-dark">✓ VERIFIED</span>}
                      </p>
                      {item.agreed_price_per_kg && (
                        <p className="text-sm text-muted-foreground">
                          ₹{Number(item.agreed_price_per_kg)}/kg · {formatRupees(item.indicative_price)}
                        </p>
                      )}
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusTone(item.status)}`}>
                      {STATUS_LABEL[item.status]}
                    </span>
                  </div>
                  <Link
                    to="/collector/listing/$id"
                    params={{ id: item.id }}
                    className="mt-3 inline-flex h-11 items-center rounded-lg border border-border px-4 text-sm font-medium text-foreground"
                  >
                    View recycler, map & directions
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="px-4 pt-6">
        <h2 className="text-base font-semibold text-foreground">What are you collecting?</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {CATEGORIES.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(key === selected ? null : key)}
              className={`flex h-28 flex-col items-center justify-center gap-2 rounded-xl border text-base font-medium transition-colors ${
                selected === key
                  ? "border-brand bg-brand-light text-brand-dark"
                  : "border-border bg-card text-foreground"
              }`}
            >
              <Icon className="size-7" aria-hidden />
              {label}
            </button>
          ))}
        </div>

        <Link
          to="/collector/add-ewaste"
          search={{ category: selected ?? undefined }}
          className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground"
        >
          <Plus className="size-5" aria-hidden /> ADD E-WASTE
        </Link>

        <Link
          to="/collector/identify"
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-base font-medium text-foreground"
        >
          <Camera className="size-5" aria-hidden /> Identify with a photo
        </Link>

        <Link
          to="/collector/nearby"
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-base font-medium text-foreground"
        >
          <MapPin className="size-5" aria-hidden /> 📍 Nearby recyclers & map
        </Link>

        <div className="mt-8 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Recent pickups</h3>
            <Link to="/collector/history" className="flex items-center gap-1 text-sm text-info underline">
              <History className="size-4" aria-hidden /> History
            </Link>
          </div>
          {listings.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No pickups recorded yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {listings.slice(0, 3).map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="font-medium capitalize text-foreground">{item.category}</span>
                  <span className="text-muted-foreground">{Number(item.weight_kg)} kg</span>
                  <Link to="/collector/listing/$id" params={{ id: item.id }} className="text-info underline">
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
