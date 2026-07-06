"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CheckCircledIcon, CircleIcon, EyeClosedIcon, EyeOpenIcon, LockClosedIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/components/AuthProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ApiError, changePassword } from "@/lib/api";
import { saveAuth, getRefreshToken, getAccessToken } from "@/lib/auth-storage";

const fieldClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 pr-16 text-sm text-gray-800 transition placeholder:text-gray-400 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15";

function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  onToggleShow,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggleShow: () => void;
  autoComplete: string;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700">
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
          className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-xs text-gray-500 hover:text-[#2563EB]"
        >
          {show ? <EyeOpenIcon width={14} height={14} /> : <EyeClosedIcon width={14} height={14} />}
          {show ? t("changePassword.hidePassword") : t("changePassword.showPassword")}
        </button>
      </div>
    </div>
  );
}

function RequirementRow({ met, label }: { met: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-1.5 text-xs transition ${met ? "text-emerald-600" : "text-gray-400"}`}>
      {met ? <CheckCircledIcon width={14} height={14} /> : <CircleIcon width={14} height={14} />}
      {label}
    </li>
  );
}

export default function ChangePasswordPage() {
  const { t } = useTranslation();
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();
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
      return;
    }
    if (!user.mustChangePassword) {
      router.replace("/dashboard");
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

  if (!user || !user.mustChangePassword) return null;

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
      const profile = await changePassword(currentPassword, newPassword);
      const accessToken = getAccessToken();
      const refreshToken = getRefreshToken();
      if (accessToken && refreshToken) {
        saveAuth({ accessToken, refreshToken, user: profile });
      }
      await refreshUser();
      router.replace("/dashboard");
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
    <div className="relative flex min-h-screen items-center justify-center bg-[#F3F4F6] px-4 py-10 sm:px-6">
      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <LanguageSwitcher variant="standalone" />
      </div>

      <div className="flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-lg md:min-h-[34rem] md:flex-row">
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
            <div className="mb-4 inline-flex size-10 items-center justify-center rounded-full bg-blue-50 text-[#2563EB]">
              <LockClosedIcon width={20} height={20} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">{t("changePassword.title")}</h2>
            <p className="mt-1.5 mb-6 text-sm text-gray-500">{t("changePassword.subtitle")}</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <PasswordField
                id="cp-current"
                label={t("changePassword.current")}
                value={currentPassword}
                onChange={setCurrentPassword}
                show={showCurrent}
                onToggleShow={() => setShowCurrent((v) => !v)}
                autoComplete="current-password"
              />

              <PasswordField
                id="cp-new"
                label={t("changePassword.new")}
                value={newPassword}
                onChange={setNewPassword}
                show={showNew}
                onToggleShow={() => setShowNew((v) => !v)}
                autoComplete="new-password"
              />

              {(newPassword.length > 0 || confirmPassword.length > 0) && (
                <ul className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-lg bg-gray-50 p-3">
                  <RequirementRow met={requirements.length} label={t("changePassword.requirementLength")} />
                  <RequirementRow met={requirements.uppercase} label={t("changePassword.requirementUppercase")} />
                  <RequirementRow met={requirements.digit} label={t("changePassword.requirementDigit")} />
                  <RequirementRow met={requirements.special} label={t("changePassword.requirementSpecial")} />
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
              />

              {error && (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || !requirementsMet || !requirements.match}
                className="mt-2 w-full rounded-lg bg-[#2563EB] py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? t("changePassword.submitting") : t("changePassword.submit")}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
              <span>{t("changePassword.logoutHint")}</span>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="font-medium text-[#2563EB] hover:underline disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t("changePassword.logout")}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
