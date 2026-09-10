import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/collector/history")({
  head: () => ({
    meta: [
      { title: "Pickup History — Kabadiwala Connect" },
      { name: "description", content: "Every pickup you have recorded and handed over." },
      { property: "og:title", content: "Pickup History — Kabadiwala Connect" },
      { property: "og:description", content: "Every pickup you have recorded and handed over." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  return (
    <main className="min-h-screen bg-muted">
      <header className="flex items-center gap-3 bg-card px-4 py-4 shadow-sm">
        <Link to="/collector/home" aria-label="Back" className="text-muted-foreground">
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <h1 className="text-lg font-bold text-foreground">Pickup history</h1>
      </header>
      <section className="px-4 py-6">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">No pickups recorded yet.</p>
        </div>
      </section>
    </main>
  );
}
