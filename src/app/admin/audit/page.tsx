"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Card, Flex, Select, Table, Text, TextField } from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { ApiError, getLoginAudit } from "@/lib/api";
import type { LoginAuditEntry } from "@/lib/types";
import {
  EmptyBlock,
  LoadingBlock,
  PageHeader,
  PaginationBar,
  StatusAlert,
} from "@/components/ui/shared";

export default function AdminAuditPage() {
  const { t, i18n } = useTranslation();
  const [entries, setEntries] = useState<LoginAuditEntry[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const locale = i18n.language?.startsWith("en") ? "en-GB" : "fr-FR";

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString(locale, { timeZone: "Africa/Douala" });
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getLoginAudit({
        page,
        email: email || undefined,
        success: success === "all" ? undefined : success === "true",
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to).toISOString() : undefined,
      });
      setEntries(res.content);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [page, email, success, from, to, t]);

  useEffect(() => {
    load();
  }, [load]);

  const successCount = entries.filter((e) => e.success).length;
  const failCount = entries.filter((e) => !e.success).length;

  return (
    <RequireAuth superAdmin>
      <AppShell>
        <PageHeader
          title={t("admin.audit.title")}
          description={t("admin.audit.description")}
        />

        {error && <StatusAlert message={error} variant="error" />}

        <Card size="2" mb="4">
          <Flex gap="3" wrap="wrap">
            <TextField.Root
              placeholder={t("admin.audit.email")}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setPage(0);
              }}
              style={{ minWidth: 200, flex: 1 }}
            />
            <Select.Root
              value={success}
              onValueChange={(v) => {
                setSuccess(v);
                setPage(0);
              }}
            >
              <Select.Trigger style={{ minWidth: 160 }} />
              <Select.Content>
                <Select.Item value="all">{t("admin.audit.allResults")}</Select.Item>
                <Select.Item value="true">{t("admin.audit.successResult")}</Select.Item>
                <Select.Item value="false">{t("admin.audit.failResult")}</Select.Item>
              </Select.Content>
            </Select.Root>
            <TextField.Root
              type="datetime-local"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(0);
              }}
            />
            <TextField.Root
              type="datetime-local"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(0);
              }}
            />
          </Flex>
        </Card>

        {!loading && entries.length > 0 && (
          <Flex gap="3" mb="4" wrap="wrap">
            <Card size="1">
              <Flex align="center" gap="2">
                <Badge color="green" variant="solid" radius="full" style={{ width: 8, height: 8, padding: 0 }} />
                <Text size="2">
                  {t("admin.audit.success")} : <Text weight="bold">{successCount}</Text>
                </Text>
              </Flex>
            </Card>
            <Card size="1">
              <Flex align="center" gap="2">
                <Badge color="red" variant="solid" radius="full" style={{ width: 8, height: 8, padding: 0 }} />
                <Text size="2">
                  {t("admin.audit.failed")} : <Text weight="bold">{failCount}</Text>
                </Text>
              </Flex>
            </Card>
          </Flex>
        )}

        <Card size="3">
          {loading ? (
            <LoadingBlock message={t("admin.audit.loading")} />
          ) : entries.length === 0 ? (
            <EmptyBlock
              title={t("admin.audit.emptyTitle")}
              description={t("admin.audit.emptyDescription")}
            />
          ) : (
            <>
              <Table.Root variant="surface">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>{t("admin.audit.dateTime")}</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>{t("admin.audit.email")}</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>{t("admin.audit.result")}</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>{t("admin.audit.ip")}</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>{t("admin.audit.failReason")}</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {entries.map((e) => (
                    <Table.Row key={e.id}>
                      <Table.Cell>
                        <Text size="2" style={{ whiteSpace: "nowrap" }}>
                          {formatDate(e.createdAt)}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text weight="medium">{e.email}</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge color={e.success ? "green" : "red"} variant="soft">
                          {e.success ? t("admin.audit.successResult") : t("admin.audit.failResult")}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <Text size="1" style={{ fontFamily: "monospace" }}>
                          {e.ipAddress ?? "—"}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text size="1" color="gray">
                          {e.failureReason ?? "—"}
                        </Text>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
              <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          )}
        </Card>
      </AppShell>
    </RequireAuth>
  );
}
