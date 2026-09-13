import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Response("Administrator access required", { status: 403 });
}

export const getAdminData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [profilesResult, recyclersResult, transactionsResult, offersResult] = await Promise.all([
      supabaseAdmin.from("profiles").select("id,user_id,name,phone,role,language,location,verified,created_at").order("created_at", { ascending: false }),
      supabaseAdmin
        .from("recyclers")
        .select(
          "id,user_id,name,location,materials,rate_per_kg,verified,verification_date,verification_status,verification_note,contact_person,contact_phone,operating_area,registration_number,business_hours,description,created_at",
        )
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("transactions")
        .select(
          "id,listing_code,collector_id,recycler_id,category,weight_kg,condition,indicative_price,agreed_price_per_kg,final_weight_kg,final_price,status,otp_verified,payment_status,payment_method,receipt_number,pickup_address,pickup_date,handover_at,recycler_confirmed_at,completed_at,created_at",
        )
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("recycler_offers")
        .select("id,waste_listing_id,recycler_id,price_per_kg,total_price,pickup_date,status,created_at")
        .order("created_at", { ascending: false }),
    ]);
    const failure = profilesResult.error ?? recyclersResult.error ?? transactionsResult.error ?? offersResult.error;
    if (failure) throw new Error(failure.message);
    return {
      profiles: profilesResult.data ?? [],
      recyclers: recyclersResult.data ?? [],
      transactions: transactionsResult.data ?? [],
      offers: offersResult.data ?? [],
    };
  });

export const setCollectorVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), verified: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("profiles").update({ verified: data.verified }).eq("id", data.id).eq("role", "collector");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin decision on a recycler organisation: approve, reject or ask for changes. */
export const setRecyclerVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        decision: z.enum(["approved", "rejected", "changes_requested", "pending"]),
        note: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const approved = data.decision === "approved";
    const { error } = await supabaseAdmin
      .from("recyclers")
      .update({
        verified: approved,
        verification_status: data.decision,
        verification_note: data.note?.trim() ? data.note.trim() : null,
        verification_date: approved ? new Date().toISOString().slice(0, 10) : null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, verification_date: approved ? new Date().toISOString().slice(0, 10) : null };
  });
