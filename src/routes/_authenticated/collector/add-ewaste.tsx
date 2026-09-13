import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Camera, Loader2, Mic, Square, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listRecyclers, type Recycler } from "@/lib/services/recyclerService";
import { createPickup, type CreatePickupInput } from "@/lib/services/transactionService";
import { CONDITIONS, formatRupees, indicativePrice, type Condition } from "@/lib/services/priceService";
import {
  cacheRecyclers,
  clearPickupDraft,
  queuePickup,
  readCachedRecyclers,
  readPickupDraft,
  savePickupDraft,
} from "@/lib/services/offlineService";
import { parsePickupSpeech, speakPrice } from "@/lib/services/voiceService";

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
  const [category, setCategory] = useState(
    CATEGORIES.find((c) => c.toLowerCase() === (preset ?? "").toLowerCase()) ?? "Laptop",
  );
  const [weight, setWeight] = useState("");
  const [condition, setCondition] = useState<Condition>("working");
  const [recyclers, setRecyclers] = useState<Recycler[]>([]);
  const [recyclerId, setRecyclerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<{ start: () => void; stop: () => void } | null>(null);

  useEffect(() => {
    const SpeechRecognition = (window as unknown as {
      SpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        onresult: ((event: { results: { 0: { 0: { transcript: string } } }[] }) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
        start: () => void;
        stop: () => void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        onresult: ((event: { results: { 0: { 0: { transcript: string } } }[] }) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
        start: () => void;
        stop: () => void;
      };
    }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition;
    setVoiceSupported(Boolean(SpeechRecognition));
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      setUserId(data.user.id);
      const draft = readPickupDraft(data.user.id);
      if (draft) {
        setCategory(CATEGORIES.includes(draft.category) ? draft.category : "Laptop");
        setWeight(draft.weight);
        setCondition(draft.condition as Condition);
        setRecyclerId(draft.recyclerId);
      }
    });
    listRecyclers()
      .then((list) => {
        setRecyclers(list);
        cacheRecyclers(list);
        setRecyclerId((current) => current ?? list[0]?.id ?? null);
      })
      .catch(() => {
        const cached = readCachedRecyclers<Recycler>();
        setRecyclers(cached);
        setRecyclerId((current) => current ?? cached[0]?.id ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (userId) savePickupDraft(userId, { category, weight, condition, recyclerId });
  }, [category, condition, recyclerId, userId, weight]);

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
      const input: CreatePickupInput = {
        id: crypto.randomUUID(),
        collectorId: data.user.id,
        recyclerId,
        category: category.toLowerCase(),
        weightKg: Number(weight),
        condition,
        indicativePrice: price,
        handoverCode: String(Math.floor(100000 + Math.random() * 900000)),
      };
      if (!navigator.onLine) queuePickup(input);
      else {
        try {
          await createPickup(input);
        } catch (err) {
          if (!navigator.onLine || err instanceof TypeError) queuePickup(input);
          else throw err;
        }
      }
      clearPickupDraft(data.user.id);
      navigate({ to: "/collector/history" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this pickup.");
    } finally {
      setBusy(false);
    }
  }

  function toggleListening() {
    if (listening) {
      recognition?.stop();
      return;
    }
    const Recognition = (window as unknown as { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any }).SpeechRecognition
      ?? (window as unknown as { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition;
    if (!Recognition) return;
    const next = new Recognition();
    next.lang = language === "hi" ? "hi-IN" : "en-IN";
    next.interimResults = false;
    next.onresult = (event: { results: { 0: { 0: { transcript: string } } }[] }) => {
      const spoken = event.results[0]?.[0]?.transcript ?? "";
      setTranscript(spoken);
      const parsed = parsePickupSpeech(spoken);
      if (parsed.category) setCategory(parsed.category);
      if (parsed.weight) setWeight(parsed.weight);
      if (parsed.condition) setCondition(parsed.condition);
      if (!parsed.category && !parsed.weight && !parsed.condition) setError("I couldn't find an item, weight or condition in that speech. Please edit the fields manually.");
    };
    next.onerror = () => setError("Voice input could not start. Check microphone permission or enter the details manually.");
    next.onend = () => setListening(false);
    setRecognition(next);
    setError(null);
    setListening(true);
    next.start();
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
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Fill by voice</p>
              <p className="text-xs text-muted-foreground">Say “Laptop 3 kilo” or “लैपटॉप 3 किलो”.</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <select aria-label="Voice language" value={language} onChange={(e) => setLanguage(e.target.value as "en" | "hi")} className="h-10 rounded-lg border border-border bg-background px-2 text-sm">
                <option value="en">EN</option>
                <option value="hi">हिं</option>
              </select>
              <button type="button" onClick={toggleListening} disabled={!voiceSupported} aria-label={listening ? "Stop listening" : "Start voice input"} className={`flex size-10 items-center justify-center rounded-lg border ${listening ? "border-destructive text-destructive" : "border-brand text-brand-dark"} disabled:opacity-40`}>
                {listening ? <Square className="size-4" aria-hidden /> : <Mic className="size-5" aria-hidden />}
              </button>
            </div>
          </div>
          {listening && <p className="mt-2 text-sm font-medium text-brand-dark">Listening…</p>}
          {transcript && <p className="mt-2 text-sm text-muted-foreground">Heard: “{transcript}”</p>}
          {!voiceSupported && <p className="mt-2 text-xs text-muted-foreground">Voice input is not supported in this browser. You can use the fields below.</p>}
        </div>
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
          <Link
            to="/collector/identify"
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border text-sm font-medium text-foreground"
          >
            <Camera className="size-4" aria-hidden /> Identify with a photo
          </Link>
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
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-foreground">Indicative value</span>
            <button type="button" onClick={() => speakPrice(price, language)} aria-label="Read price aloud" className="flex size-10 items-center justify-center rounded-lg border border-info text-info">
              <Volume2 className="size-5" aria-hidden />
            </button>
          </div>
          <p className="text-3xl font-bold text-brand-dark">{formatRupees(price)}</p>
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
          {typeof navigator !== "undefined" && !navigator.onLine ? "SAVE FOR SYNC" : "SEND TO RECYCLER"}
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
