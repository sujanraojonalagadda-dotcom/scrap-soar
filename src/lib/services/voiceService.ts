import type { Condition } from "@/lib/services/priceService";
import { SPEECH_LOCALE, type Lang } from "@/i18n/types";
import { translate } from "@/i18n";

const categoryAliases: Record<string, string[]> = {
  Laptop: ["laptop", "notebook", "लैपटॉप", "लॅपटॉप"],
  Mobile: ["mobile", "phone", "मोबाइल", "मोबाईल", "फोन", "फ़ोन"],
  Monitor: ["monitor", "मॉनिटर"],
  Television: ["television", "tv", "टीवी", "टेलीविजन", "टीव्ही", "टेलिव्हिजन"],
  Printer: ["printer", "प्रिंटर"],
  Keyboard: ["keyboard", "कीबोर्ड"],
  Mouse: ["mouse", "माउस"],
  Cable: ["cable", "wire", "केबल", "तार", "तारा"],
  Battery: ["battery", "बैटरी", "बॅटरी"],
  Other: ["other", "अन्य", "दूसरा", "इतर"],
};

const numberWords: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  एक: 1, दो: 2, तीन: 3, चार: 4, पांच: 5, पाँच: 5, छह: 6, सात: 7, आठ: 8, नौ: 9, दस: 10,
  दोन: 2, पाच: 5, सहा: 6, आठवा: 8, नऊ: 9, दहा: 10,
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
  if (/partially working|partial|आंशिक|थोड़ा काम|अंशतः|थोडं काम|थोडे काम/.test(normalized)) condition = "partially_working";
  else if (/not working|broken|खराब|काम नहीं|बंद आहे|चालत नाही|काम करत नाही/.test(normalized)) condition = "not_working";
  else if (/working|चालू|काम करता|चालतो|चालते|सुरू/.test(normalized)) condition = "working";
  const parsed: { category?: string; weight?: string; condition?: Condition } = {};
  if (category) parsed.category = category;
  if (numeric) parsed.weight = numeric;
  else if (wordWeight) parsed.weight = String(wordWeight);
  if (condition) parsed.condition = condition;
  return parsed;
}

/** Speaks any already-translated sentence in the selected language. */
export function speak(text: string, language: Lang): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = SPEECH_LOCALE[language];
  window.speechSynthesis.speak(utterance);
  return true;
}

/** Only ever speaks a price that was genuinely calculated. */
export function speakPrice(price: number | null, language: Lang): boolean {
  const text =
    price === null
      ? translate(language, "priceUnavailable")
      : translate(language, "voice.estimatedPrice", { amount: Math.round(price) });
  return speak(text, language);
}
