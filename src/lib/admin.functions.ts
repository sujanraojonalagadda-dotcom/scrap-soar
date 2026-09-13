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
    const [profilesResult, recyclersResult, transactionsResult] = await Promise.all([
      supabaseAdmin.from("profiles").select("id,user_id,name,phone,role,language,location,verified,created_at").order("created_at", { ascending: false }),
      supabaseAdmin.from("recyclers").select("id,user_id,name,location,materials,rate_per_kg,verified,verification_date,created_at").order("created_at", { ascending: false }),
      supabaseAdmin.from("transactions").select("id,collector_id,recycler_id,category,weight_kg,condition,indicative_price,final_weight_kg,final_price,status,otp_verified,payment_status,payment_method,receipt_number,created_at").order("created_at", { ascending: false }),
    ]);
    const failure = profilesResult.error ?? recyclersResult.error ?? transactionsResult.error;
    if (failure) throw new Error(failure.message);
    return {
      profiles: profilesResult.data ?? [],
      recyclers: recyclersResult.data ?? [],
      transactions: transactionsResult.data ?? [],
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

export const setRecyclerVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), verified: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("recyclers")
      .update({ verified: data.verified, verification_date: data.verified ? new Date().toISOString().slice(0, 10) : null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });