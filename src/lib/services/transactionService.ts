import { supabase } from "@/integrations/supabase/client";

/** Full lifecycle of a waste listing. The recycler is the buyer, the collector is the seller. */
export type ListingStatus =
  | "draft"
  | "available_for_purchase"
  | "purchase_requested"
  | "sale_accepted"
  | "pickup_scheduled"
  | "handed_over"
  | "recycler_confirmed"
  | "completed"
  | "rejected"
  | "cancelled";

/** Kept as an alias so existing imports continue to work. */
export type PickupStatus = ListingStatus;
export type PaymentStatus = "unpaid" | "paid";
/** A purchase request raised by a recycler on a listing. */
export type OfferStatus = "requested" | "accepted" | "rejected" | "not_selected" | "withdrawn";


export interface Pickup {
  id: string;
  listing_code: string;
  collector_id: string;
  recycler_id: string | null;
  category: string;
  weight_kg: number;
  condition: string;
  quantity_note: string | null;
  notes: string | null;
  photo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  pickup_address: string | null;
  indicative_price: number | null;
  asking_price: number | null;

  selected_offer_id: string | null;
  agreed_price_per_kg: number | null;
  pickup_date: string | null;
  final_weight_kg: number | null;
  final_price: number | null;
  status: ListingStatus;
  handover_code: string | null;
  handover_at: string | null;
  handover_notes: string | null;
  handover_photo_url: string | null;
  recycler_confirmed_at: string | null;
  completed_at: string | null;
  otp_verified: boolean;
  payment_status: PaymentStatus;
  payment_method: string | null;
  payment_reference: string | null;
  paid_at: string | null;
  receipt_number: string;
  created_at: string;
}

export interface RecyclerOffer {
  id: string;
  waste_listing_id: string;
  recycler_id: string;
  price_per_kg: number;
  total_price: number;
  pickup_date: string | null;
  message: string | null;
  status: OfferStatus;
  created_at: string;
}

export const STATUS_LABEL: Record<ListingStatus, string> = {
  draft: "Draft",
  available_for_purchase: "Available for purchase",
  purchase_requested: "Purchase requested",
  sale_accepted: "Sale accepted",
  pickup_scheduled: "Pickup scheduled",
  handed_over: "Handed over",
  recycler_confirmed: "Recycler confirmed",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export const OFFER_STATUS_LABEL: Record<OfferStatus, string> = {
  requested: "Purchase requested",
  accepted: "Accepted",
  rejected: "Rejected",
  not_selected: "Not selected",
  withdrawn: "Withdrawn",
};

export function statusTone(status: ListingStatus): string {
  if (status === "completed") return "bg-brand-light text-brand-dark";
  if (status === "rejected" || status === "cancelled") return "bg-destructive/10 text-destructive";
  if (status === "available_for_purchase" || status === "draft") return "bg-muted text-muted-foreground";
  return "bg-warning-light text-warning-dark";
}


export interface CreatePickupInput {
  id?: string;
  collectorId: string;
  recyclerId: string | null;
  category: string;
  weightKg: number;
  condition: string;
  indicativePrice: number | null;
  handoverCode?: string;
  quantityNote?: string | null;
  notes?: string | null;
  photoUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  pickupAddress?: string | null;
  askingPrice?: number | null;

}

export async function createPickup(input: CreatePickupInput): Promise<Pickup> {
  const handoverCode = input.handoverCode ?? String(Math.floor(100000 + Math.random() * 900000));
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      ...(input.id ? { id: input.id } : {}),
      collector_id: input.collectorId,
      recycler_id: input.recyclerId,
      category: input.category,
      weight_kg: input.weightKg,
      condition: input.condition,
      indicative_price: input.indicativePrice,
      handover_code: handoverCode,
      quantity_note: input.quantityNote ?? null,
      notes: input.notes ?? null,
      photo_url: input.photoUrl ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      pickup_address: input.pickupAddress ?? null,
      asking_price: input.askingPrice ?? null,
      status: input.recyclerId ? "sale_accepted" : "available_for_purchase",

    })
    .select()
    .single();
  if (error && input.id && error.code === "23505") {
    const existing = await getPickup(input.id);
    if (existing) return existing;
  }
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

/** Listings still open to every authorized recycler. */
export async function listOpenListings(): Promise<Pickup[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .is("recycler_id", null)
    .in("status", ["available_for_purchase", "purchase_requested"])
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Pickup[];
}

export async function getPickup(id: string): Promise<Pickup | null> {
  const { data, error } = await supabase.from("transactions").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Pickup | null) ?? null;
}

