// Lightweight shared i18n catalog. One source of truth for UI strings, consumed identically by
// web (Next.js) and mobile (Expo) — truer to the "share the core" rule than two separate i18n libs
// (next-intl / react-i18next), and without their ICU/lazy-load overhead we don't yet need.
//
// This is the FOUNDATION: nav + common actions are translated to prove end-to-end locale switching.
// Extending coverage is mechanical — add keys here + a translation per locale, then swap literals
// for `t(key, locale)` in the screens. Missing keys fall back to English, then to the key itself.

export type Locale = 'en' | 'es';

export const LOCALES: Locale[] = ['en', 'es'];
export const LOCALE_LABELS: Record<Locale, string> = { en: 'English', es: 'Español' };

type Dict = Record<string, string>;

const en: Dict = {
  'nav.home': 'Home',
  'nav.log': 'Log',
  'nav.summary': 'Summary',
  'nav.nutrition': 'Nutrition',
  'nav.history': 'History',
  'nav.settings': 'Settings',
  'common.generatePlan': 'Generate plan',
  'common.search': 'Search',
  'common.scan': 'Scan',
  'common.add': 'Add',
  'common.settings': 'Settings',
  'common.language': 'Language',
};

const es: Dict = {
  'nav.home': 'Inicio',
  'nav.log': 'Registro',
  'nav.summary': 'Resumen',
  'nav.nutrition': 'Nutrición',
  'nav.history': 'Historial',
  'nav.settings': 'Ajustes',
  'common.generatePlan': 'Generar plan',
  'common.search': 'Buscar',
  'common.scan': 'Escanear',
  'common.add': 'Añadir',
  'common.settings': 'Ajustes',
  'common.language': 'Idioma',
};

const CATALOG: Record<Locale, Dict> = { en, es };

/** Translate a key for a locale, falling back to English then the raw key. */
export function t(key: string, locale: Locale = 'en'): string {
  return CATALOG[locale]?.[key] ?? CATALOG.en[key] ?? key;
}
