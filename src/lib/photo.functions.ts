import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "waste-photos";

/**
 * Stores a waste photo in the private bucket and returns its path.
 * Runs as the signed-in user: storage policies only allow writes inside
 * that user's own folder, so no privileged key is involved.
 */
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
    const { error } = await context.supabase.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: data.contentType, upsert: false });
    if (error) throw new Error(error.message);
    return { path };
  });

/**
 * Signed link for a stored photo. The signed link is created with the user's
 * own session, so the database only issues one when the storage policies allow
 * that user to read the file (owner, a party on the listing, or an admin).
 */
export const getWastePhotoUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ path: z.string().min(3).max(300) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: signed, error } = await context.supabase.storage.from(BUCKET).createSignedUrl(data.path, 3600);
    if (error || !signed) throw new Response("Not allowed", { status: 403 });
    return { url: signed.signedUrl };
  });
