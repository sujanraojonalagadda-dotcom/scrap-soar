import { Languages } from "lucide-react";

import { useI18n } from "@/i18n/provider";
import { LANGUAGES, isLang } from "@/i18n/types";

/** Language switching applies immediately; the choice is saved locally and on the profile. */
export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { lang, setLang, t } = useI18n();

  return (
    <div className="flex items-center gap-2">
      {!compact && (
        <label htmlFor="app-language" className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Languages className="size-4" aria-hidden />
          {t("language")}
        </label>
      )}
      <select
        id="app-language"
        aria-label={t("chooseLanguage")}
        value={lang}
        onChange={(event) => {
          const next = event.target.value;
          if (isLang(next)) setLang(next);
        }}
        className="min-w-24 max-w-40 rounded-lg border border-input bg-background px-2 py-1.5 text-sm text-foreground"
      >
        {LANGUAGES.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
