import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Navigation, Recycle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMyProfile, type CollectorProfile } from "@/lib/services/profileService";
import { MapView, type MapMarker } from "@/components/MapView";
import { LocationPicker } from "@/components/LocationPicker";
import {
  directionsUrl,
  formatDistance,
  getCurrentPosition,
  geolocationErrorMessage,
  listNearbyRecyclers,
  saveProfileLocation,
  type GeoPoint,
  type NearbyRecycler,
} from "@/lib/services/locationService";

export const Route = createFileRoute("/_authenticated/collector/nearby")({
  head: () => ({
    meta: [
      { title: "Nearby Recyclers — Kabadiwala Connect" },
      { name: "description", content: "Find verified recyclers near you, see distances and get directions." },
      { property: "og:title", content: "Nearby Recyclers — Kabadiwala Connect" },
      { property: "og:description", content: "Find verified recyclers near you, see distances and get directions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NearbyRecyclersPage,
});

const MATERIAL_FILTERS = ["mobile", "laptop", "monitor", "television", "printer", "keyboard", "mouse", "cable", "battery", "other"];

function NearbyRecyclersPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<CollectorProfile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [origin, setOrigin] = useState<GeoPoint | null>(null);
  const [recyclers, setRecyclers] = useState<NearbyRecycler[]>([]);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [material, setMaterial] = useState<string>("");
  const [radiusKm, setRadiusKm] = useState<number>(25);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setUserId(data.user.id);
      const p = await getMyProfile(data.user.id).catch(() => null);
      if (!p) {
        navigate({ to: "/collector/register" });
        return;
      }
      setProfile(p);
      if (p.latitude != null && p.longitude != null) {
        setOrigin({ latitude: Number(p.latitude), longitude: Number(p.longitude) });
      }
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!origin) return;
    setLoading(true);
    listNearbyRecyclers(origin, material || undefined, radiusKm)
      .then((rows) => {
        setRecyclers(rows);
        setError(null);
      })
      .catch(() => {
        setRecyclers([]);
        setError("Could not load recyclers. Please check your internet connection and try again.");
      })
      .finally(() => setLoading(false));
  }, [origin, material, radiusKm]);

  async function detectLocation() {
    setLocating(true);
    setError(null);
    try {
      setOrigin(await getCurrentPosition());
    } catch (e) {
      setError(geolocationErrorMessage((e as { kind?: never }).kind ?? "unavailable"));
    } finally {
      setLocating(false);
    }
  }

  const markers: MapMarker[] = useMemo(() => {
    const list: MapMarker[] = recyclers.map((r) => ({
      id: r.id,
      latitude: r.latitude,
      longitude: r.longitude,
      kind: "recycler" as const,
      label: `${r.name} — ${formatDistance(r.distanceKm)}`,
      onSelect: () => setSelectedId(r.id),
    }));
    if (origin) {
      list.unshift({ id: "me", latitude: origin.latitude, longitude: origin.longitude, kind: "collector", label: "You" });
    }
    return list;
  }, [recyclers, origin]);

  if (loading && !origin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-brand" aria-hidden />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-muted pb-10">
      <header className="flex items-center gap-3 bg-card px-4 py-4 shadow-sm">
        <Link to="/collector/home" aria-label="Back" className="rounded-lg border border-border p-2 text-foreground">
          <ArrowLeft className="size-4" aria-hidden />
        </Link>
        <h1 className="text-lg font-bold text-foreground">Nearby Recyclers ♻️</h1>
      </header>

      <section className="space-y-4 px-4 pt-5">
        {!origin && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-foreground">To find recyclers near you, share your current location.</p>
            <button
              type="button"
              onClick={detectLocation}
              disabled={locating}
              className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {locating ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Allow location
            </button>
            {error && <p className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          </div>
        )}

        {origin && (
          <>
            <MapView center={origin} zoom={12} height={300} markers={markers} selectedId={selectedId} />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground">Authorized recyclers</h2>
              <div className="flex gap-2">
                <select
                  aria-label="Search distance"
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  className="h-10 rounded-lg border border-border bg-card px-2 text-sm text-foreground"
                >
                  {[5, 10, 25, 50, 100].map((km) => (
                    <option key={km} value={km}>
                      Within {km} km
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Filter by material"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  className="h-10 rounded-lg border border-border bg-card px-2 text-sm capitalize text-foreground"
                >
                  <option value="">All materials</option>
                  {MATERIAL_FILTERS.map((m) => (
                    <option key={m} value={m} className="capitalize">
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            )}

            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="size-5 animate-spin text-brand" aria-hidden />
              </div>
            ) : recyclers.length === 0 ? (
              <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                No recyclers with a saved location found within {radiusKm} km
                {material ? ` for ${material}` : ""} yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {recyclers.map((r) => (
                  <li
                    key={r.id}
                    className={`rounded-xl border bg-card p-4 ${selectedId === r.id ? "border-brand" : "border-border"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="flex items-center gap-1.5 font-semibold text-foreground">
                          <Recycle className="size-4 text-brand" aria-hidden />
                          {r.name} {r.verified && <span className="text-xs font-medium text-brand-dark">✓ Verified</span>}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {[r.address, r.city, r.state].filter(Boolean).join(", ") || "Address not provided"}
                        </p>
                        <p className="mt-1 text-xs capitalize text-muted-foreground">
                          Accepts: {r.materials.length ? r.materials.join(", ") : "not specified"}
                          {r.rate_per_kg != null ? ` · ₹${r.rate_per_kg}/kg` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-lg bg-brand-light px-2.5 py-1 text-sm font-semibold text-brand-dark">
                        📏 {formatDistance(r.distanceKm)}
                      </span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedId(r.id)}
                        className="h-10 flex-1 rounded-lg border border-border text-sm text-foreground"
                      >
                        Show on map
                      </button>
                      <a
                        href={directionsUrl(r, r.name)}
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

        {profile && userId && (
          <LocationPicker
            saved={profile}
            saving={saving}
            sharingLabel="Share my location with recyclers"
            onSave={async (input) => {
              setSaving(true);
              try {
                await saveProfileLocation(userId, input);
                setOrigin({ latitude: input.latitude, longitude: input.longitude });
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
