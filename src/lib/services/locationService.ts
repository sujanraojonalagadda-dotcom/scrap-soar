import { supabase } from "@/integrations/supabase/client";

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface LocationDetails extends GeoPoint {
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  location_updated_at: string | null;
  location_sharing_enabled: boolean;
}

export interface NearbyRecycler extends LocationDetails {
  id: string;
  name: string;
  materials: string[];
  rate_per_kg: number | null;
  verified: boolean;
  distanceKm: number;
}

export interface NearbyCollector extends LocationDetails {
  id: string;
  name: string;
  distanceKm: number;
}

/** Great-circle distance in kilometres (Haversine formula). */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export type GeolocationErrorKind = "denied" | "unavailable" | "timeout" | "unsupported";

export function getCurrentPosition(timeoutMs = 12000): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(Object.assign(new Error("Geolocation is not supported on this device."), { kind: "unsupported" as GeolocationErrorKind }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => {
        const kind: GeolocationErrorKind =
          err.code === err.PERMISSION_DENIED ? "denied" : err.code === err.TIMEOUT ? "timeout" : "unavailable";
        reject(Object.assign(new Error(err.message), { kind }));
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60000 },
    );
  });
}

export function geolocationErrorMessage(kind: GeolocationErrorKind): string {
  switch (kind) {
    case "denied":
      return "Location permission was denied. You can pick your location on the map instead.";
    case "timeout":
      return "Getting your location timed out. Try again or pick it on the map.";
    case "unsupported":
      return "This device does not support GPS. Pick your location on the map.";
    default:
      return "Your location is unavailable right now. Try again or pick it on the map.";
  }
}

export interface SaveLocationInput {
  latitude: number;
  longitude: number;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  sharingEnabled: boolean;
}

export async function saveProfileLocation(userId: string, input: SaveLocationInput): Promise<void> {
  if (!isValidCoordinate(input.latitude, input.longitude)) throw new Error("Invalid coordinates.");
  const { error } = await supabase
    .from("profiles")
    .update({
      latitude: input.latitude,
      longitude: input.longitude,
      address: input.address,
      city: input.city,
      state: input.state,
      postal_code: input.postalCode,
      location_updated_at: new Date().toISOString(),
      location_sharing_enabled: input.sharingEnabled,
    })
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function saveRecyclerLocation(recyclerId: string, input: SaveLocationInput): Promise<void> {
  if (!isValidCoordinate(input.latitude, input.longitude)) throw new Error("Invalid coordinates.");
  const { error } = await supabase
    .from("recyclers")
    .update({
      latitude: input.latitude,
      longitude: input.longitude,
      address: input.address,
      city: input.city,
      state: input.state,
      postal_code: input.postalCode,
      location_updated_at: new Date().toISOString(),
      location_sharing_enabled: input.sharingEnabled,
    })
    .eq("id", recyclerId);
  if (error) throw new Error(error.message);
}

/** Authorized (verified) recyclers with a location, sorted by distance from `origin`. */
export async function listNearbyRecyclers(origin: GeoPoint, material?: string): Promise<NearbyRecycler[]> {
  const { data, error } = await supabase
    .from("recyclers")
    .select("*")
    .not("latitude", "is", null)
    .not("longitude", "is", null);
  if (error) throw new Error(error.message);
  interface RecyclerRow {
    id: string;
    name: string;
    materials: string[] | null;
    rate_per_kg: number | null;
    verified: boolean;
    address: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    location_updated_at: string | null;
    location_sharing_enabled: boolean;
    latitude: number;
    longitude: number;
  }
  let rows = (data ?? []) as unknown as RecyclerRow[];
  if (material) {
    rows = rows.filter((r) => Array.isArray(r.materials) && r.materials.includes(material));
  }
  return rows
    .map((r) => ({
      id: r.id,
      name: r.name,
      materials: r.materials ?? [],
      rate_per_kg: r.rate_per_kg,
      verified: r.verified,
      address: r.address,
      city: r.city,
      state: r.state,
      postal_code: r.postal_code,
      location_updated_at: r.location_updated_at,
      location_sharing_enabled: r.location_sharing_enabled,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      distanceKm: haversineKm(origin, { latitude: Number(r.latitude), longitude: Number(r.longitude) }),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/** Collectors who turned location sharing ON, sorted by distance from `origin`. */
export async function listSharingCollectors(origin: GeoPoint): Promise<NearbyCollector[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("location_sharing_enabled", true)
    .not("latitude", "is", null)
    .not("longitude", "is", null);
  if (error) throw new Error(error.message);
  interface ProfileRow {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    location_updated_at: string | null;
    latitude: number;
    longitude: number;
  }
  return ((data ?? []) as unknown as ProfileRow[])
    .map((p) => ({
      id: p.id,
      name: p.name,
      address: p.address,
      city: p.city,
      state: p.state,
      postal_code: p.postal_code,
      location_updated_at: p.location_updated_at,
      location_sharing_enabled: true,
      latitude: Number(p.latitude),
      longitude: Number(p.longitude),
      distanceKm: haversineKm(origin, { latitude: Number(p.latitude), longitude: Number(p.longitude) }),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/** Build a navigation URL for the destination. Google Maps works on web and mobile. */
export function directionsUrl(dest: GeoPoint, label?: string): string {
  const q = label ? `${label}` : `${dest.latitude},${dest.longitude}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${dest.latitude},${dest.longitude}&destination_place_id=&travelmode=driving&query=${encodeURIComponent(q)}`;
}

/** Apple Maps fallback for Apple devices. */
export function appleMapsUrl(dest: GeoPoint): string {
  return `https://maps.apple.com/?daddr=${dest.latitude},${dest.longitude}`;
}

export function isAppleDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent);
}
