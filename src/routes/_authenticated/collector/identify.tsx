import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Camera, Images, Loader2 } from "lucide-react";
import { AI_CATEGORIES, classifyEwaste, type ClassifyResult } from "@/lib/services/aiService.functions";

export const Route = createFileRoute("/_authenticated/collector/identify")({
  head: () => ({
    meta: [
      { title: "Identify E-Waste — Kabadiwala Connect" },
      { name: "description", content: "Take a photo of the item and let the app identify its e-waste category." },
      { property: "og:title", content: "Identify E-Waste — Kabadiwala Connect" },
      { property: "og:description", content: "Take a photo of the item and let the app identify its e-waste category." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IdentifyPage,
});

function IdentifyPage() {
  const navigate = useNavigate();
  const classify = useServerFn(classifyEwaste);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setResult(null);
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not read that photo."));
      reader.readAsDataURL(file);
    }).catch(() => null);
    if (!dataUrl) {
      setError("Could not read that photo.");
      return;
    }
    setPhoto(dataUrl);
    if (!navigator.onLine) {
      setResult({ available: false, reason: "AI classification unavailable — no connection" });
      return;
    }
    setBusy(true);
    try {
      setResult(await classify({ data: { imageDataUrl: dataUrl } }));
    } catch {
      setResult({ available: false, reason: "AI classification unavailable" });
    } finally {
      setBusy(false);
    }
  }

  function useCategory(category: string) {
    navigate({ to: "/collector/add-ewaste", search: { category: category.toLowerCase() } });
  }

  return (
    <main className="min-h-screen bg-muted pb-10">
      <header className="flex items-center gap-3 bg-card px-4 py-4 shadow-sm">
        <Link to="/collector/home" aria-label="Back" className="text-muted-foreground">
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <h1 className="text-lg font-bold text-foreground">Identify E-Waste</h1>
      </header>

      <section className="space-y-4 px-4 py-6">
        {!online && (
          <p className="rounded-lg bg-warning-light px-3 py-2 text-sm text-warning-dark">
            Photo identification needs internet. You can still choose the item manually after adding a photo.
          </p>
        )}
        <div className="flex aspect-4/3 w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-card">
          {photo ? (
            <img src={photo} alt="E-waste item to identify" className="size-full object-contain" />
          ) : (
            <span className="flex flex-col items-center gap-2 text-muted-foreground">
              <Camera className="size-10" aria-hidden />
              <span className="text-sm">No photo yet</span>
            </span>
          )}
        </div>

        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => onFile(e.target.files?.[0])}
        />

        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground"
        >
          <Camera className="size-5" aria-hidden /> TAKE PHOTO
        </button>
        <button
          type="button"
          onClick={() => galleryRef.current?.click()}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-base font-medium text-foreground"
        >
          <Images className="size-5" aria-hidden /> Or select from gallery
        </button>

        {busy && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-brand" aria-hidden /> Identifying the item…
          </p>
        )}

        {error && (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-card px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {result && !busy && (
          <div className="rounded-xl border border-border bg-card p-4">
            {result.available ? (
              <>
                <h2 className="text-base font-semibold text-foreground">E-Waste Identified</h2>
                <p className="mt-3 text-2xl font-bold text-brand-dark">{result.category}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Confidence: {Math.round(result.confidence * 100)}%
                </p>
                <p className="mt-3 text-sm font-medium text-foreground">Is this correct?</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => useCategory(result.category)}
                    className="h-12 rounded-lg bg-primary text-base font-semibold text-primary-foreground"
                  >
                    YES
                  </button>
                  <button
                    type="button"
                    onClick={() => setResult({ available: false, reason: "Pick the item yourself" })}
                    className="h-12 rounded-lg border border-border text-base font-medium text-foreground"
                  >
                    CHANGE
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-base font-semibold text-foreground">{result.reason}</h2>
                <p className="mt-1 text-sm text-muted-foreground">Choose the item yourself to continue.</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {AI_CATEGORIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => useCategory(c)}
                      className="h-12 rounded-lg border border-border text-base font-medium text-foreground"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
