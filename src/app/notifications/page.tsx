"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Flex, Text } from "@radix-ui/themes";
import { CheckIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import {
  ApiError,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api";
import type { AlertResponse } from "@/lib/types";
import { EmptyBlock, LoadingBlock, PageHeader, PaginationBar, StatusAlert } from "@/components/ui/shared";

function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function alertStatusColor(status: AlertResponse["status"]): "gray" | "blue" | "green" | "red" {
  switch (status) {
    case "SENT":
      return "blue";
    case "READ":
      return "green";
    case "FAILED":
      return "red";
    default:
      return "gray";
  }
}

export default function NotificationsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [notifications, setNotifications] = useState<AlertResponse[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listNotifications({ page, size: pageSize, unreadOnly });
      setNotifications(res.content);
      setTotalPages(res.totalPages);
      setTotalElements(res.totalElements);
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
            <Flex gap="2" wrap="wrap">
              <Button
                variant={unreadOnly ? "solid" : "soft"}
                onClick={() => {
                  setPage(0);
                  setUnreadOnly((v) => !v);
                }}
              >
                {unreadOnly ? t("notifications.unreadOnly") : t("notifications.all")}
              </Button>
              <Button variant="soft" onClick={handleMarkAllRead}>
                <CheckIcon /> {t("notifications.markAllRead")}
              </Button>
            </Flex>
          }
        />

        {error && <StatusAlert message={error} variant="error" />}

        <Card size="3">
          {loading ? (
            <LoadingBlock message={t("notifications.loading")} />
          ) : notifications.length === 0 ? (
            <EmptyBlock title={t("notifications.empty")} />
          ) : (
            <Flex direction="column" gap="2">
              {notifications.map((alert) => (
                <Flex
                  key={alert.id}
                  direction="column"
                  gap="1"
                  p="3"
                  onClick={() => handleMarkRead(alert)}
                  style={{
                    borderRadius: "var(--radius-2)",
                    background: alert.readAt ? "var(--gray-a2)" : "var(--accent-a2)",
                    border: "1px solid var(--gray-a4)",
                    cursor: alert.fileId || !alert.readAt ? "pointer" : "default",
                  }}
                >
                  <Flex justify="between" align="center" gap="2" wrap="wrap">
                    <Text size="2" weight={alert.readAt ? "regular" : "bold"}>
                      {alert.message}
                    </Text>
                    <Badge size="1" color={alertStatusColor(alert.status)} variant="soft">
                      {t(`notifications.statusValues.${alert.status}`)}
                    </Badge>
                  </Flex>
                  <Text size="1" color="gray">
                    {alert.fileReferenceNumber ? `${alert.fileReferenceNumber} · ` : ""}
                    {alert.channel} · {formatDateTime(alert.sentAt)}
                  </Text>
                </Flex>
              ))}
            </Flex>
          )}

          {!loading && notifications.length > 0 && (
            <PaginationBar
              page={page}
              totalPages={totalPages}
              totalElements={totalElements}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          )}
        </Card>
      </AppShell>
    </RequireAuth>
  );
}
