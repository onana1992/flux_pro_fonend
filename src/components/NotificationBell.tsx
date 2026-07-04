"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Box, DropdownMenu, Flex, Separator, Text } from "@radix-ui/themes";
import { BellIcon, CheckIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import {
  ApiError,
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api";
import type { AlertResponse } from "@/lib/types";

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

function NotificationRow({
  alert,
  onRead,
}: {
  alert: AlertResponse;
  onRead: (alert: AlertResponse) => void;
}) {
  const isUnread = !alert.readAt;
  return (
    <DropdownMenu.Item
      className="user-menu-item"
      style={{ alignItems: "flex-start", whiteSpace: "normal", height: "auto", paddingBlock: 8 }}
      onSelect={() => onRead(alert)}
    >
      <span className="user-menu-item__icon" style={{ marginTop: 2 }}>
        <ExclamationTriangleIcon color={isUnread ? "var(--orange-9)" : "var(--gray-8)"} />
      </span>
      <Flex direction="column" gap="0" style={{ minWidth: 0 }}>
        <Text size="2" weight={isUnread ? "bold" : "regular"} style={{ wordBreak: "break-word" }}>
          {alert.message}
        </Text>
        <Text size="1" color="gray">
          {formatRelativeTime(alert.sentAt)}
        </Text>
      </Flex>
    </DropdownMenu.Item>
  );
}

export function NotificationBell() {
  const { t } = useTranslation();
  const router = useRouter();
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
      // silencieux : l'absence de badge n'est pas bloquante
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
    <DropdownMenu.Root open={open} onOpenChange={handleOpenChange}>
      <DropdownMenu.Trigger>
        <button type="button" className="header-icon-btn" aria-label={t("header.notifications")}>
          <BellIcon width={20} height={20} />
          {unreadCount > 0 && <span className="header-icon-btn__badge" />}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content align="end" sideOffset={12} className="user-menu-popup" style={{ minWidth: 340 }}>
        <Flex align="center" justify="between" className="user-menu-header" style={{ paddingBottom: 8 }}>
          <Text as="p" weight="medium" className="user-menu-header__name">
            {t("notifications.title")}
            {unreadCount > 0 && (
              <Badge ml="2" color="orange" variant="soft" size="1">
                {t("notifications.unreadCount", { count: unreadCount })}
              </Badge>
            )}
          </Text>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                color: "var(--accent-11)",
                fontSize: 12,
              }}
            >
              <CheckIcon width={12} height={12} />
              {t("notifications.markAllRead")}
            </button>
          )}
        </Flex>

        <Separator size="4" className="user-menu-divider" />

        <Box className="user-menu-items" style={{ maxHeight: 360, overflowY: "auto" }}>
          {loading ? (
            <Box p="3">
              <Text size="2" color="gray">
                {t("notifications.loading")}
              </Text>
            </Box>
          ) : notifications.length === 0 ? (
            <Box p="3">
              <Text size="2" color="gray">
                {t("notifications.empty")}
              </Text>
            </Box>
          ) : (
            notifications.map((alert) => (
              <NotificationRow key={alert.id} alert={alert} onRead={handleReadOne} />
            ))
          )}
        </Box>

        <Separator size="4" className="user-menu-divider" />

        <Box className="user-menu-items">
          <DropdownMenu.Item className="user-menu-item" asChild>
            <Link href="/notifications" style={{ justifyContent: "center", width: "100%" }}>
              <span className="user-menu-item__label">{t("notifications.viewAll")}</span>
            </Link>
          </DropdownMenu.Item>
        </Box>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
