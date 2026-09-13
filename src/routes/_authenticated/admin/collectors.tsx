import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAdminData, setCollectorVerification } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/collectors")({
  head: () => ({ meta: [
    { title: "Collector Verification — Kabadiwala Connect" }, { name: "description", content: "Review and verify registered e-waste collectors." },
    { property: "og:title", content: "Collector Verification — Kabadiwala Connect" }, { property: "og:description", content: "Review and verify registered e-waste collectors." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: Collectors,
});

function Collectors() {
  const load = useServerFn(getAdminData); const update = useServerFn(setCollectorVerification);
  const [items, setItems] = useState<Awaited<ReturnType<typeof load>>["profiles"]>([]); const [loading, setLoading] = useState(true); const [query, setQuery] = useState(""); const [busy, setBusy] = useState<string | null>(null); const [error, setError] = useState<string | null>(null);
  useEffect(() => { load().then((d) => setItems(d.profiles.filter((p) => p.role === "collector"))).catch(() => setError("Collectors could not be loaded.")).finally(() => setLoading(false)); }, [load]);
  const shown = useMemo(() => items.filter((item) => `${item.name} ${item.phone ?? ""} ${item.location ?? ""}`.toLowerCase().includes(query.toLowerCase())), [items, query]);
  async function toggle(id: string, verified: boolean) { setBusy(id); setError(null); try { await update({ data: { id, verified } }); setItems((current) => current.map((item) => item.id === id ? { ...item, verified } : item)); } catch { setError("Verification could not be updated."); } finally { setBusy(null); } }
  return <div className="mx-auto max-w-6xl"><h1 className="text-2xl font-bold">Collectors</h1><p className="mt-1 text-sm text-muted-foreground">Review registered collectors before approving them.</p><label className="mt-5 flex max-w-md items-center gap-2 rounded-md border border-border bg-card px-3"><Search className="size-4 text-muted-foreground" /><input aria-label="Search collectors" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, mobile or area" className="h-11 w-full bg-transparent text-sm outline-none" /></label>{error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}{loading ? <Loader2 className="mt-12 size-6 animate-spin text-brand" /> : shown.length === 0 ? <p className="mt-12 text-sm text-muted-foreground">No collectors found.</p> : <div className="mt-5 grid gap-3 lg:grid-cols-2">{shown.map((item) => <article key={item.id} className="rounded-lg border border-border bg-card p-4"><div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold">{item.name}</h2><p className="mt-1 text-sm text-muted-foreground">{item.phone ?? "No mobile"} · {item.location ?? "No area"}</p><p className="mt-2 text-xs text-muted-foreground">Joined {new Date(item.created_at).toLocaleDateString("en-IN")}</p></div><span className={`rounded-full px-2 py-1 text-xs font-medium ${item.verified ? "bg-brand-light text-brand-dark" : "bg-warning-light text-warning-dark"}`}>{item.verified ? "Verified" : "Pending"}</span></div><Button className="mt-4 w-full" variant={item.verified ? "outline" : "default"} disabled={busy === item.id} onClick={() => toggle(item.id, !item.verified)}>{busy === item.id && <Loader2 className="size-4 animate-spin" />}{item.verified ? "Remove verification" : "Verify collector"}</Button></article>)}</div>}</div>;
}