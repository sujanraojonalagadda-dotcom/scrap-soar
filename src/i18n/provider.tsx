import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { translate, type TranslateVars } from "./index";
import { isLang, SPEECH_LOCALE, type Lang } from "./types";

const STORAGE_KEY = "kc.language";

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, vars?: TranslateVars) => string;
  speechLocale: string;
}

const I18nContext = createContext<I18nValue | null>(null);

function readStoredLang(): Lang | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isLang(stored) ? stored : null;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  // Local preference first (works offline), then the signed-in profile preference.
  useEffect(() => {
    const stored = readStoredLang();
    if (stored) setLangState(stored);

    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      const userId = data.session?.user.id;
      if (!userId || !active) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("language")
        .eq("user_id", userId)
        .maybeSingle();
      const profileLang = profile?.language;
      if (active && isLang(profileLang)) {
        setLangState(profileLang);
        window.localStorage.setItem(STORAGE_KEY, profileLang);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, next);
    void supabase.auth.getSession().then(({ data }) => {
      const userId = data.session?.user.id;
      if (!userId) return;
      return supabase.from("profiles").update({ language: next }).eq("user_id", userId);
    });
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      setLang,
      t: (key: string, vars?: TranslateVars) => translate(lang, key, vars),
      speechLocale: SPEECH_LOCALE[lang],
    }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const context = useContext(I18nContext);
  if (!context) {
    // Safe fallback so a component rendered outside the provider still shows English text.
    return {
      lang: "en",
      setLang: () => undefined,
      t: (key: string, vars?: TranslateVars) => translate("en", key, vars),
      speechLocale: SPEECH_LOCALE.en,
    };
  }
  return context;
}

/** Convenience for components that only need the translate function. */
export function useT() {
  return useI18n().t;
}
