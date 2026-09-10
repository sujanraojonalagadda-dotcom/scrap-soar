import { supabase } from "@/integrations/supabase/client";

export type PickupStatus = "pending" | "accepted" | "rejected" | "confirmed" | "completed";
export type PaymentStatus = "unpaid" | "paid";

export interface Pickup {
  id: string;
  collector_id: string;
  recycler_id: string | null;
  category: string;
  weight_kg: number;
  condition: string;
  indicative_price: number | null;
  final_weight_kg: number | null;
  final_price: number | null;
  status: PickupStatus;
  handover_code: string | null;
  otp_verified: boolean;
  payment_status: PaymentStatus;
  payment_method: string | null;
  payment_reference: string | null;
  paid_at: string | null;
  receipt_number: string;
  created_at: string;
}

export async function createPickup(input: {
  collectorId: string;
  recyclerId: string | null;
  category: string;
  weightKg: number;
  condition: string;
  indicativePrice: number | null;
}): Promise<Pickup> {
  const handoverCode = String(Math.floor(100000 + Math.random() * 900000));
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      collector_id: input.collectorId,
      recycler_id: input.recyclerId,
      category: input.category,
      weight_kg: input.weightKg,
      condition: input.condition,
      indicative_price: input.indicativePrice,
      handover_code: handoverCode,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Pickup;
}

export async function listCollectorPickups(collectorId: string): Promise<Pickup[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("collector_id", collectorId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Pickup[];
}

export async function listRecyclerPickups(recyclerId: string): Promise<Pickup[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("recycler_id", recyclerId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Pickup[];
}

export async function getPickup(id: string): Promise<Pickup | null> {
  const { data, error } = await supabase.from("transactions").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Pickup | null) ?? null;
}

export async function setStatus(id: string, status: PickupStatus): Promise<void> {
  const { error } = await supabase.from("transactions").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function confirmWeightAndPrice(
  id: string,
  finalWeightKg: number,
  finalPrice: number,
  code: string,
  expectedCode: string | null,
): Promise<{ ok: boolean; message?: string }> {
  if (!expectedCode || code.replace(/\D/g, "") !== expectedCode) {
    return { ok: false, message: "That handover code does not match the collector's code." };
  }
  const { error } = await supabase
    .from("transactions")
    .update({
      final_weight_kg: finalWeightKg,
      final_price: finalPrice,
      otp_verified: true,
      status: "confirmed",
    })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function markPaid(id: string, method: string, reference: string | null): Promise<void> {
  const { error } = await supabase
    .from("transactions")
    .update({
      payment_status: "paid",
      payment_method: method,
      payment_reference: reference,
      paid_at: new Date().toISOString(),
      status: "completed",
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
