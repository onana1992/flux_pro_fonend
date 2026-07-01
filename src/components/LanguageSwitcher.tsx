"use client";

import { ChevronUpIcon } from "@radix-ui/react-icons";
import { DropdownMenu, Flex } from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n/client";
import { LOCALE_STORAGE_KEY, type Locale } from "@/i18n/settings";

const LANGUAGES: { code: Locale; name: string; flag: string }[] = [
  { code: "fr", name: "français", flag: "🇫🇷" },
  { code: "en", name: "english", flag: "🇬🇧" },
];

interface LanguageSwitcherProps {
  collapsed?: boolean;
  variant?: "sidebar" | "standalone" | "login";
}

export function LanguageSwitcher({ collapsed = false, variant = "sidebar" }: LanguageSwitcherProps) {
  const { t, i18n: i18nInstance } = useTranslation();
  const current = (i18nInstance.language?.startsWith("en") ? "en" : "fr") as Locale;
  const active = LANGUAGES.find((l) => l.code === current) ?? LANGUAGES[0];

  function setLocale(locale: Locale) {
    void i18n.changeLanguage(locale);
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }

  const isSidebar = variant === "sidebar";
  const isLogin = variant === "login";

  const triggerClass = isLogin
    ? "inline-flex w-auto min-w-0 cursor-pointer items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-sm text-white backdrop-blur-sm transition hover:bg-white/15"
    : [
        "lang-picker",
        isSidebar ? "lang-picker--sidebar" : "lang-picker--standalone",
        collapsed ? "lang-picker--collapsed" : "",
      ]
        .filter(Boolean)
        .join(" ");

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className={triggerClass} aria-label={t("common.selectLanguage")}>
        <Flex align="center" gap="2" style={{ width: isLogin ? "auto" : "100%" }}>
          <span aria-hidden>{active.flag}</span>
          {!collapsed && (
            <>
              <span className={isLogin ? "text-sm lowercase text-white" : "lang-picker__name"}>
                {active.name}
              </span>
              <ChevronUpIcon
                className={isLogin ? "text-white/70" : "lang-picker__chevron"}
                width={16}
                height={16}
              />
            </>
          )}
        </Flex>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content
        className="lang-picker-popup"
        side={isSidebar ? "top" : "bottom"}
        align={isSidebar ? "start" : isLogin ? "start" : "end"}
        sideOffset={8}
      >
        <div className="lang-picker-popup__title">{t("common.language")}</div>
        {LANGUAGES.map(({ code, name, flag }) => (
          <DropdownMenu.Item
            key={code}
            className={`lang-picker-item${current === code ? " lang-picker-item--active" : ""}`}
            onSelect={() => setLocale(code)}
          >
            <Flex align="center" gap="2" style={{ width: "100%" }}>
              <span className="lang-picker-item__flag" aria-hidden>
                {flag}
              </span>
              <span className="lang-picker-item__name">{name}</span>
              {current === code && (
                <span className="lang-picker-item__check" aria-hidden>
                  ✓
                </span>
              )}
            </Flex>
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
