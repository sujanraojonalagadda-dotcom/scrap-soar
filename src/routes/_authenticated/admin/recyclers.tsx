import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { IndianRupee, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAdminData, setRecyclerVerification } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/recyclers")({
  head: () => ({
    meta: [
      { title: "Recycler Authorization — Kabadiwala Connect" },
      { name: "description", content: "Approve, reject or request changes on recycler organisations." },
      { property: "og:title", content: "Recycler Authorization — Kabadiwala Connect" },
      { property: "og:description", content: "Approve, reject or request changes on recycler organisations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Recyclers,
});

const STATUS_TEXT: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  changes_requested: "Changes requested",
};

function Recyclers() {
  const load = useServerFn(getAdminData);
  const update = useServerFn(setRecyclerVerification);
  const [items, setItems] = useState<Awaited<ReturnType<typeof load>>["recyclers"]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load()
      .then((d) => setItems(d.recyclers))
      .catch(() => setError("Recyclers could not be loaded."))
      .finally(() => setLoading(false));
  }, [load]);

  async function decide(id: string, decision: "approved" | "rejected" | "changes_requested") {
    setBusy(id);
    setError(null);
    try {
      const result = await update({ data: { id, decision, note: notes[id] ?? "" } });
      setItems((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                verified: decision === "approved",
                verification_status: decision,
                verification_note: notes[id]?.trim() ? notes[id].trim() : null,
                verification_date: result.verification_date,
              }
            : item,
        ),
      );
    } catch {
      setError("That decision could not be saved.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-bold">Recyclers</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Only approved organisations appear to collectors and can send offers.
      </p>
      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}
      {loading ? (
        <Loader2 className="mt-12 size-6 animate-spin text-brand" />
      ) : items.length === 0 ? (
        <p className="mt-12 text-sm text-muted-foreground">No recycler applications yet.</p>
      ) : (
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {items.map((item) => (
            <article key={item.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold">{item.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{item.location ?? "No location"}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.contact_person ?? "No contact person"} · {item.contact_phone ?? "No number"}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
                    item.verified
                      ? "bg-brand-light text-brand-dark"
                      : item.verification_status === "rejected"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-warning-light text-warning-dark"
                  }`}
                >
                  {STATUS_TEXT[item.verification_status] ?? "Pending"}
                </span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Rate</dt>
                  <dd className="mt-1 flex items-center font-medium">
                    <IndianRupee className="size-3" />
                    {item.rate_per_kg ?? "—"}/kg
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Verification date</dt>
                  <dd className="mt-1 font-medium">
                    {item.verification_date
                      ? new Date(`${item.verification_date}T00:00:00`).toLocaleDateString("en-IN")
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Operating area</dt>
                  <dd className="mt-1 font-medium">{item.operating_area ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Registration</dt>
                  <dd className="mt-1 font-medium">{item.registration_number ?? "—"}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-muted-foreground">
                Materials: {item.materials.length ? item.materials.join(", ") : "Not provided"}
              </p>
              {item.business_hours && <p className="mt-1 text-xs text-muted-foreground">Hours: {item.business_hours}</p>}
              {item.verification_note && (
                <p className="mt-2 text-xs text-muted-foreground">Last note: {item.verification_note}</p>
              )}
              <label className="mt-3 block text-xs text-muted-foreground" htmlFor={`note-${item.id}`}>
                Note to the organisation (optional)
              </label>
              <input
                id={`note-${item.id}`}
                value={notes[item.id] ?? ""}
                onChange={(e) => setNotes((current) => ({ ...current, [item.id]: e.target.value }))}
                className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button className="flex-1" disabled={busy === item.id} onClick={() => decide(item.id, "approved")}>
                  {busy === item.id && <Loader2 className="size-4 animate-spin" />} Approve
                </Button>
                <Button
                  variant="outline"
                  disabled={busy === item.id}
                  onClick={() => decide(item.id, "changes_requested")}
                >
                  Request changes
                </Button>
                <Button variant="outline" disabled={busy === item.id} onClick={() => decide(item.id, "rejected")}>
                  Reject
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
