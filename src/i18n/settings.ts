export const defaultLocale = "fr" as const;
export const locales = ["fr", "en"] as const;
export type Locale = (typeof locales)[number];

export const LOCALE_STORAGE_KEY = "fluxpro-locale";
