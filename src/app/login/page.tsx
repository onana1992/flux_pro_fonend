"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { EyeClosedIcon, EyeOpenIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/components/AuthProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ApiError } from "@/lib/api";

const fieldClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 transition placeholder:text-gray-400 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15";

export default function LoginPage() {
  const { t } = useTranslation();
  const { login, user } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("e.fotso@mintp.cm");
  const [password, setPassword] = useState("Mintp@2025");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  if (user) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const profile = await login(email, password);
      router.replace(profile.mustChangePassword ? "/change-password" : "/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.connectionFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#F3F4F6] px-4 py-10 sm:px-6">
      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <LanguageSwitcher variant="standalone" />
      </div>

      <div className="flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-lg md:min-h-[30rem] md:flex-row">
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
              {t("login.clientBadge")}
            </p>
          </div>
        </aside>

        {/* Formulaire */}
        <main className="flex flex-1 items-center px-8 py-10 sm:px-10 md:py-12">
          <div className="mx-auto w-full max-w-xs sm:max-w-sm">
            <h2 className="text-xl font-semibold text-gray-900">{t("login.title")}</h2>
            <p className="mt-1.5 mb-7 text-sm text-gray-500">{t("login.welcomeHint")}</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-gray-700">
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
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="login-password" className="text-sm font-medium text-gray-700">
                    {t("login.password")}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#2563EB]"
                  >
                    {showPassword ? <EyeOpenIcon width={14} height={14} /> : <EyeClosedIcon width={14} height={14} />}
                    {showPassword ? t("login.hidePassword") : t("login.showPassword")}
                  </button>
                </div>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={fieldClass}
                />
              </div>

              <label className="flex cursor-pointer items-center gap-2 pt-1 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="size-4 rounded border-gray-300 text-[#2563EB] focus:ring-[#2563EB]/20"
                />
                {t("login.rememberMe")}
              </label>

              {error && (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 w-full rounded-lg bg-[#2563EB] py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? t("login.submitting") : t("login.submit")}
              </button>
            </form>

            <p className="mt-6 text-center text-[11px] text-gray-400">{t("login.poweredBy")}</p>
          </div>
        </main>
      </div>
    </div>
  );
}
