"use client";

import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n/client";
import { defaultLocale, LOCALE_STORAGE_KEY, type Locale } from "@/i18n/settings";

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return defaultLocale;
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  return stored === "en" || stored === "fr" ? stored : defaultLocale;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const locale = readStoredLocale();
    void i18n.changeLanguage(locale);
    document.documentElement.lang = locale;
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
