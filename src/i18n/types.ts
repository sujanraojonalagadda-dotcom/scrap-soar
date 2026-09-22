export type Lang = "en" | "hi" | "mr";

export const LANGUAGES: { value: Lang; label: string }[] = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिन्दी" },
  { value: "mr", label: "मराठी" },
];

export const SPEECH_LOCALE: Record<Lang, string> = {
  en: "en-IN",
  hi: "hi-IN",
  mr: "mr-IN",
};

export const SPOKEN_LANGUAGE_NAME: Record<Lang, string> = {
  en: "English",
  hi: "Hindi",
  mr: "Marathi",
};

export function isLang(value: unknown): value is Lang {
  return value === "en" || value === "hi" || value === "mr";
}

export type Dict = Record<string, string>;
