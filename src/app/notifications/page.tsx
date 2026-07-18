"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Box, Button, Card, Flex, SegmentedControl, Text } from "@radix-ui/themes";
import {
  BellIcon,
  CheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import {
  ApiError,
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api";
import { formatBusinessDateTime } from "@/lib/datetime";
import type { AlertResponse } from "@/lib/types";
import { LoadingBlock, PageHeader, PaginationBar, StatusAlert } from "@/components/ui/shared";

function formatRelativeTime(iso: string | null | undefined, locale: string): string {
  if (!iso) return "—";
  const diffSec = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(-diffSec, "second");
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return rtf.format(-diffMin, "minute");
  const diffHours = Math.round(diffMin / 60);
  if (Math.abs(diffHours) < 24) return rtf.format(-diffHours, "hour");
  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 30) return rtf.format(-diffDays, "day");
  return formatBusinessDateTime(iso, locale, { dateStyle: "medium", timeStyle: "short" });
}

function isOverdueType(code: string) {
  return code === "OVERDUE" || code === "ESCALATION";
}

function statusColor(status: AlertResponse["status"]): "gray" | "blue" | "green" | "red" | "orange" {
  switch (status) {
    case "SENT":
      return "blue";
    case "READ":
      return "green";
    case "FAILED":
      return "red";
    case "PENDING":
      return "orange";
    default:
      return "gray";
  }
}

function NotificationItem({
  alert,
  onRead,
  isLast,
}: {
  alert: AlertResponse;
  onRead: (alert: AlertResponse) => void;
  isLast?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const isUnread = !alert.readAt;
  const overdue = isOverdueType(alert.alertTypeCode);
  const title = alert.alertTypeLabel || alert.message;
  const clickable = Boolean(alert.fileId || isUnread);

  return (
    <button
      type="button"
      onClick={() => {
        if (clickable) onRead(alert);
      }}
      style={{
        display: "block",
        width: "100%",
        padding: "1rem 1.25rem",
        border: "none",
        borderBottom: isLast ? "none" : "1px solid var(--gray-a4)",
        textAlign: "left",
        cursor: clickable ? "pointer" : "default",
        background: isUnread ? "rgba(255, 247, 237, 0.7)" : "transparent",
      }}
    >
      <Flex align="start" gap="3">
        <Flex
          align="center"
          justify="center"
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            flexShrink: 0,
            background: overdue ? "#ffedd5" : "#dbeafe",
            color: overdue ? "#ea580c" : "#2563eb",
          }}
        >
          {overdue ? (
            <ExclamationTriangleIcon width={18} height={18} />
          ) : (
            <ClockIcon width={18} height={18} />
          )}
        </Flex>

        <Box style={{ flex: 1, minWidth: 0 }}>
          <Flex justify="between" align="start" gap="3" wrap="wrap">
            <Text size="3" weight={isUnread ? "bold" : "medium"} style={{ lineHeight: 1.35 }}>
              {title}
            </Text>
            <Text size="1" color="gray" style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
              {formatRelativeTime(alert.sentAt, i18n.language)}
            </Text>
          </Flex>

          {alert.fileReferenceNumber && (
            <Text
              as="div"
              size="2"
              weight="medium"
              mt="1"
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                letterSpacing: "-0.01em",
              }}
            >
              {alert.fileReferenceNumber}
            </Text>
          )}

          <Flex gap="2" wrap="wrap" mt="2" align="center">
            {alert.stepLabel && (
              <Text size="1" color="gray">
                {alert.stepLabel}
              </Text>
            )}
            {alert.escalationLevel != null && alert.escalationLevel > 0 && (
              <Badge size="1" color="orange" variant="soft">
                {t("notifications.escalationLevel", { level: alert.escalationLevel })}
              </Badge>
            )}
            <Badge size="1" color="gray" variant="soft">
              {alert.channel}
            </Badge>
            <Badge size="1" color={statusColor(alert.status)} variant="soft">
              {t(`notifications.statusValues.${alert.status}`)}
            </Badge>
          </Flex>
        </Box>

        <Box
          style={{
            width: 8,
            height: 8,
            marginTop: 8,
            borderRadius: 999,
            flexShrink: 0,
            background: isUnread ? "#f97316" : "transparent",
          }}
          aria-hidden={!isUnread}
          aria-label={isUnread ? t("notifications.unread") : undefined}
        />
      </Flex>
    </button>
  );
}

