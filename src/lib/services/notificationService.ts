import { supabase } from "@/integrations/supabase/client";

export interface AppNotification {
  id: string;
  user_id: string;
  transaction_id: string | null;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  data?: Record<string, unknown> | null;
  created_at: string;
}

/** Notifications are written by database triggers on the same transaction record. */
export async function listMyNotifications(userId: string, limit = 20): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as AppNotification[];
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
  if (error) throw new Error(error.message);
}

/**
 * Notifications keep their English text in the database for traceability; the
 * stored type plus data are what gets shown, translated into the chosen language.
 */
export function localizeNotification(
  notification: AppNotification & { data?: Record<string, unknown> | null },
  t: (key: string, vars?: Record<string, string | number>) => string,
): { title: string; message: string } {
  const data = (notification.data ?? {}) as Record<string, unknown>;
  const rawCategory = typeof data.category === "string" ? data.category : null;
  const vars = {
    org: typeof data.org === "string" && data.org ? data.org : t("notif.fallback.org"),
    category: rawCategory ? t(`category.${rawCategory}`) : t("notif.fallback.category"),
    code: typeof data.code === "string" ? data.code : "",
    receipt: typeof data.receipt === "string" ? data.receipt : "",
  };
  const titleKey = `notif.${notification.type}.title`;
  const messageKey = `notif.${notification.type}.message`;
  const title = t(titleKey);
  const message = t(messageKey, vars);
  return {
    title: title === titleKey ? notification.title : title,
    message: message === messageKey ? notification.message : message,
  };
}
