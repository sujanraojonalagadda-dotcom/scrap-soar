import { useEffect, useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { MapView, type MapMarker } from "@/components/MapView";
import { getRecyclerExactLocation, type RecyclerExactLocation } from "@/lib/services/recyclerLocationService";
import { directionsUrl, getCurrentPosition, haversineKm, formatDistance, isValidCoordinate } from "@/lib/services/locationService";

/**
 * Shown to the collector once the sale is accepted. The exact address and
 * coordinates come from the recycler's saved record through an authorised
 * database lookup; nothing is hardcoded.
 */
export function RecyclerLocationCard({ recyclerId, verified }: { recyclerId: string; verified: boolean }) {
  const [location, setLocation] = useState<RecyclerExactLocation | null>(null);
  const [mine, setMine] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getRecyclerExactLocation(recyclerId)
      .then(setLocation)
      .catch(() => setLocation(null))
      .finally(() => setLoaded(true));
  }, [recyclerId]);

  useEffect(() => {
    getCurrentPosition()
      .then(setMine)
      .catch(() => setMine(null));
  }, []);

  if (!loaded) return null;

  const hasCoords =
    !!location &&
    typeof location.latitude === "number" &&
    typeof location.longitude === "number" &&
    isValidCoordinate(location.latitude, location.longitude);
  const addressParts = [location?.address, location?.city, location?.state, location?.postal_code].filter(Boolean);
  const distance =
    hasCoords && mine
      ? formatDistance(haversineKm(mine, { latitude: location!.latitude!, longitude: location!.longitude! }))
      : null;

  const markers: MapMarker[] = [];
  if (hasCoords) {
    markers.push({
      id: "recycler",
      latitude: location!.latitude!,
      longitude: location!.longitude!,
      kind: "recycler",
      label: location!.name,
    });
  }
  if (mine) {
    markers.push({ id: "me", latitude: mine.latitude, longitude: mine.longitude, kind: "collector", label: "You" });
  }

  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <h2 className="font-semibold text-foreground">Recycler location</h2>
      <p className="mt-1 text-sm text-foreground">
        {location?.name ?? "Recycler"}
        {verified && <span className="ml-1 text-xs font-semibold text-brand-dark">✓ VERIFIED</span>}
      </p>

      {addressParts.length > 0 ? (
        <p className="mt-2 flex items-start gap-1 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden /> {addressParts.join(", ")}
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          {location ? "This recycler has not saved a registered address yet." : "Location becomes visible once the sale is accepted."}
        </p>
      )}

      {distance && <p className="mt-1 text-sm text-muted-foreground">📏 Distance: {distance}</p>}

      {hasCoords && (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowMap((v) => !v)}
              className="h-11 rounded-lg border border-border px-4 text-sm font-medium text-foreground"
            >
              {showMap ? "Hide map" : "View on map"}
            </button>
            <a
              href={directionsUrl({ latitude: location!.latitude!, longitude: location!.longitude! }, location!.name)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              <Navigation className="size-4" aria-hidden /> Get directions
            </a>
          </div>
          {showMap && (
            <div className="mt-3">
              <MapView
                center={{ latitude: location!.latitude!, longitude: location!.longitude! }}
                markers={markers}
                height={280}
              />
            </div>
          )}
        </>
      )}
    </article>
  );
}
