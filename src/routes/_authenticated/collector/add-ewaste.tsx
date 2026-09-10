import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/collector/add-ewaste")({
  validateSearch: (search: Record<string, unknown>) => ({
    category: typeof search["category"] === "string" ? (search["category"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Add E-Waste — Kabadiwala Connect" },
      { name: "description", content: "Photograph the item, set its category, weight and condition." },
      { property: "og:title", content: "Add E-Waste — Kabadiwala Connect" },
      { property: "og:description", content: "Photograph the item, set its category, weight and condition." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AddEWaste,
});

function AddEWaste() {
  return (
    <main className="min-h-screen bg-muted">
      <header className="flex items-center gap-3 bg-card px-4 py-4 shadow-sm">
        <Link to="/collector/home" aria-label="Back" className="text-muted-foreground">
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <h1 className="text-lg font-bold text-foreground">Add E-Waste</h1>
      </header>
      <section className="px-4 py-6">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            The pickup workflow (photo, category, weight, condition, value) is built in the next phase.
          </p>
        </div>
      </section>
    </main>
  );
}
