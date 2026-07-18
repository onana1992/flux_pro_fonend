"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Popover } from "@radix-ui/themes";
import {
  BellIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import {
  ApiError,
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api";
import type { AlertResponse } from "@/lib/types";
import { useThemeAppearance } from "@/components/ThemeToggle";

const POLL_INTERVAL_MS = 30_000;

function formatRelativeTime(iso?: string | null): string {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `il y a ${diffHours} h`;
  const diffDays = Math.round(diffHours / 24);
  return `il y a ${diffDays} j`;
}

function isOverdueType(code: string) {
  return code === "OVERDUE" || code === "ESCALATION";
}

function NotificationRow({
  alert,
  onRead,
  dark,
}: {
  alert: AlertResponse;
  onRead: (alert: AlertResponse) => void;
  dark: boolean;
}) {
  const isUnread = !alert.readAt;
  const overdue = isOverdueType(alert.alertTypeCode);

  return (
    <button
      type="button"
      onClick={() => onRead(alert)}
      className={[
        "grid w-full grid-cols-[2rem_minmax(0,1fr)_auto] items-start gap-x-3 border-b px-4 py-3.5 text-left transition-colors last:border-b-0",
        dark ? "border-gray-800" : "border-gray-100",
        isUnread
          ? dark
            ? "bg-orange-950/40 hover:bg-orange-950/55"
            : "bg-orange-50/70 hover:bg-orange-50"
          : dark
            ? "bg-gray-900 hover:bg-gray-800/80"
            : "bg-white hover:bg-gray-50",
      ].join(" ")}
    >
      <span
        className={[
          "mt-0.5 grid size-8 place-items-center rounded-lg",
          overdue
            ? dark
              ? "bg-orange-950 text-orange-400"
              : "bg-orange-100 text-orange-600"
            : dark
              ? "bg-blue-950 text-blue-400"
              : "bg-blue-50 text-blue-600",
        ].join(" ")}
      >
        {overdue ? (
          <ExclamationTriangleIcon width={15} height={15} />
        ) : (
          <ClockIcon width={15} height={15} />
        )}
      </span>

      <span className="min-w-0">
        <span className="flex items-baseline justify-between gap-3">
          <span
            className={`text-[13px] leading-snug ${dark ? "text-gray-100" : "text-gray-900"} ${isUnread ? "font-semibold" : "font-medium"}`}
          >
            {alert.alertTypeLabel || alert.message}
          </span>
          <span className={`shrink-0 text-[11px] leading-snug ${dark ? "text-gray-500" : "text-gray-400"}`}>
            {formatRelativeTime(alert.sentAt)}
          </span>
        </span>

        {alert.fileReferenceNumber && (
          <span
            className={`mt-0.5 block truncate font-mono text-xs font-medium tracking-tight ${dark ? "text-gray-200" : "text-gray-800"}`}
          >
            {alert.fileReferenceNumber}
          </span>
        )}

        {alert.stepLabel && (
          <span className={`mt-0.5 block truncate text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>
            {alert.stepLabel}
          </span>
        )}
      </span>

      {isUnread ? (
        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-orange-500" aria-hidden />
      ) : (
        <span className="size-1.5 shrink-0" aria-hidden />
      )}
    </button>
  );
}

export function NotificationBell() {
  const { t } = useTranslation();
  const router = useRouter();
  const { appearance } = useThemeAppearance();
  const dark = appearance === "dark";
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<AlertResponse[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshCount = useCallback(async () => {
    try {
      const res = await getUnreadNotificationCount();
      setUnreadCount(res.unreadCount);
    } catch {
      // silencieux
    }
  }, []);

  useEffect(() => {
    refreshCount();
    pollRef.current = setInterval(refreshCount, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [refreshCount]);

  async function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setLoading(true);
      try {
        const page = await listNotifications({ size: 10 });
        setNotifications(page.content);
      } catch (err) {
        if (!(err instanceof ApiError)) throw err;
      } finally {
        setLoading(false);
      }
    }
  }

  async function handleReadOne(alert: AlertResponse) {
    if (!alert.readAt) {
      try {
        await markNotificationRead(alert.id);
        setUnreadCount((c) => Math.max(0, c - 1));
        setNotifications((prev) =>
          prev.map((n) => (n.id === alert.id ? { ...n, readAt: new Date().toISOString() } : n)),
        );
      } catch {
        // ignore
      }
    }
    if (alert.fileId) {
      setOpen(false);
      router.push(`/files/${alert.fileId}`);
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    } catch {
      // ignore
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger>
        <button type="button" className="header-icon-btn" aria-label={t("header.notifications")}>
          <BellIcon width={20} height={20} />
          {unreadCount > 0 && <span className="header-icon-btn__badge" />}
        </button>
      </Popover.Trigger>

      <Popover.Content
        align="end"
        sideOffset={10}
        size="1"
        className={[
          "!w-[23rem] !max-w-[calc(100vw-1.25rem)] !overflow-hidden !rounded-xl !border !p-0 !shadow-xl",
          dark ? "!border-gray-700 !bg-gray-900" : "!border-gray-200 !bg-white",
        ].join(" ")}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div
          className={[
            "flex items-center justify-between gap-3 border-b px-4 py-3.5",
            dark ? "border-gray-800" : "border-gray-100",
          ].join(" ")}
        >
          <div className="flex min-w-0 items-center gap-2">
            <h2
              className={`m-0 text-[15px] font-semibold tracking-tight ${dark ? "text-gray-100" : "text-gray-900"}`}
            >
              {t("notifications.title")}
            </h2>
            {unreadCount > 0 && (
              <span
                className={[
                  "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold",
                  dark ? "bg-orange-950 text-orange-300" : "bg-orange-100 text-orange-700",
                ].join(" ")}
              >
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              title={t("notifications.markAllRead")}
              className={[
                "shrink-0 rounded-md px-1.5 py-1 text-xs font-medium",
                dark ? "text-blue-400 hover:bg-blue-950" : "text-blue-600 hover:bg-blue-50",
              ].join(" ")}
            >
              {t("notifications.markAllReadShort")}
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto overscroll-contain">
          {loading ? (
            <p className={`m-0 px-4 py-10 text-center text-sm ${dark ? "text-gray-500" : "text-gray-400"}`}>
              {t("notifications.loading")}
            </p>
          ) : notifications.length === 0 ? (
            <div className={`flex flex-col items-center gap-2 px-4 py-10 ${dark ? "text-gray-500" : "text-gray-400"}`}>
              <BellIcon width={22} height={22} />
              <p className={`m-0 text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>{t("notifications.empty")}</p>
            </div>
          ) : (
            notifications.map((alert) => (
              <NotificationRow key={alert.id} alert={alert} onRead={handleReadOne} dark={dark} />
            ))
          )}
        </div>

        <div
          className={[
            "border-t p-1.5",
            dark ? "border-gray-800 bg-gray-950/80" : "border-gray-100 bg-gray-50/80",
          ].join(" ")}
        >
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className={[
              "block rounded-lg px-3 py-2.5 text-center text-[13px] font-medium no-underline",
              dark
                ? "text-gray-400 hover:bg-gray-900 hover:text-gray-100"
                : "text-gray-600 hover:bg-white hover:text-gray-900",
            ].join(" ")}
          >
            {t("notifications.viewAll")}
          </Link>
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}
