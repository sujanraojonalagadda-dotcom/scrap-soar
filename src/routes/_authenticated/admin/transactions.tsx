import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { getAdminData } from "@/lib/admin.functions";
import { formatRupees } from "@/lib/services/priceService";

export const Route = createFileRoute("/_authenticated/admin/transactions")({ head: () => ({ meta: [
  { title: "Transaction Monitor — Kabadiwala Connect" }, { name: "description", content: "Monitor traceable e-waste handovers and payment status." },
  { property: "og:title", content: "Transaction Monitor — Kabadiwala Connect" }, { property: "og:description", content: "Monitor traceable e-waste handovers and payment status." },
  { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
] }), component: Transactions });

function Transactions() {
  const load = useServerFn(getAdminData); const [data, setData] = useState<Awaited<ReturnType<typeof load>> | null>(null); const [query, setQuery] = useState(""); const [error, setError] = useState<string | null>(null);
  useEffect(() => { load().then(setData).catch(() => setError("Transactions could not be loaded.")); }, [load]);
  const shown = useMemo(() => data?.transactions.filter((item) => `${item.receipt_number} ${item.category} ${item.status}`.toLowerCase().includes(query.toLowerCase())) ?? [], [data, query]);
  const profileNames = new Map(data?.profiles.map((item) => [item.user_id, item.name]) ?? []); const recyclerNames = new Map(data?.recyclers.map((item) => [item.id, item.name]) ?? []);
  return <div className="mx-auto max-w-6xl"><h1 className="text-2xl font-bold">Transactions</h1><p className="mt-1 text-sm text-muted-foreground">Every record shown comes from a submitted pickup.</p><label className="mt-5 flex max-w-md items-center gap-2 rounded-md border border-border bg-card px-3"><Search className="size-4 text-muted-foreground" /><input aria-label="Search transactions" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search receipt, category or status" className="h-11 w-full bg-transparent text-sm outline-none" /></label>{error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}{!data && !error ? <Loader2 className="mt-12 size-6 animate-spin text-brand" /> : shown.length === 0 ? <p className="mt-12 text-sm text-muted-foreground">No transactions found.</p> : <div className="mt-5 overflow-x-auto rounded-lg border border-border bg-card"><table className="w-full min-w-[820px] text-left text-sm"><thead className="border-b border-border bg-muted"><tr>{["Receipt", "Collector", "Recycler", "Material", "Weight", "Final price", "Handover", "Payment", "Status"].map((label) => <th key={label} className="px-4 py-3 font-medium text-muted-foreground">{label}</th>)}</tr></thead><tbody className="divide-y divide-border">{shown.map((item) => <tr key={item.id}><td className="px-4 py-3 font-medium">{item.receipt_number}</td><td className="px-4 py-3">{profileNames.get(item.collector_id) ?? "Unknown"}</td><td className="px-4 py-3">{item.recycler_id ? recyclerNames.get(item.recycler_id) ?? "Unknown" : "Not selected"}</td><td className="px-4 py-3 capitalize">{item.category}</td><td className="px-4 py-3">{Number(item.final_weight_kg ?? item.weight_kg)} kg</td><td className="px-4 py-3">{item.final_price == null ? "—" : formatRupees(Number(item.final_price))}</td><td className="px-4 py-3">{item.otp_verified ? "Verified" : "Pending"}</td><td className="px-4 py-3 capitalize">{item.payment_status === "paid" ? "Completed" : "Unpaid"}</td><td className="px-4 py-3 capitalize">{item.status}</td></tr>)}</tbody></table></div>}</div>;
}