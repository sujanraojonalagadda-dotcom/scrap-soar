import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Recycle, Users, Warehouse } from "lucide-react";
import { getAdminData } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  head: () => ({ meta: [
    { title: "Admin Dashboard — Kabadiwala Connect" },
    { name: "description", content: "Monitor verified participants and recorded e-waste handovers." },
    { property: "og:title", content: "Admin Dashboard — Kabadiwala Connect" },
    { property: "og:description", content: "Monitor verified participants and recorded e-waste handovers." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const load = useServerFn(getAdminData);
  const [data, setData] = useState<Awaited<ReturnType<typeof load>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { load().then(setData).catch((e) => setError(e instanceof Error ? e.message : "Dashboard unavailable.")); }, [load]);
  if (error) return <ErrorState message={error} />;
  if (!data) return <Loader2 className="mx-auto mt-24 size-6 animate-spin text-brand" />;
  const completed = data.transactions.filter((item) => item.status === "completed");
  const totalWeight = data.transactions.reduce((sum, item) => sum + Number(item.final_weight_kg ?? item.weight_kg), 0);
  const completedWeight = completed.reduce((sum, item) => sum + Number(item.final_weight_kg ?? item.weight_kg), 0);
  const formalRate = totalWeight > 0 ? `${Math.round((completedWeight / totalWeight) * 100)}%` : "—";
  const collectors = data.profiles.filter((profile) => profile.role === "collector");
  return <div className="mx-auto max-w-6xl">
    <header><p className="text-sm font-semibold text-brand-dark">ADMIN CONTROL</p><h1 className="mt-1 text-2xl font-bold text-foreground">Platform overview</h1><p className="mt-1 text-sm text-muted-foreground">Live totals from recorded activity.</p></header>
    <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Metric icon={Recycle} label="Total e-waste" value={`${totalWeight.toFixed(1)} kg`} />
      <Metric icon={CheckCircle2} label="Formal channelization" value={formalRate} />
      <Metric icon={Users} label="Collectors" value={String(collectors.length)} />
      <Metric icon={Warehouse} label="Recyclers" value={String(data.recyclers.length)} />
    </section>
    <section className="mt-7 grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-border bg-card p-5"><h2 className="font-semibold">Verification queue</h2><div className="mt-4 space-y-3 text-sm"><Queue label="Collectors awaiting review" value={collectors.filter((p) => !p.verified).length} to="/admin/collectors" /><Queue label="Recyclers awaiting review" value={data.recyclers.filter((r) => !r.verified).length} to="/admin/recyclers" /></div></div>
      <div className="rounded-lg border border-border bg-card p-5"><h2 className="font-semibold">Transactions</h2><div className="mt-4 grid grid-cols-2 gap-4"><SmallStat label="Recorded" value={data.transactions.length} /><SmallStat label="Completed" value={completed.length} /></div><Link to="/admin/transactions" className="mt-5 inline-block text-sm font-medium text-info underline">Monitor transactions</Link></div>
    </section>
  </div>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof Recycle; label: string; value: string }) { return <div className="rounded-lg border border-border bg-card p-4"><Icon className="size-5 text-brand-dark" /><p className="mt-4 text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-bold text-foreground">{value}</p></div>; }
function Queue({ label, value, to }: { label: string; value: number; to: "/admin/collectors" | "/admin/recyclers" }) { return <Link to={to} className="flex items-center justify-between border-b border-border pb-3"><span>{label}</span><span className="font-bold text-brand-dark">{value}</span></Link>; }
function SmallStat({ label, value }: { label: string; value: number }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>; }
function ErrorState({ message }: { message: string }) { return <div role="alert" className="mx-auto mt-20 max-w-lg rounded-lg border border-destructive/30 bg-card p-5 text-sm text-destructive">{message}</div>; }