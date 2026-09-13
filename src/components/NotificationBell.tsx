import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import {
  listMyNotifications,
  markAllNotificationsRead,
  type AppNotification,
} from "@/lib/services/notificationService";

/** Stored notifications, so they are still there after signing back in. */
export function NotificationBell({ userId }: { userId: string | null }) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    listMyNotifications(userId)
      .then(setItems)
      .catch(() => setItems([]));
  }, [userId]);

  const unread = items.filter((n) => !n.is_read).length;

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && userId && unread > 0) {
      await markAllNotificationsRead(userId).catch(() => undefined);
      setItems((current) => current.map((n) => ({ ...n, is_read: true })));
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={unread > 0 ? `${unread} unread notifications` : "Notifications"}
        aria-expanded={open}
        className="relative flex size-10 items-center justify-center rounded-lg border border-border text-muted-foreground"
      >
        <Bell className="size-5" aria-hidden />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs font-bold text-destructive-foreground">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-border bg-card p-3 shadow-lg">
          <p className="text-sm font-semibold text-foreground">Notifications</p>
          {items.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Nothing yet.</p>
          ) : (
            <ul className="mt-2 max-h-72 divide-y divide-border overflow-y-auto">
              {items.map((n) => (
                <li key={n.id} className="py-2">
                  <p className="text-sm font-medium text-foreground">🔔 {n.title}</p>
                  <p className="text-sm text-muted-foreground">{n.message}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(n.created_at).toLocaleString("en-IN")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
