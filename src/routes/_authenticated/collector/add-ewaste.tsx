import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowLeft, Camera, Loader2, MapPin, Mic, Square, Volume2 } from "lucide-react";
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
import { startAudioRecording } from "@/lib/services/audioRecorder";
import { transcribeVoice } from "@/lib/services/transcriptionService";
import { uploadWastePhoto } from "@/lib/photo.functions";
import { geolocationErrorMessage, getCurrentPosition, type GeolocationErrorKind } from "@/lib/services/locationService";

export const Route = createFileRoute("/_authenticated/collector/add-ewaste")({
  validateSearch: (search: Record<string, unknown>) => ({
    category: typeof search["category"] === "string" ? (search["category"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "List E-Waste — Kabadiwala Connect" },
      { name: "description", content: "Post your e-waste so verified recyclers can send you offers." },
      { property: "og:title", content: "List E-Waste — Kabadiwala Connect" },
      { property: "og:description", content: "Post your e-waste so verified recyclers can send you offers." },
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
  const upload = useServerFn(uploadWastePhoto);
  const [category, setCategory] = useState(
    CATEGORIES.find((c) => c.toLowerCase() === (preset ?? "").toLowerCase()) ?? "Laptop",
  );
  const [weight, setWeight] = useState("");
  const [condition, setCondition] = useState<Condition>("working");
  const [quantityNote, setQuantityNote] = useState("");
  const [notes, setNotes] = useState("");
  const [recyclers, setRecyclers] = useState<Recycler[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [address, setAddress] = useState("");
  const [askingPrice, setAskingPrice] = useState("");
  const [posted, setPosted] = useState(false);

  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [stopRecording, setStopRecording] = useState<(() => Promise<Blob>) | null>(null);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setVoiceSupported(Boolean(navigator.mediaDevices));
    setOnline(navigator.onLine);
    const updateOnline = () => setOnline(navigator.onLine);
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      setUserId(data.user.id);
      const draft = readPickupDraft(data.user.id);
      if (draft) {
        setCategory(CATEGORIES.includes(draft.category) ? draft.category : "Laptop");
        setWeight(draft.weight);
        setCondition(draft.condition as Condition);
      }
    });
    void listRecyclers()
      .then((list) => {
        setRecyclers(list);
        cacheRecyclers(list);
      })
      .catch(() => setRecyclers(readCachedRecyclers<Recycler>()));
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  useEffect(() => {
    if (userId) savePickupDraft(userId, { category, weight, condition, recyclerId: null });
  }, [category, condition, userId, weight]);

  const verifiedRates = recyclers.filter((r) => r.verified && r.rate_per_kg).map((r) => Number(r.rate_per_kg));
  const averageRate = verifiedRates.length
    ? verifiedRates.reduce((sum, rate) => sum + rate, 0) / verifiedRates.length
    : null;
  const price = indicativePrice(Number(weight), averageRate, condition);

  function choosePhoto(file: File | null) {
    setPhotoFile(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  }

  async function useMyLocation() {
    setLocating(true);
    setError(null);
    try {
      const point = await getCurrentPosition();
      setCoords(point);
    } catch (err) {
      const kind = (err as { kind?: GeolocationErrorKind }).kind ?? "unavailable";
      setError(geolocationErrorMessage(kind));
    } finally {
      setLocating(false);
    }
  }

  async function uploadPhotoIfAny(): Promise<string | null> {
    if (!photoFile || !navigator.onLine) return null;
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.onerror = () => reject(new Error("That photo could not be read."));
      reader.readAsDataURL(photoFile);
    });
    const type = photoFile.type === "image/png" ? "image/png" : photoFile.type === "image/webp" ? "image/webp" : "image/jpeg";
    const { path } = await upload({ data: { base64, contentType: type } });
    return path;
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
      const photoUrl = await uploadPhotoIfAny().catch(() => null);
      const input: CreatePickupInput = {
        id: crypto.randomUUID(),
        collectorId: data.user.id,
        recyclerId: null,
        category: category.toLowerCase(),
        weightKg: Number(weight),
        condition,
        indicativePrice: price,
        handoverCode: String(Math.floor(100000 + Math.random() * 900000)),
        quantityNote: quantityNote.trim() || null,
        notes: notes.trim() || null,
        photoUrl,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
        pickupAddress: address.trim() || null,
        askingPrice: askingPrice.trim() && Number(askingPrice) > 0 ? Number(askingPrice) : null,
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
      setPosted(true);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this listing.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleListening() {
    if (listening) {
      if (!stopRecording) return;
      setListening(false);
      setBusy(true);
      try {
        const audio = await stopRecording();
        const spoken = await transcribeVoice(audio, language);
        setTranscript(spoken);
        const parsed = parsePickupSpeech(spoken);
        if (parsed.category) setCategory(parsed.category);
        if (parsed.weight) setWeight(parsed.weight);
        if (parsed.condition) setCondition(parsed.condition);
        if (!parsed.category && !parsed.weight && !parsed.condition)
          setError("I couldn't find an item, weight or condition in that speech. Please edit the fields manually.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Voice input could not be completed.");
      } finally {
        setStopRecording(null);
        setBusy(false);
      }
      return;
    }
    setError(null);
    try {
      const stop = await startAudioRecording();
      setStopRecording(() => stop);
      setListening(true);
    } catch {
      setError("Microphone access is needed for voice input. You can enter the details manually.");
    }
  }

  if (posted) {
    return (
      <main className="min-h-screen bg-muted px-4 py-10">
        <div className="mx-auto max-w-md rounded-xl border border-brand bg-card p-6 text-center">
          <h1 className="text-lg font-bold text-brand-dark">
            {online ? "Your waste is now available to authorized recyclers." : "Saved on this device"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {online
              ? "Verified recyclers can now see it and send you a purchase request. You choose who buys it."
              : "This listing will be sent to recyclers automatically once you are back online."}
          </p>
          <Link
            to="/collector/history"
            className="mt-5 flex h-12 w-full items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground"
          >
            View my listings
          </Link>
          <button
            type="button"
            onClick={() => navigate({ to: "/collector/home" })}
            className="mt-3 h-12 w-full rounded-lg border border-border text-sm font-medium text-foreground"
          >
            Back to home
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-muted pb-10">
      <header className="flex items-center gap-3 bg-card px-4 py-4 shadow-sm">
        <Link to="/collector/home" aria-label="Back" className="text-muted-foreground">
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <h1 className="text-lg font-bold text-foreground">List E-Waste</h1>
      </header>


      <form onSubmit={handleSubmit} className="space-y-4 px-4 py-6">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Fill by voice</p>
              <p className="text-xs text-muted-foreground">Say “Laptop 3 kilo” or “लैपटॉप 3 किलो”.</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <select
                aria-label="Voice language"
                value={language}
                onChange={(e) => setLanguage(e.target.value as "en" | "hi")}
                className="h-10 rounded-lg border border-border bg-background px-2 text-sm"
              >
                <option value="en">EN</option>
                <option value="hi">हिं</option>
              </select>
              <button
                type="button"
                onClick={toggleListening}
                disabled={!voiceSupported || busy}
                aria-label={listening ? "Stop listening" : "Start voice input"}
                className={`flex size-10 items-center justify-center rounded-lg border ${listening ? "border-destructive text-destructive" : "border-brand text-brand-dark"} disabled:opacity-40`}
              >
                {listening ? <Square className="size-4" aria-hidden /> : <Mic className="size-5" aria-hidden />}
              </button>
            </div>
          </div>
          {listening && <p className="mt-2 text-sm font-medium text-brand-dark">Listening… tap stop when finished.</p>}
          {transcript && <p className="mt-2 text-sm text-muted-foreground">Heard: “{transcript}”</p>}
          {!voiceSupported && (
            <p className="mt-2 text-xs text-muted-foreground">
              Voice input is not supported in this browser. You can use the fields below.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <span className="mb-1.5 block text-sm font-medium text-foreground">Photo</span>
          {photoPreview ? (
            <img src={photoPreview} alt="Selected e-waste" className="mb-3 h-40 w-full rounded-lg object-cover" />
          ) : (
            <p className="mb-3 text-xs text-muted-foreground">
              A photo helps recyclers judge the item. {online ? "Optional." : "Photos need internet, so this one will be skipped."}
            </p>
          )}
          <label className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-border text-sm font-medium text-foreground">
            <Camera className="size-4" aria-hidden /> {photoPreview ? "Change photo" : "Add photo"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => choosePhoto(e.target.files?.[0] ?? null)}
            />
          </label>
          <Link
            to="/collector/identify"
            className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border text-sm font-medium text-foreground"
          >
            <Camera className="size-4" aria-hidden /> Identify item with a photo
          </Link>
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

          <label htmlFor="wt" className="mt-4 mb-1.5 block text-sm font-medium text-foreground">
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

          <label htmlFor="qty" className="mt-4 mb-1.5 block text-sm font-medium text-foreground">
            Quantity / details
          </label>
          <input
            id="qty"
            value={quantityNote}
            onChange={(e) => setQuantityNote(e.target.value)}
            placeholder="e.g. 2 laptops, no chargers"
            className="h-12 w-full rounded-lg border border-border bg-background px-3 text-base outline-none focus:ring-2 focus:ring-ring"
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
          <label htmlFor="addr" className="mb-1.5 block text-sm font-medium text-foreground">
            Pickup area
          </label>
          <input
            id="addr"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Area, landmark or city"
            className="h-12 w-full rounded-lg border border-border bg-background px-3 text-base outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border text-sm font-medium text-foreground disabled:opacity-50"
          >
            {locating ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <MapPin className="size-4" aria-hidden />}
            {coords ? "Location added" : "Use my current location"}
          </button>
          <label htmlFor="notes" className="mt-4 mb-1.5 block text-sm font-medium text-foreground">
            Notes for recyclers
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Anything a recycler should know before offering"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-foreground">Indicative value</span>
            <button
              type="button"
              onClick={() => speakPrice(price, language)}
              aria-label="Read price aloud"
              className="flex size-10 items-center justify-center rounded-lg border border-info text-info"
            >
              <Volume2 className="size-5" aria-hidden />
            </button>
          </div>
          <p className="text-3xl font-bold text-brand-dark">{formatRupees(price)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {price === null
              ? "A value appears once you enter a weight and verified recyclers have published rates."
              : "Based on the average rate of verified recyclers. Recyclers will send you real purchase requests."}
          </p>
          <label htmlFor="ask" className="mt-4 mb-1.5 block text-sm font-medium text-foreground">
            Your asking price per kg (₹, optional)
          </label>
          <input
            id="ask"
            inputMode="decimal"
            value={askingPrice}
            onChange={(e) => setAskingPrice(e.target.value)}
            placeholder="e.g. 120"
            className="h-12 w-full rounded-lg border border-border bg-background px-3 text-base outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <button
          type="submit"
          disabled={busy || !weight || Number(weight) <= 0}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {!online ? "SAVE FOR SYNC" : "LIST FOR PURCHASE"}
        </button>
        <p className="text-center text-xs text-muted-foreground">
          Your listing stays open until you accept a recycler's purchase request.
        </p>

        {error && (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-card px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </form>
    </main>
  );
}
