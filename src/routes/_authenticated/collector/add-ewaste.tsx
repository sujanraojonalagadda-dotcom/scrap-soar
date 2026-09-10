import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listRecyclers, type Recycler } from "@/lib/services/recyclerService";
import { createPickup } from "@/lib/services/transactionService";
import { CONDITIONS, formatRupees, indicativePrice, type Condition } from "@/lib/services/priceService";

export const Route = createFileRoute("/_authenticated/collector/add-ewaste")({
  validateSearch: (search: Record<string, unknown>) => ({
    category: typeof search["category"] === "string" ? (search["category"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Add E-Waste — Kabadiwala Connect" },
      { name: "description", content: "Set the item, weight and condition, then send it to a recycler." },
      { property: "og:title", content: "Add E-Waste — Kabadiwala Connect" },
      { property: "og:description", content: "Set the item, weight and condition, then send it to a recycler." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AddEWaste,
});

const CATEGORIES = ["Laptop", "Mobile", "Monitor", "Television", "Printer", "Keyboard", "Mouse", "Cable", "Battery", "Other"];

function AddEWaste() {
  const { category: preset } = Route.useSearch();
  const navigate = useNavigate();
  const [category, setCategory] = useState(preset ?? "Laptop");
  const [weight, setWeight] = useState("");
  const [condition, setCondition] = useState<Condition>("working");
  const [recyclers, setRecyclers] = useState<Recycler[]>([]);
  const [recyclerId, setRecyclerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listRecyclers()
      .then((list) => {
        setRecyclers(list);
        setRecyclerId(list[0]?.id ?? null);
      })
      .catch(() => setRecyclers([]))
      .finally(() => setLoading(false));
  }, []);

  const chosen = recyclers.find((r) => r.id === recyclerId) ?? null;
  const price = indicativePrice(Number(weight), chosen?.rate_per_kg ?? null, condition);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setBusy(false);
      setError("Your session ended. Please sign in again.");
      return;
    }
    try {
      await createPickup({
        collectorId: data.user.id,
        recyclerId,
        category: category.toLowerCase(),
        weightKg: Number(weight),
        condition,
        indicativePrice: price,
      });
      navigate({ to: "/collector/history" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this pickup.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-muted pb-10">
      <header className="flex items-center gap-3 bg-card px-4 py-4 shadow-sm">
        <Link to="/collector/home" aria-label="Back" className="text-muted-foreground">
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <h1 className="text-lg font-bold text-foreground">Add E-Waste</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4 px-4 py-6">
        <div className="rounded-xl border border-border bg-card p-4">
          <label htmlFor="cat" className="mb-1.5 block text-sm font-medium text-foreground">
            Item
          </label>
          <select
            id="cat"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-12 w-full rounded-lg border border-border bg-background px-3 text-base outline-none focus:ring-2 focus:ring-ring"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-muted-foreground">Photo and automatic identification come later.</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <label htmlFor="wt" className="mb-1.5 block text-sm font-medium text-foreground">
            Weight (kg)
          </label>
          <input
            id="wt"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="3.5"
            className="h-12 w-full rounded-lg border border-border bg-background px-3 text-lg outline-none focus:ring-2 focus:ring-ring"
          />
          <span className="mt-4 mb-1.5 block text-sm font-medium text-foreground">Condition</span>
          <div className="space-y-2">
            {CONDITIONS.map((c) => (
              <label key={c.value} className="flex items-center gap-3 rounded-lg border border-border px-3 py-3 text-base">
                <input
                  type="radio"
                  name="condition"
                  checked={condition === c.value}
                  onChange={() => setCondition(c.value)}
                  className="size-4 accent-[var(--brand)]"
                />
                {c.label}
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <span className="mb-1.5 block text-sm font-medium text-foreground">Recycler</span>
          {loading ? (
            <Loader2 className="size-5 animate-spin text-brand" aria-hidden />
          ) : recyclers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recyclers available yet.</p>
          ) : (
            <div className="space-y-2">
              {recyclers.map((r) => (
                <label
                  key={r.id}
                  className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-3 ${
                    recyclerId === r.id ? "border-brand bg-brand-light" : "border-border"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="recycler"
                      checked={recyclerId === r.id}
                      onChange={() => setRecyclerId(r.id)}
                      className="size-4 accent-[var(--brand)]"
                    />
                    <span>
                      <span className="block font-medium text-foreground">
                        {r.name} {r.verified && <span className="text-info">✓</span>}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {r.location || "Location not set"} ·{" "}
                        {r.rate_per_kg ? `₹${Number(r.rate_per_kg)}/kg` : "Rate not set"}
                      </span>
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <span className="text-sm font-medium text-foreground">Indicative value</span>
          <p className="mt-1 text-3xl font-bold text-brand-dark">{formatRupees(price)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {price === null
              ? "A value appears once you enter a weight and pick a recycler who has set a rate."
              : "Final price is confirmed by the recycler at handover."}
          </p>
        </div>

        <button
          type="submit"
          disabled={busy || !weight || Number(weight) <= 0 || !recyclerId}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
          SEND TO RECYCLER
        </button>
        {error && (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-card px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </form>
    </main>
  );
}