export async function setStatus(id: string, status: ListingStatus): Promise<void> {
  const { error } = await supabase.from("transactions").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

/* ---------------------------------- offers --------------------------------- */

export async function listOffersForListing(listingId: string): Promise<RecyclerOffer[]> {
  const { data, error } = await supabase
    .from("recycler_offers")
    .select("*")
    .eq("waste_listing_id", listingId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as RecyclerOffer[];
}

export async function listMyOffers(recyclerId: string): Promise<RecyclerOffer[]> {
  const { data, error } = await supabase
    .from("recycler_offers")
    .select("*")
    .eq("recycler_id", recyclerId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as RecyclerOffer[];
}

export interface CreateOfferInput {
  listingId: string;
  recyclerId: string;
  pricePerKg: number;
  totalPrice: number;
  pickupDate: string | null;
  message: string | null;
}

export async function createOffer(input: CreateOfferInput): Promise<RecyclerOffer> {
  const { data, error } = await supabase
    .from("recycler_offers")
    .insert({
      waste_listing_id: input.listingId,
      recycler_id: input.recyclerId,
      price_per_kg: input.pricePerKg,
      total_price: input.totalPrice,
      pickup_date: input.pickupDate,
      message: input.message,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as RecyclerOffer;
}

/** Collector accepts exactly one purchase request. Every other request becomes "not selected". */
export async function acceptOffer(listing: Pickup, offer: RecyclerOffer): Promise<void> {
  const { error } = await supabase
    .from("transactions")
    .update({
      recycler_id: offer.recycler_id,
      selected_offer_id: offer.id,
      agreed_price_per_kg: offer.price_per_kg,
      indicative_price: offer.total_price,
      pickup_date: offer.pickup_date,
      status: "sale_accepted",
    })
    .eq("id", listing.id);
  if (error) throw new Error(error.message);

  const accepted = await supabase.from("recycler_offers").update({ status: "accepted" }).eq("id", offer.id);
  if (accepted.error) throw new Error(accepted.error.message);
  const others = await supabase
    .from("recycler_offers")
    .update({ status: "not_selected" })
    .eq("waste_listing_id", listing.id)
    .neq("id", offer.id);
  if (others.error) throw new Error(others.error.message);
}

/** Collector turns down one purchase request; the listing stays open to other recyclers. */
export async function rejectOffer(listing: Pickup, offer: RecyclerOffer): Promise<void> {
  const rejected = await supabase.from("recycler_offers").update({ status: "rejected" }).eq("id", offer.id);
  if (rejected.error) throw new Error(rejected.error.message);

  const remaining = await supabase
    .from("recycler_offers")
    .select("id")
    .eq("waste_listing_id", listing.id)
    .eq("status", "requested");
  if (remaining.error) throw new Error(remaining.error.message);
  if ((remaining.data ?? []).length === 0) {
    const { error } = await supabase
      .from("transactions")
      .update({ status: "available_for_purchase" })
      .eq("id", listing.id);
    if (error) throw new Error(error.message);
  }
}

/* ------------------------------- transitions ------------------------------- */

export async function recyclerAcceptRequest(id: string, pickupDate: string | null): Promise<void> {
  const { error } = await supabase
    .from("transactions")
    .update({ status: "pickup_scheduled", ...(pickupDate ? { pickup_date: pickupDate } : {}) })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/** A recycler backing out releases the listing back to the marketplace. */
export async function recyclerDeclineRequest(listing: Pickup): Promise<void> {
  if (listing.selected_offer_id) {
    await supabase.from("recycler_offers").update({ status: "withdrawn" }).eq("id", listing.selected_offer_id);
  }
  const { error } = await supabase
    .from("transactions")
    .update({ recycler_id: null, selected_offer_id: null, status: "available_for_purchase" })
    .eq("id", listing.id);
  if (error) throw new Error(error.message);
}


export interface HandoverInput {
  actualWeightKg: number;
  notes: string | null;
  photoUrl: string | null;
  latitude: number | null;
  longitude: number | null;
}

/** Collector records the real handover: actual weight, time, place and optional photo. */
export async function recordHandover(listing: Pickup, input: HandoverInput): Promise<void> {
  const { error } = await supabase
    .from("transactions")
    .update({
      final_weight_kg: input.actualWeightKg,
      handover_at: new Date().toISOString(),
      handover_notes: input.notes,
      handover_photo_url: input.photoUrl,
      ...(input.latitude != null ? { latitude: input.latitude, longitude: input.longitude } : {}),
      status: "handed_over",
    })
    .eq("id", listing.id);
  if (error) throw new Error(error.message);
}

export async function cancelListing(id: string): Promise<void> {
  const { error } = await supabase.from("transactions").update({ status: "cancelled" }).eq("id", id);
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
      recycler_confirmed_at: new Date().toISOString(),
      status: "recycler_confirmed",
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
      completed_at: new Date().toISOString(),
      status: "completed",
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
