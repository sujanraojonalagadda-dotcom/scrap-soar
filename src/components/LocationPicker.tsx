import { useState } from "react";
import { Crosshair, Loader2, MapPin } from "lucide-react";
import { MapView } from "@/components/MapView";
import {
  geolocationErrorMessage,
  getCurrentPosition,
  isValidCoordinate,
  type GeoPoint,
  type LocationDetails,
} from "@/lib/services/locationService";

export interface SavedLocationLike {
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  location_updated_at?: string | null;
  location_sharing_enabled?: boolean;
}

interface LocationPickerProps {
  /** Currently saved location, if any. */
  saved: SavedLocationLike | null;
  saving: boolean;
  onSave: (input: {
    latitude: number;
    longitude: number;
    address: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    sharingEnabled: boolean;
  }) => Promise<void>;
  /** Label for the privacy toggle, e.g. "Share my location with recyclers". */
  sharingLabel: string;
}

const DEFAULT_CENTER: GeoPoint = { latitude: 17.385, longitude: 78.4867 }; // Hyderabad fallback

export function LocationPicker({ saved, saving, onSave, sharingLabel }: LocationPickerProps) {
  const hasSaved =
    saved?.latitude != null && saved?.longitude != null && isValidCoordinate(saved.latitude, saved.longitude);
  const [point, setPoint] = useState<GeoPoint | null>(hasSaved ? { latitude: saved!.latitude!, longitude: saved!.longitude! } : null);
  const [address, setAddress] = useState(saved?.address ?? "");
  const [city, setCity] = useState(saved?.city ?? "");
  const [state, setState] = useState(saved?.state ?? "");
  const [postalCode, setPostalCode] = useState(saved?.postal_code ?? "");
  const [sharing, setSharing] = useState(saved?.location_sharing_enabled ?? false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState(false);

  async function useGps() {
    setLocating(true);
    setError(null);
    try {
      const pos = await getCurrentPosition();
      setPoint(pos);
    } catch (e) {
      const kind = (e as { kind?: Parameters<typeof geolocationErrorMessage>[0] }).kind ?? "unavailable";
      setError(geolocationErrorMessage(kind));
    } finally {
      setLocating(false);
    }
  }

  async function handleSave() {
    if (!point || !isValidCoordinate(point.latitude, point.longitude)) {
      setError("Choose a location with GPS or by tapping the map first.");
      return;
    }
    setError(null);
    await onSave({
      latitude: point.latitude,
      longitude: point.longitude,
      address: address.trim() || null,
      city: city.trim() || null,
      state: state.trim() || null,
      postalCode: postalCode.trim() || null,
      sharingEnabled: sharing,
    });
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
  }

  const mapCenter = point ?? DEFAULT_CENTER;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <MapPin className="size-4 text-brand" aria-hidden /> Current location
        </h3>
        <button
          type="button"
          onClick={useGps}
          disabled={locating}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-foreground disabled:opacity-60"
        >
          {locating ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Crosshair className="size-4" aria-hidden />}
          Use my GPS
        </button>
      </div>

      {saved?.location_updated_at && (
        <p className="mt-1 text-xs text-muted-foreground">
          Last updated {new Date(saved.location_updated_at).toLocaleString()}
        </p>
      )}

      {error && <p className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <div className="mt-3">
        <MapView
          center={mapCenter}
          zoom={point ? 14 : 5}
          height={240}
          onMapClick={(p) => setPoint(p)}
          markers={point ? [{ id: "me", latitude: point.latitude, longitude: point.longitude, kind: "collector", label: "Selected location" }] : []}
        />
        <p className="mt-1.5 text-xs text-muted-foreground">Tap the map to set the pin manually.</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <input
          aria-label="Address"
          placeholder="Address (optional)"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="col-span-2 h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none"
        />
        <input
          aria-label="City"
          placeholder="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none"
        />
        <input
          aria-label="State"
          placeholder="State"
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none"
        />
        <input
          aria-label="Postal code"
          placeholder="Postal code"
          inputMode="numeric"
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
          className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none"
        />
      </div>

      <label className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-3">
        <span className="text-sm text-foreground">{sharingLabel}</span>
        <button
          type="button"
          role="switch"
          aria-checked={sharing}
          onClick={() => setSharing((s) => !s)}
          className={`relative h-6 w-11 rounded-full transition-colors ${sharing ? "bg-brand" : "bg-muted-foreground/40"}`}
        >
          <span
            className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${sharing ? "left-[22px]" : "left-0.5"}`}
          />
        </button>
      </label>
      {!sharing && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          Sharing is OFF — your exact location stays private and is not shown to other users.
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <MapPin className="size-4" aria-hidden />}
        Update location
      </button>
      {savedMsg && <p className="mt-2 text-center text-sm text-brand-dark">Location saved.</p>}
    </div>
  );
}
