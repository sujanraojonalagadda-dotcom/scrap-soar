import type { Dict, Lang } from "./types";

import { common as enCommon } from "./locales/en/common";
import { domain as enDomain } from "./locales/en/domain";
import { notifications as enNotifications } from "./locales/en/notifications";
import { auth as enAuth } from "./locales/en/auth";
import { collector as enCollector } from "./locales/en/collector";
import { recycler as enRecycler } from "./locales/en/recycler";
import { admin as enAdmin } from "./locales/en/admin";

import { common as hiCommon } from "./locales/hi/common";
import { domain as hiDomain } from "./locales/hi/domain";
import { notifications as hiNotifications } from "./locales/hi/notifications";
import { auth as hiAuth } from "./locales/hi/auth";
import { collector as hiCollector } from "./locales/hi/collector";
import { recycler as hiRecycler } from "./locales/hi/recycler";
import { admin as hiAdmin } from "./locales/hi/admin";

import { common as mrCommon } from "./locales/mr/common";
import { domain as mrDomain } from "./locales/mr/domain";
import { notifications as mrNotifications } from "./locales/mr/notifications";
import { auth as mrAuth } from "./locales/mr/auth";
import { collector as mrCollector } from "./locales/mr/collector";
import { recycler as mrRecycler } from "./locales/mr/recycler";
import { admin as mrAdmin } from "./locales/mr/admin";

export * from "./types";

export const dictionaries: Record<Lang, Dict> = {
  en: { ...enCommon, ...enDomain, ...enNotifications, ...enAuth, ...enCollector, ...enRecycler, ...enAdmin },
  hi: { ...hiCommon, ...hiDomain, ...hiNotifications, ...hiAuth, ...hiCollector, ...hiRecycler, ...hiAdmin },
  mr: { ...mrCommon, ...mrDomain, ...mrNotifications, ...mrAuth, ...mrCollector, ...mrRecycler, ...mrAdmin },
};

export type TranslateVars = Record<string, string | number>;

/** Looks up a key in the selected language, falls back to English, then the key itself. */
export function translate(lang: Lang, key: string, vars?: TranslateVars): string {
  const template = dictionaries[lang]?.[key] ?? dictionaries.en[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}
