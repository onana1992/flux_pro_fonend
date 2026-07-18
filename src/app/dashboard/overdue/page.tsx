"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, Table, Text } from "@radix-ui/themes";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { ApiError, getDashboardOverdueFiles } from "@/lib/api";
import type { DashboardOverdueFile } from "@/lib/types";
import { formatBusinessDate } from "@/lib/datetime";
import {
  EmptyBlock,
  LoadingBlock,
  PageHeader,
  PaginationBar,
  StatusAlert,
} from "@/components/ui/shared";

export default function DashboardOverduePage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en-GB" : "fr-FR";
  const [rows, setRows] = useState<DashboardOverdueFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await getDashboardOverdueFiles({ limit: 100 }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const totalElements = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));
  const pageRows = useMemo(
    () => rows.slice(page * pageSize, page * pageSize + pageSize),
    [rows, page, pageSize],
  );

  useEffect(() => {
    if (page > 0 && page >= totalPages) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [page, totalPages]);

  return (
    <RequireAuth>
      <AppShell>
        <PageHeader
          title={t("dashboard.overdueFiles.title")}
          description={t("dashboard.overdueFiles.pageDescription")}
          actions={
            <Button variant="soft" color="gray" asChild>
              <Link href="/dashboard">
                <ArrowLeftIcon />
                {t("dashboard.backToDashboard")}
              </Link>
            </Button>
          }
        />

        {error && <StatusAlert message={error} variant="error" />}

        <Card size="2">
          {loading ? (
            <LoadingBlock message={t("common.loading")} />
          ) : rows.length === 0 ? (
            <EmptyBlock title={t("dashboard.overdueFiles.empty")} />
          ) : (
            <>
              <Table.Root variant="surface" size="2">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>{t("dashboard.overdueFiles.reference")}</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>{t("dashboard.overdueFiles.step")}</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>{t("dashboard.overdueFiles.responsible")}</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>{t("dashboard.overdueFiles.dueAt")}</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell align="right">{t("dashboard.overdueFiles.daysLate")}</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {pageRows.map((file) => (
                    <Table.Row key={`${file.fileId}-${file.dueAt}`}>
                      <Table.Cell>
                        <Link href={`/files/${file.fileId}`} style={{ fontFamily: "var(--font-geist-mono)" }}>
                          {file.referenceNumber ?? "—"}
                        </Link>
                        <Text
                          as="p"
                          size="1"
                          color="gray"
                          style={{ maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        >
                          {file.subject}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text size="2" color="gray">{file.stepLabel}</Text>
                      </Table.Cell>
                      <Table.Cell>{file.responsibleUserName ?? "—"}</Table.Cell>
                      <Table.Cell>
                        <Text size="2" color="gray">{formatBusinessDate(file.dueAt, locale)}</Text>
                      </Table.Cell>
                      <Table.Cell align="right">
                        <Badge color="red" variant="soft">{file.daysOverdue} j</Badge>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>

              <PaginationBar
                page={page}
                totalPages={totalPages}
                totalElements={totalElements}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(0);
                }}
              />
            </>
          )}
        </Card>
      </AppShell>
    </RequireAuth>
  );
}
