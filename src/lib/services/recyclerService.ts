import { supabase } from "@/integrations/supabase/client";

export type VerificationStatus = "pending" | "approved" | "rejected" | "changes_requested";

export interface Recycler {
  id: string;
  user_id: string;
  name: string;
  location: string | null;
  materials: string[];
  rate_per_kg: number | null;
  verified: boolean;
  verification_date: string | null;
  verification_status: VerificationStatus;
  /** Withheld unless the viewer is authorised to see private details. */
  verification_note?: string | null;
  contact_person?: string | null;
  contact_phone?: string | null;
  operating_area: string | null;
  registration_number?: string | null;
  description: string | null;
  business_hours: string | null;
  created_at: string;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  location_updated_at?: string | null;
  location_sharing_enabled?: boolean;
}

export const VERIFICATION_LABEL: Record<VerificationStatus, string> = {
  pending: "Awaiting admin approval",
  approved: "Approved",
  rejected: "Rejected",
  changes_requested: "Changes requested",
};

/**
 * Columns every signed-in user may read. Contact person, phone, registration
 * number, exact address and coordinates are withheld by the database and are
 * only released through `getRecyclerPrivateDetails` to authorised users.
 */
const SAFE_COLUMNS =
  "id,user_id,name,location,materials,rate_per_kg,verified,verification_date,verification_status,operating_area,description,business_hours,city,state,location_sharing_enabled,location_updated_at,created_at,updated_at";

export interface RecyclerPrivateDetails {
  contact_person: string | null;
  contact_phone: string | null;
  registration_number: string | null;
  verification_note: string | null;
  address: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Private organisation details. The database returns them only to the recycler
 * itself, an admin, or a collector whose sale to that recycler was accepted.
 */
export async function getRecyclerPrivateDetails(recyclerId: string): Promise<RecyclerPrivateDetails | null> {
  const { data, error } = await supabase.rpc("recycler_private_details", { _recycler_id: recyclerId });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as RecyclerPrivateDetails[];
  return rows[0] ?? null;
}

export async function getMyRecycler(userId: string): Promise<Recycler | null> {
  const { data, error } = await supabase.from("recyclers").select(SAFE_COLUMNS).eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const base = data as unknown as Recycler;
  const priv = await getRecyclerPrivateDetails(base.id).catch(() => null);
  return { ...base, ...(priv ?? {}) } as Recycler;
}

export async function getRecyclerById(id: string): Promise<Recycler | null> {
  const { data, error } = await supabase.from("recyclers").select(SAFE_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as Recycler | null) ?? null;
}

export interface OrganisationInput {
  name: string;
  location: string | null;
  materials: string[];
  ratePerKg: number | null;
  contactPerson?: string | null;
  contactPhone?: string | null;
  operatingArea?: string | null;
  registrationNumber?: string | null;
  description?: string | null;
  businessHours?: string | null;
}

export async function createRecycler(input: OrganisationInput & { userId: string }): Promise<Recycler> {
  const { data, error } = await supabase
    .from("recyclers")
    .insert({
      user_id: input.userId,
      name: input.name,
      location: input.location,
      materials: input.materials,
      rate_per_kg: input.ratePerKg,
      contact_person: input.contactPerson ?? null,
      contact_phone: input.contactPhone ?? null,
      operating_area: input.operatingArea ?? null,
      registration_number: input.registrationNumber ?? null,
      description: input.description ?? null,
      business_hours: input.businessHours ?? null,
    })
    .select(SAFE_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as Recycler;
}

/** Recycler edits their own organisation profile. Approval is decided by an admin. */
export async function updateOrganisation(recyclerId: string, input: OrganisationInput): Promise<void> {
  const { error } = await supabase
    .from("recyclers")
    .update({
      name: input.name,
      location: input.location,
      materials: input.materials,
      rate_per_kg: input.ratePerKg,
      contact_person: input.contactPerson ?? null,
      contact_phone: input.contactPhone ?? null,
      operating_area: input.operatingArea ?? null,
      registration_number: input.registrationNumber ?? null,
      description: input.description ?? null,
      business_hours: input.businessHours ?? null,
    })
    .eq("id", recyclerId);
  if (error) throw new Error(error.message);
}

export async function updateRate(recyclerId: string, ratePerKg: number): Promise<void> {
  const { error } = await supabase.from("recyclers").update({ rate_per_kg: ratePerKg }).eq("id", recyclerId);
  if (error) throw new Error(error.message);
}

/** Recyclers a collector may browse. Empty until real recyclers register. */
export async function listRecyclers(): Promise<Recycler[]> {
  const { data, error } = await supabase
    .from("recyclers")
    .select("*")
    .order("verified", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Recycler[];
}

/** Only admin-approved organisations, for collector-facing lists. */
export async function listVerifiedRecyclers(): Promise<Recycler[]> {
  const { data, error } = await supabase
    .from("recyclers")
    .select("*")
    .eq("verified", true)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Recycler[];
}