export default function NotificationsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [notifications, setNotifications] = useState<AlertResponse[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, unread] = await Promise.all([
        listNotifications({ page, size: pageSize, unreadOnly }),
        getUnreadNotificationCount(),
      ]);
      setNotifications(res.content);
      setTotalPages(res.totalPages);
      setTotalElements(res.totalElements);
      setUnreadCount(unread.unreadCount);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [page, unreadOnly, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleMarkRead(alert: AlertResponse) {
    if (!alert.readAt) {
      try {
        await markNotificationRead(alert.id);
        setUnreadCount((c) => Math.max(0, c - 1));
        setNotifications((prev) =>
          prev.map((n) => (n.id === alert.id ? { ...n, readAt: new Date().toISOString() } : n)),
        );
      } catch (err) {
        setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
        return;
      }
    }
    if (alert.fileId) {
      router.push(`/files/${alert.fileId}`);
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead();
      setUnreadCount(0);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    }
  }

  return (
    <RequireAuth>
      <AppShell>
        <PageHeader
          title={t("notifications.title")}
          description={t("notifications.description")}
          actions={
            unreadCount > 0 ? (
              <Button variant="soft" onClick={handleMarkAllRead}>
                <CheckIcon /> {t("notifications.markAllRead")}
              </Button>
            ) : undefined
          }
        />

        {error && <StatusAlert message={error} variant="error" />}

        <Flex align="center" justify="between" gap="3" wrap="wrap" mb="4">
          <SegmentedControl.Root
            value={unreadOnly ? "unread" : "all"}
            onValueChange={(value) => {
              setPage(0);
              setUnreadOnly(value === "unread");
            }}
          >
            <SegmentedControl.Item value="all">{t("notifications.all")}</SegmentedControl.Item>
            <SegmentedControl.Item value="unread">
              {t("notifications.unreadOnly")}
              {unreadCount > 0 ? ` (${unreadCount})` : ""}
            </SegmentedControl.Item>
          </SegmentedControl.Root>

          {!loading && (
            <Text size="2" color="gray">
              {unreadOnly
                ? t("notifications.unreadCount", { count: totalElements })
                : t("notifications.totalCount", { count: totalElements })}
            </Text>
          )}
        </Flex>

        <Card size="2" style={{ padding: 0, overflow: "hidden" }}>
          {loading ? (
            <Box p="6">
              <LoadingBlock message={t("notifications.loading")} />
            </Box>
          ) : notifications.length === 0 ? (
            <Flex direction="column" align="center" gap="2" py="9" px="4">
              <Flex
                align="center"
                justify="center"
                mb="2"
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: "var(--gray-a3)",
                  color: "var(--gray-9)",
                }}
              >
                <BellIcon width={28} height={28} />
              </Flex>
              <Text size="3" weight="medium">
                {unreadOnly ? t("notifications.emptyUnread") : t("notifications.empty")}
              </Text>
              <Text size="2" color="gray" align="center" style={{ maxWidth: 320 }}>
                {unreadOnly
                  ? t("notifications.emptyUnreadDescription")
                  : t("notifications.emptyDescription")}
              </Text>
            </Flex>
          ) : (
            <Box>
              {notifications.map((alert, index) => (
                <NotificationItem
                  key={alert.id}
                  alert={alert}
                  onRead={handleMarkRead}
                  isLast={index === notifications.length - 1}
                />
              ))}
            </Box>
          )}

          {!loading && notifications.length > 0 && (
            <Box px="4" style={{ borderTop: "1px solid var(--gray-a4)" }}>
              <PaginationBar
                page={page}
                totalPages={totalPages}
                totalElements={totalElements}
                pageSize={pageSize}
                onPageChange={setPage}
              />
            </Box>
          )}
        </Card>
      </AppShell>
    </RequireAuth>
  );
}
