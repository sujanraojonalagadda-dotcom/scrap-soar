import { supabase } from "@/integrations/supabase/client";

export interface Recycler {
  id: string;
  user_id: string;
  name: string;
  location: string | null;
  materials: string[];
  rate_per_kg: number | null;
  verified: boolean;
  verification_date: string | null;
  created_at: string;
}

export async function getMyRecycler(userId: string): Promise<Recycler | null> {
  const { data, error } = await supabase
    .from("recyclers")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Recycler | null) ?? null;
}

export async function createRecycler(input: {
  userId: string;
  name: string;
  location: string | null;
  materials: string[];
  ratePerKg: number | null;
}): Promise<Recycler> {
  const { data, error } = await supabase
    .from("recyclers")
    .insert({
      user_id: input.userId,
      name: input.name,
      location: input.location,
      materials: input.materials,
      rate_per_kg: input.ratePerKg,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Recycler;
}

export async function updateRate(recyclerId: string, ratePerKg: number): Promise<void> {
  const { error } = await supabase.from("recyclers").update({ rate_per_kg: ratePerKg }).eq("id", recyclerId);
  if (error) throw new Error(error.message);
}

/** Recyclers a collector may choose. Empty until real recyclers register. */
export async function listRecyclers(): Promise<Recycler[]> {
  const { data, error } = await supabase
    .from("recyclers")
    .select("*")
    .order("verified", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Recycler[];
}
