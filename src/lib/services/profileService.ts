import { supabase } from "@/integrations/supabase/client";

export interface CollectorProfile {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  role: string;
  language: string;
  location: string | null;
  verified: boolean;
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

export async function getMyProfile(userId: string): Promise<CollectorProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as CollectorProfile | null) ?? null;
}

export interface NewProfileInput {
  userId: string;
  name: string;
  phone: string | null;
  language: string;
  location: string | null;
  role?: "collector" | "recycler";
}

export async function createProfile(input: NewProfileInput): Promise<CollectorProfile> {
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      user_id: input.userId,
      name: input.name,
      phone: input.phone,
      language: input.language,
      location: input.location,
      role: input.role ?? "collector",
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as CollectorProfile;
}
