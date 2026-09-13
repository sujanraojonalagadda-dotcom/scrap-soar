import { supabase } from "@/integrations/supabase/client";

export interface RecyclerExactLocation {
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Exact registered address and coordinates of a recycler organisation.
 * The database only returns a row to the recycler itself, an admin, or a
 * collector whose sale to that recycler has been accepted. Returns null
 * otherwise, so callers fall back to organisation information only.
 */
export async function getRecyclerExactLocation(recyclerId: string): Promise<RecyclerExactLocation | null> {
  const { data, error } = await supabase.rpc("recycler_exact_location", { _recycler_id: recyclerId });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as RecyclerExactLocation[];
  return rows[0] ?? null;
}

/** Opens the device's preferred maps app with the recycler as destination. */
export function directionsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
}
