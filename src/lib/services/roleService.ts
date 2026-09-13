import { supabase } from "@/integrations/supabase/client";
import { isCurrentUserAdmin } from "@/lib/services/adminService";

export type AppRole = "admin" | "recycler" | "collector";

/**
 * Resolves the authenticated user's role from the database only.
 * Never reads role from localStorage, URL params or client state.
 * Returns null when the user has not completed registration yet.
 */
export async function resolveMyRole(userId: string): Promise<AppRole | null> {
  if (await isCurrentUserAdmin(userId)) return "admin";
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return (data as { role: string }).role === "recycler" ? "recycler" : "collector";
}

export async function getSessionRole(): Promise<{ userId: string; role: AppRole | null } | null> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return { userId: data.user.id, role: await resolveMyRole(data.user.id) };
}

export const dashboardPathForRole = {
  admin: "/admin/dashboard",
  recycler: "/recycler/home",
  collector: "/collector/home",
} as const;
