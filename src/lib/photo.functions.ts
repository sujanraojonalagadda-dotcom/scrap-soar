import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "waste-photos";

/** Stores a waste photo in private storage and returns its path. */
export const uploadWastePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        base64: z.string().min(32).max(14_000_000),
        contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
    if (bytes.byteLength > 10_000_000) throw new Error("That photo is larger than 10 MB.");
    const extension = data.contentType === "image/png" ? "png" : data.contentType === "image/webp" ? "webp" : "jpg";
    const path = `${context.userId}/${crypto.randomUUID()}.${extension}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: data.contentType, upsert: false });
    if (error) throw new Error(error.message);
    return { path };
  });

/** Signed link for a stored photo. Only the owner or a party on the listing may read it. */
export const getWastePhotoUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ path: z.string().min(3).max(300) }).parse(input))
  .handler(async ({ data, context }) => {
    let allowed = data.path.startsWith(`${context.userId}/`);
    if (!allowed) {
      const { data: rows } = await context.supabase
        .from("transactions")
        .select("id")
        .or(`photo_url.eq.${data.path},handover_photo_url.eq.${data.path}`)
        .limit(1);
      allowed = Boolean(rows && rows.length > 0);
    }
    if (!allowed) throw new Response("Not allowed", { status: 403 });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(data.path, 3600);
    if (error || !signed) throw new Error(error?.message ?? "Photo link unavailable.");
    return { url: signed.signedUrl };
  });
