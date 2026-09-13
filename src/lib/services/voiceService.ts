import type { Condition } from "@/lib/services/priceService";

const categoryAliases: Record<string, string[]> = {
  Laptop: ["laptop", "notebook", "लैपटॉप"],
  Mobile: ["mobile", "phone", "मोबाइल", "फोन"],
  Monitor: ["monitor", "मॉनिटर"],
  Television: ["television", "tv", "टीवी", "टेलीविजन"],
  Printer: ["printer", "प्रिंटर"],
  Keyboard: ["keyboard", "कीबोर्ड"],
  Mouse: ["mouse", "माउस"],
  Cable: ["cable", "wire", "केबल", "तार"],
  Battery: ["battery", "बैटरी"],
  Other: ["other", "अन्य", "दूसरा"],
};

const numberWords: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  एक: 1, दो: 2, तीन: 3, चार: 4, पांच: 5, पाँच: 5, छह: 6, सात: 7, आठ: 8, नौ: 9, दस: 10,
};

export function parsePickupSpeech(transcript: string): {
  category?: string;
  weight?: string;
  condition?: Condition;
} {
  const normalized = transcript.toLowerCase().trim();
  const category = Object.entries(categoryAliases).find(([, aliases]) =>
    aliases.some((alias) => normalized.includes(alias)),
  )?.[0];
  const numeric = normalized.match(/(?:^|\s)(\d+(?:\.\d+)?)(?=\s|$|\s*(?:kg|kilo|kilogram|किलो))/)?.[1];
  const wordWeight = Object.entries(numberWords).find(([word]) => normalized.includes(word))?.[1];
  let condition: Condition | undefined;
  if (/partially working|partial|आंशिक|थोड़ा काम/.test(normalized)) condition = "partially_working";
  else if (/not working|broken|खराब|काम नहीं/.test(normalized)) condition = "not_working";
  else if (/working|चालू|काम करता/.test(normalized)) condition = "working";
  return { category, weight: numeric ?? (wordWeight ? String(wordWeight) : undefined), condition };
}

export function speakPrice(price: number | null, language: "en" | "hi") {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  window.speechSynthesis.cancel();
  const text = price === null
    ? language === "hi" ? "कीमत की जानकारी अभी उपलब्ध नहीं है।" : "Price information is currently unavailable."
    : language === "hi" ? `आपकी अनुमानित कीमत ${Math.round(price)} रुपये है।` : `Your estimated price is ${Math.round(price)} rupees.`;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language === "hi" ? "hi-IN" : "en-IN";
  window.speechSynthesis.speak(utterance);
  return true;
}