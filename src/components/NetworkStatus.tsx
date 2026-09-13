import { useEffect, useState } from "react";
import { CloudOff, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listQueuedPickups, syncQueuedPickups } from "@/lib/services/offlineService";

export function NetworkStatus() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const isOnline = navigator.onLine;
      setOnline(isOnline);
      const { data } = await supabase.auth.getUser();
      if (!active || !data.user) return;
      setPending(listQueuedPickups(data.user.id).length);
      if (isOnline && listQueuedPickups(data.user.id).length > 0) {
        setSyncing(true);
        await syncQueuedPickups(data.user.id);
        if (active) {
          setPending(listQueuedPickups(data.user.id).length);
          setSyncing(false);
        }
      }
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", refresh);
    window.addEventListener("offline", onOffline);
    window.addEventListener("kc:queue-changed", refresh);
    void refresh();
    return () => {
      active = false;
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("kc:queue-changed", refresh);
    };
  }, []);

  if (online && pending === 0 && !syncing) return null;
  return (
    <div className={`sticky top-0 z-50 flex min-h-9 items-center justify-center gap-2 px-3 py-2 text-center text-xs font-semibold ${online ? "bg-info-light text-info-dark" : "bg-warning-light text-warning-dark"}`}>
      {syncing ? <RefreshCw className="size-4 animate-spin" aria-hidden /> : <CloudOff className="size-4" aria-hidden />}
      {syncing ? "Sending saved pickups…" : online ? `${pending} pickup${pending === 1 ? "" : "s"} waiting to sync` : "Offline — your work will be saved on this device"}
    </div>
  );
}