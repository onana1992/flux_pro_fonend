"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  CheckCircledIcon,
  CircleIcon,
  EyeClosedIcon,
  EyeOpenIcon,
  LockClosedIcon,
  MoonIcon,
  SunIcon,
} from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/components/AuthProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useThemeAppearance } from "@/components/ThemeToggle";
import { ApiError, changePassword } from "@/lib/api";

function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  onToggleShow,
  autoComplete,
  dark,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggleShow: () => void;
  autoComplete: string;
  dark: boolean;
}) {
  const { t } = useTranslation();
  const fieldClass = [
    "w-full rounded-lg border px-3.5 py-2.5 pr-16 text-sm transition focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15",
    dark
      ? "border-gray-700 bg-gray-950 text-gray-100 placeholder:text-gray-500"
      : "border-gray-200 bg-white text-gray-800 placeholder:text-gray-400",
  ].join(" ");

  return (
    <div>
      <label
        htmlFor={id}
        className={`mb-1.5 block text-sm font-medium ${dark ? "text-gray-300" : "text-gray-700"}`}
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          required
          autoComplete={autoComplete}
          placeholder="••••••••"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={fieldClass}
        />
        <button
          type="button"
          onClick={onToggleShow}
          className={[
            "absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-xs hover:text-[#2563EB]",
            dark ? "text-gray-400" : "text-gray-500",
          ].join(" ")}
        >
          {show ? <EyeOpenIcon width={14} height={14} /> : <EyeClosedIcon width={14} height={14} />}
          {show ? t("changePassword.hidePassword") : t("changePassword.showPassword")}
        </button>
      </div>
    </div>
  );
}

function RequirementRow({ met, label, dark }: { met: boolean; label: string; dark: boolean }) {
  return (
    <li
      className={`flex items-center gap-1.5 text-xs transition ${
        met ? "text-emerald-600" : dark ? "text-gray-500" : "text-gray-400"
      }`}
    >
      {met ? <CheckCircledIcon width={14} height={14} /> : <CircleIcon width={14} height={14} />}
      {label}
    </li>
  );
}

export default function ChangePasswordPage() {
  const { t } = useTranslation();
  const { user, logout, applySession } = useAuth();
  const { appearance, toggleAppearance } = useThemeAppearance();
  const router = useRouter();
  const dark = appearance === "dark";
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
    }
  }, [user, router]);

  const requirements = useMemo(
    () => ({
      length: newPassword.length >= 8,
      uppercase: /[A-Z]/.test(newPassword),
      digit: /\d/.test(newPassword),
      special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword),
      match: newPassword.length > 0 && newPassword === confirmPassword,
    }),
    [newPassword, confirmPassword],
  );

  const requirementsMet = requirements.length && requirements.uppercase && requirements.digit && requirements.special;
  const forced = Boolean(user?.mustChangePassword);

  if (!user) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError(t("changePassword.mismatch"));
      return;
    }
    if (currentPassword === newPassword) {
      setError(t("changePassword.samePassword"));
      return;
    }
    setSubmitting(true);
    try {
      const tokens = await changePassword(currentPassword, newPassword);
      applySession(tokens.user);
      router.replace(forced ? "/dashboard" : "/profile");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.connectionFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      router.replace("/login");
    } finally {
      setLoggingOut(false);
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
          "flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border shadow-lg md:min-h-[34rem] md:flex-row",
          dark ? "border-gray-800 bg-gray-900" : "border-gray-200/80 bg-white",
        ].join(" ")}
      >
        {/* Branding */}
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
              {t("changePassword.heroTitle")}
            </h1>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-blue-100/90">
              {t("changePassword.heroSubtitle")}
            </p>
          </div>
        </aside>

        {/* Formulaire */}
        <main className="flex flex-1 items-center px-8 py-10 sm:px-10 md:py-12">
          <div className="mx-auto w-full max-w-xs sm:max-w-sm">
            <div
              className={[
                "mb-4 inline-flex size-10 items-center justify-center rounded-full text-[#2563EB]",
                dark ? "bg-blue-950" : "bg-blue-50",
              ].join(" ")}
            >
              <LockClosedIcon width={20} height={20} />
            </div>
            <h2 className={`text-xl font-semibold ${dark ? "text-gray-100" : "text-gray-900"}`}>
              {t("changePassword.title")}
            </h2>
            <p className={`mt-1.5 mb-6 text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
              {t("changePassword.subtitle")}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <PasswordField
                id="cp-current"
                label={t("changePassword.current")}
                value={currentPassword}
                onChange={setCurrentPassword}
                show={showCurrent}
                onToggleShow={() => setShowCurrent((v) => !v)}
                autoComplete="current-password"
                dark={dark}
              />

              <PasswordField
                id="cp-new"
                label={t("changePassword.new")}
                value={newPassword}
                onChange={setNewPassword}
                show={showNew}
                onToggleShow={() => setShowNew((v) => !v)}
                autoComplete="new-password"
                dark={dark}
              />

              {(newPassword.length > 0 || confirmPassword.length > 0) && (
                <ul
                  className={[
                    "grid grid-cols-2 gap-x-3 gap-y-1 rounded-lg p-3",
                    dark ? "bg-gray-950" : "bg-gray-50",
                  ].join(" ")}
                >
                  <RequirementRow
                    met={requirements.length}
                    label={t("changePassword.requirementLength")}
                    dark={dark}
                  />
                  <RequirementRow
                    met={requirements.uppercase}
                    label={t("changePassword.requirementUppercase")}
                    dark={dark}
                  />
                  <RequirementRow
                    met={requirements.digit}
                    label={t("changePassword.requirementDigit")}
                    dark={dark}
                  />
                  <RequirementRow
                    met={requirements.special}
                    label={t("changePassword.requirementSpecial")}
                    dark={dark}
                  />
                </ul>
              )}

              <PasswordField
                id="cp-confirm"
                label={t("changePassword.confirm")}
                value={confirmPassword}
                onChange={setConfirmPassword}
                show={showConfirm}
                onToggleShow={() => setShowConfirm((v) => !v)}
                autoComplete="new-password"
                dark={dark}
              />

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
                disabled={submitting || !requirementsMet || !requirements.match}
                className={[
                  "mt-2 w-full rounded-lg bg-[#2563EB] py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 disabled:cursor-not-allowed disabled:opacity-60",
                  dark ? "focus:ring-offset-gray-900" : "focus:ring-offset-2",
                ].join(" ")}
              >
                {submitting ? t("changePassword.submitting") : t("changePassword.submit")}
              </button>
            </form>

            <div className={`mt-6 flex items-center justify-center gap-2 text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>
              {forced ? (
                <>
                  <span>{t("changePassword.logoutHint")}</span>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="font-medium text-[#2563EB] hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {t("changePassword.logout")}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push("/profile")}
                  className="font-medium text-[#2563EB] hover:underline"
                >
                  {t("profile.myProfile")}
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
