import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Factory } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createRecycler, getMyRecycler } from "@/lib/services/recyclerService";

export const Route = createFileRoute("/_authenticated/recycler/register")({
  head: () => ({
    meta: [
      { title: "Register your recycling business — Kabadiwala Connect" },
      { name: "description", content: "Add your business name, city, materials accepted and rate per kilogram." },
      { property: "og:title", content: "Register your recycling business — Kabadiwala Connect" },
      { property: "og:description", content: "Add your business name, city, materials and rate per kilogram." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RecyclerRegister,
});

const MATERIALS = ["Laptop", "Mobile", "Monitor", "Television", "Printer", "Battery", "Cable", "Other"];

function RecyclerRegister() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [rate, setRate] = useState("");
  const [materials, setMaterials] = useState<string[]>([]);
  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [operatingArea, setOperatingArea] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [description, setDescription] = useState("");
  const [businessHours, setBusinessHours] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const existing = await getMyRecycler(data.user.id).catch(() => null);
      if (existing) navigate({ to: "/recycler/home" });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(material: string) {
    setMaterials((current) =>
      current.includes(material) ? current.filter((m) => m !== material) : [...current, material],
    );
  }

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
      await createRecycler({
        userId: data.user.id,
        name: name.trim(),
        location: location.trim() || null,
        materials,
        ratePerKg: rate.trim() ? Number(rate) : null,
        contactPerson: contactPerson.trim() || null,
        contactPhone: contactPhone.trim() || null,
        operatingArea: operatingArea.trim() || null,
        registrationNumber: registrationNumber.trim() || null,
        description: description.trim() || null,
        businessHours: businessHours.trim() || null,
      });
      navigate({ to: "/recycler/home" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your business details.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-muted px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-full bg-info-light">
            <Factory className="size-5 text-info-dark" aria-hidden />
          </span>
          <div>
            <h1 className="text-lg font-bold text-brand-dark">Your recycling business</h1>
            <p className="text-sm text-muted-foreground">Collectors see this when choosing where to hand over.</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="bname" className="mb-1.5 block text-sm font-medium text-foreground">
              Business name
            </label>
            <input
              id="bname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 w-full rounded-lg border border-border bg-background px-3 text-base outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="bcity" className="mb-1.5 block text-sm font-medium text-foreground">
              City / area
            </label>
            <input
              id="bcity"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="h-12 w-full rounded-lg border border-border bg-background px-3 text-base outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="cperson" className="mb-1.5 block text-sm font-medium text-foreground">
                Contact person
              </label>
              <input
                id="cperson"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="h-12 w-full rounded-lg border border-border bg-background px-3 text-base outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="cphone" className="mb-1.5 block text-sm font-medium text-foreground">
                Contact number
              </label>
              <input
                id="cphone"
                inputMode="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="h-12 w-full rounded-lg border border-border bg-background px-3 text-base outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="oarea" className="mb-1.5 block text-sm font-medium text-foreground">
                Operating area
              </label>
              <input
                id="oarea"
                value={operatingArea}
                onChange={(e) => setOperatingArea(e.target.value)}
                placeholder="Districts or areas you collect from"
                className="h-12 w-full rounded-lg border border-border bg-background px-3 text-base outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="regno" className="mb-1.5 block text-sm font-medium text-foreground">
                Registration number
              </label>
              <input
                id="regno"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                className="h-12 w-full rounded-lg border border-border bg-background px-3 text-base outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="bhours" className="mb-1.5 block text-sm font-medium text-foreground">
                Business hours
              </label>
              <input
                id="bhours"
                value={businessHours}
                onChange={(e) => setBusinessHours(e.target.value)}
                placeholder="e.g. Mon-Sat, 9 am to 7 pm"
                className="h-12 w-full rounded-lg border border-border bg-background px-3 text-base outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div>
            <label htmlFor="bdesc" className="mb-1.5 block text-sm font-medium text-foreground">
              About your organisation
            </label>
            <textarea
              id="bdesc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-foreground">Materials you accept</span>
            <div className="flex flex-wrap gap-2">
              {MATERIALS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggle(m)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    materials.includes(m)
                      ? "border-brand bg-brand-light text-brand-dark"
                      : "border-border bg-background text-muted-foreground"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="brate" className="mb-1.5 block text-sm font-medium text-foreground">
              Your rate per kg (₹)
            </label>
            <input
              id="brate"
              inputMode="decimal"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="e.g. 120"
              className="h-12 w-full rounded-lg border border-border bg-background px-3 text-base outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              This is your own rate. The app never invents a market price.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              An administrator reviews your organisation before collectors can see it or receive your offers.
            </p>
          </div>
          <button
            type="submit"
            disabled={busy || name.trim().length < 2}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-base font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
            SUBMIT FOR APPROVAL
          </button>
          {error && (
            <p role="alert" className="rounded-lg border border-destructive/30 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
