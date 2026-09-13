import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, BadgeCheck, Loader2 } from "lucide-react";
import { getRecyclerById, type Recycler } from "@/lib/services/recyclerService";

export const Route = createFileRoute("/_authenticated/collector/organization/$id")({
  head: () => ({
    meta: [
      { title: "Recycler Organisation — Kabadiwala Connect" },
      { name: "description", content: "Verified recycler details: contact, materials, operating area and rate." },
      { property: "og:title", content: "Recycler Organisation — Kabadiwala Connect" },
      { property: "og:description", content: "Contact, materials, operating area and rate of a verified recycler." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OrganisationDetail,
});

function OrganisationDetail() {
  const { id } = Route.useParams();
  const [recycler, setRecycler] = useState<Recycler | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRecyclerById(id)
      .then(setRecycler)
      .catch(() => setRecycler(null))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <main className="min-h-screen bg-muted pb-12">
      <header className="flex items-center gap-3 bg-card px-4 py-4 shadow-sm">
        <Link to="/collector/nearby" aria-label="Back" className="text-muted-foreground">
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <h1 className="text-lg font-bold text-foreground">Recycler organisation</h1>
      </header>

      <section className="px-4 py-6">
        {loading ? (
          <Loader2 className="size-6 animate-spin text-brand" aria-hidden />
        ) : !recycler ? (
          <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            This organisation is not available.
          </p>
        ) : (
          <article className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold text-foreground">{recycler.name}</h2>
              {recycler.verified && (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-brand-light px-2 py-1 text-xs font-medium text-brand-dark">
                  <BadgeCheck className="size-4" aria-hidden /> Verified
                </span>
              )}
            </div>
            {recycler.description && <p className="mt-2 text-sm text-muted-foreground">{recycler.description}</p>}
            <dl className="mt-4 space-y-2 text-sm">
              <Row label="Contact person" value={recycler.contact_person} />
              <Row label="Contact number" value={recycler.contact_phone} />
              <Row label="City / area" value={recycler.location} />
              <Row label="Operating area" value={recycler.operating_area} />
              <Row label="Materials accepted" value={recycler.materials.length ? recycler.materials.join(", ") : null} />
              <Row label="Rate" value={recycler.rate_per_kg ? `₹${Number(recycler.rate_per_kg)}/kg` : null} />
              <Row label="Registration number" value={recycler.registration_number} />
              <Row label="Business hours" value={recycler.business_hours} />
              <Row
                label="Verified on"
                value={
                  recycler.verification_date
                    ? new Date(`${recycler.verification_date}T00:00:00`).toLocaleDateString("en-IN")
                    : null
                }
              />
            </dl>
          </article>
        )}
      </section>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value ?? "Not provided"}</dd>
    </div>
  );
}
