"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { EyeClosedIcon, EyeOpenIcon, MoonIcon, SunIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/components/AuthProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useThemeAppearance } from "@/components/ThemeToggle";
import { useTenant } from "@/components/TenantProvider";
import { ApiError } from "@/lib/api";
import { getRememberedEmail, hasRememberedLogin } from "@/lib/auth-storage";

export default function LoginPage() {
  const { t } = useTranslation();
  const { login, user, sessionExpired, clearSessionExpired } = useAuth();
  const { config: tenant } = useTenant();
  const { appearance, toggleAppearance } = useThemeAppearance();
  const router = useRouter();
  const dark = appearance === "dark";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showSessionExpired, setShowSessionExpired] = useState(false);

  const fieldClass = [
    "w-full rounded-lg border px-3.5 py-2.5 text-sm transition focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15",
    dark
      ? "border-gray-700 bg-gray-950 text-gray-100 placeholder:text-gray-500"
      : "border-gray-200 bg-white text-gray-800 placeholder:text-gray-400",
  ].join(" ");
  const passwordFieldClass = `${fieldClass} pr-16`;

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  useEffect(() => {
    const remembered = getRememberedEmail();
    if (remembered && hasRememberedLogin()) {
      setEmail(remembered);
      setRemember(true);
    }
  }, []);

  // Capture le flag dans un état local dès son apparition, puis le réinitialise
  // dans le contexte pour qu'il ne réapparaisse pas lors d'une déconnexion normale.
  useEffect(() => {
    if (sessionExpired) {
      setShowSessionExpired(true);
      clearSessionExpired();
    }
  }, [sessionExpired, clearSessionExpired]);

  if (user) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setShowSessionExpired(false);
    setSubmitting(true);
    try {
      const profile = await login(email, password, remember);
      router.replace(profile.mustChangePassword ? "/change-password" : "/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.connectionFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className={[
        "relative flex min-h-screen items-center justify-center px-4 py-10 sm:px-6",
        dark ? "bg-gray-950" : "bg-[#F3F4F6]",
      ].join(" ")}
    >
      <div className="absolute right-4 top-4 z-20 flex items-center gap-2 sm:right-6 sm:top-6">
        <button
          type="button"
          className="header-icon-btn"
          aria-label={appearance === "light" ? t("header.darkMode") : t("header.lightMode")}
          onClick={toggleAppearance}
        >
          {appearance === "light" ? (
            <MoonIcon width={20} height={20} />
          ) : (
            <SunIcon width={20} height={20} />
          )}
        </button>
        <LanguageSwitcher variant="standalone" />
      </div>

      <div
        className={[
          "flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border shadow-lg md:min-h-[30rem] md:flex-row",
          dark ? "border-gray-800 bg-gray-900" : "border-gray-200/80 bg-white",
        ].join(" ")}
      >
        {/* Branding — produit générique */}
        <aside className="relative flex flex-col justify-center overflow-hidden bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] px-8 py-10 text-white md:w-[44%] md:px-10 md:py-12">
          <div className="pointer-events-none absolute -right-16 top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-blue-300/20 blur-2xl" aria-hidden />

          <div className="relative z-10">
            <div className="mb-8 inline-flex rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              <Image
                src="/logo-fluxpro.png"
                alt="FluxPro"
                width={280}
                height={240}
                priority
                className="h-auto w-28 sm:w-32"
              />
            </div>
            <h1 className="text-xl font-semibold leading-snug tracking-tight sm:text-2xl">
              {t("login.heroTitle")}
            </h1>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-blue-100/90">{t("login.heroSubtitle")}</p>
            <p className="mt-8 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-medium text-blue-50">
              {tenant.badge || t("login.clientBadge")}
            </p>
          </div>
        </aside>

        {/* Formulaire */}
        <main className="flex flex-1 items-center px-8 py-10 sm:px-10 md:py-12">
          <div className="mx-auto w-full max-w-xs sm:max-w-sm">
            <h2 className={`text-xl font-semibold ${dark ? "text-gray-100" : "text-gray-900"}`}>
              {t("login.title")}
            </h2>
            <p className={`mt-1.5 mb-7 text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
              {t("login.welcomeHint")}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="login-email"
                  className={`mb-1.5 block text-sm font-medium ${dark ? "text-gray-300" : "text-gray-700"}`}
                >
                  {t("login.email")}
                </label>
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder={t("login.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={fieldClass}
                />
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className={`mb-1.5 block text-sm font-medium ${dark ? "text-gray-300" : "text-gray-700"}`}
                >
                  {t("login.password")}
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={passwordFieldClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className={[
                      "absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-xs hover:text-[#2563EB]",
                      dark ? "text-gray-400" : "text-gray-500",
                    ].join(" ")}
                  >
                    {showPassword ? <EyeOpenIcon width={14} height={14} /> : <EyeClosedIcon width={14} height={14} />}
                    {showPassword ? t("login.hidePassword") : t("login.showPassword")}
                  </button>
                </div>
              </div>

              <label
                className={[
                  "flex cursor-pointer items-center gap-2 pt-1 text-sm",
                  dark ? "text-gray-400" : "text-gray-600",
                ].join(" ")}
              >
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className={[
                    "size-4 rounded text-[#2563EB] focus:ring-[#2563EB]/20",
                    dark ? "border-gray-600 bg-gray-950" : "border-gray-300",
                  ].join(" ")}
                />
                {t("login.rememberMe")}
              </label>

              {showSessionExpired && !error && (
                <p
                  role="alert"
                  className={[
                    "rounded-lg px-3 py-2 text-sm",
                    dark ? "bg-amber-950/50 text-amber-300" : "bg-amber-50 text-amber-700",
                  ].join(" ")}
                >
                  {t("login.sessionExpired")}
                </p>
              )}

              {error && (
                <p
                  role="alert"
                  className={[
                    "rounded-lg px-3 py-2 text-sm",
                    dark ? "bg-red-950/50 text-red-300" : "bg-red-50 text-red-600",
                  ].join(" ")}
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className={[
                  "mt-2 w-full rounded-lg bg-[#2563EB] py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 disabled:cursor-not-allowed disabled:opacity-60",
                  dark ? "focus:ring-offset-gray-900" : "focus:ring-offset-2",
                ].join(" ")}
              >
                {submitting ? t("login.submitting") : t("login.submit")}
              </button>
            </form>

            <p className={`mt-6 text-center text-[11px] ${dark ? "text-gray-500" : "text-gray-400"}`}>
              {t("login.poweredBy")}
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
