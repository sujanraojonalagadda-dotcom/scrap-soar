import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Navigation, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMyRecycler, type Recycler } from "@/lib/services/recyclerService";
import { MapView, type MapMarker } from "@/components/MapView";
import { LocationPicker } from "@/components/LocationPicker";
import {
  appleMapsUrl,
  directionsUrl,
  formatDistance,
  isAppleDevice,
  listSharingCollectors,
  saveRecyclerLocation,
  type NearbyCollector,
} from "@/lib/services/locationService";

export const Route = createFileRoute("/_authenticated/recycler/nearby")({
  head: () => ({
    meta: [
      { title: "Location & Nearby Collectors — Kabadiwala Connect" },
      { name: "description", content: "Set your recycler location and see collectors who share their location." },
      { property: "og:title", content: "Location & Nearby Collectors — Kabadiwala Connect" },
      { property: "og:description", content: "Set your recycler location and see collectors who share their location." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RecyclerNearbyPage,
});

function RecyclerNearbyPage() {
  const navigate = useNavigate();
  const [recycler, setRecycler] = useState<Recycler | null>(null);
  const [collectors, setCollectors] = useState<NearbyCollector[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const r = await getMyRecycler(data.user.id).catch(() => null);
      if (!r) {
        navigate({ to: "/recycler/register" });
        return;
      }
      setRecycler(r);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const origin = useMemo(() => {
    const r = recycler as unknown as Record<string, unknown> | null;
    if (r?.latitude != null && r?.longitude != null) {
      return { latitude: Number(r.latitude), longitude: Number(r.longitude) };
    }
    return null;
  }, [recycler]);

  useEffect(() => {
    if (!origin) return;
    listSharingCollectors(origin).then(setCollectors).catch(() => setCollectors([]));
  }, [origin]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-brand" aria-hidden />
      </div>
    );
  }

  const markers: MapMarker[] = [];
  if (origin) {
    markers.push({ id: "me", latitude: origin.latitude, longitude: origin.longitude, kind: "recycler", label: recycler?.name ?? "You" });
    for (const c of collectors) {
      markers.push({
        id: c.id,
        latitude: c.latitude,
        longitude: c.longitude,
        kind: "collector",
        label: `${c.name} — ${formatDistance(c.distanceKm)}`,
        onSelect: () => setSelectedId(c.id),
      });
    }
  }

  return (
    <main className="min-h-screen bg-muted pb-10">
      <header className="flex items-center gap-3 bg-card px-4 py-4 shadow-sm">
        <Link to="/recycler/home" aria-label="Back" className="rounded-lg border border-border p-2 text-foreground">
          <ArrowLeft className="size-4" aria-hidden />
        </Link>
        <h1 className="text-lg font-bold text-foreground">Location & Nearby Collectors</h1>
      </header>

      <section className="space-y-4 px-4 pt-5">
        {origin && (
          <>
            <MapView center={origin} zoom={12} height={300} markers={markers} selectedId={selectedId} />

            <h2 className="text-sm font-semibold text-foreground">Collectors sharing their location</h2>
            {collectors.length === 0 ? (
              <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                No collectors are sharing their location right now. Collectors choose whether to share — their exact
                position stays private unless they turn sharing ON.
              </p>
            ) : (
              <ul className="space-y-3">
                {collectors.map((c) => (
                  <li
                    key={c.id}
                    className={`rounded-xl border bg-card p-4 ${selectedId === c.id ? "border-brand" : "border-border"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="flex items-center gap-1.5 font-semibold text-foreground">
                          <User className="size-4 text-info" aria-hidden /> {c.name}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {[c.address, c.city, c.state].filter(Boolean).join(", ") || "Approximate area only"}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-lg bg-brand-light px-2.5 py-1 text-sm font-semibold text-brand-dark">
                        📏 {formatDistance(c.distanceKm)}
                      </span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedId(c.id)}
                        className="h-10 flex-1 rounded-lg border border-border text-sm text-foreground"
                      >
                        Show on map
                      </button>
                      <a
                        href={isAppleDevice() ? appleMapsUrl(c) : directionsUrl(c, c.name)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-semibold text-primary-foreground"
                      >
                        <Navigation className="size-4" aria-hidden /> Get Directions
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {recycler && (
          <LocationPicker
            saved={recycler}
            saving={saving}
            sharingLabel="Show my business location to collectors"
            onSave={async (input) => {
              setSaving(true);
              try {
                await saveRecyclerLocation(recycler.id, input);
                setRecycler({ ...recycler, ...(input as object) } as Recycler);
              } finally {
                setSaving(false);
              }
            }}
          />
        )}
      </section>
    </main>
  );
}
