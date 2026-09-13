import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { IndianRupee, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAdminData, setRecyclerVerification } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/recyclers")({ head: () => ({ meta: [
  { title: "Recycler Authorization — Kabadiwala Connect" }, { name: "description", content: "Review recycler authorization, rates and accepted materials." },
  { property: "og:title", content: "Recycler Authorization — Kabadiwala Connect" }, { property: "og:description", content: "Review recycler authorization, rates and accepted materials." },
  { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
] }), component: Recyclers });

function Recyclers() {
  const load = useServerFn(getAdminData); const update = useServerFn(setRecyclerVerification);
  const [items, setItems] = useState<Awaited<ReturnType<typeof load>>["recyclers"]>([]); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState<string | null>(null); const [error, setError] = useState<string | null>(null);
  useEffect(() => { load().then((d) => setItems(d.recyclers)).catch(() => setError("Recyclers could not be loaded.")).finally(() => setLoading(false)); }, [load]);
  async function toggle(id: string, verified: boolean) { setBusy(id); setError(null); try { await update({ data: { id, verified } }); const date = verified ? new Date().toISOString().slice(0, 10) : null; setItems((current) => current.map((item) => item.id === id ? { ...item, verified, verification_date: date } : item)); } catch { setError("Authorization could not be updated."); } finally { setBusy(null); } }
  return <div className="mx-auto max-w-6xl"><h1 className="text-2xl font-bold">Recyclers</h1><p className="mt-1 text-sm text-muted-foreground">Verify authorization and review accepted materials.</p>{error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}{loading ? <Loader2 className="mt-12 size-6 animate-spin text-brand" /> : items.length === 0 ? <p className="mt-12 text-sm text-muted-foreground">No recycler applications yet.</p> : <div className="mt-5 grid gap-3 lg:grid-cols-2">{items.map((item) => <article key={item.id} className="rounded-lg border border-border bg-card p-4"><div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold">{item.name}</h2><p className="mt-1 text-sm text-muted-foreground">{item.location ?? "No location"}</p></div><span className={`rounded-full px-2 py-1 text-xs font-medium ${item.verified ? "bg-brand-light text-brand-dark" : "bg-warning-light text-warning-dark"}`}>{item.verified ? "Authorized" : "Pending"}</span></div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-muted-foreground">Rate</dt><dd className="mt-1 flex items-center font-medium"><IndianRupee className="size-3" />{item.rate_per_kg ?? "—"}/kg</dd></div><div><dt className="text-xs text-muted-foreground">Verification date</dt><dd className="mt-1 font-medium">{item.verification_date ? new Date(`${item.verification_date}T00:00:00`).toLocaleDateString("en-IN") : "—"}</dd></div></dl><p className="mt-3 text-xs text-muted-foreground">Materials: {item.materials.length ? item.materials.join(", ") : "Not provided"}</p><Button className="mt-4 w-full" variant={item.verified ? "outline" : "default"} disabled={busy === item.id} onClick={() => toggle(item.id, !item.verified)}>{busy === item.id && <Loader2 className="size-4 animate-spin" />}{item.verified ? "Remove authorization" : "Verify authorization"}</Button></article>)}</div>}</div>;
}