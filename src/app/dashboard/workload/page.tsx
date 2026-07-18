"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, Table, Text } from "@radix-ui/themes";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { ApiError, getDashboardWorkload } from "@/lib/api";
import type { DashboardWorkloadEntry } from "@/lib/types";
import {
  EmptyBlock,
  LoadingBlock,
  PageHeader,
  PaginationBar,
  StatusAlert,
} from "@/components/ui/shared";

export default function DashboardWorkloadPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<DashboardWorkloadEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await getDashboardWorkload());
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
          title={t("dashboard.workload.title")}
          description={t("dashboard.workload.pageDescription")}
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
            <EmptyBlock title={t("dashboard.workload.empty")} />
          ) : (
            <>
              <Table.Root variant="surface" size="2">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>{t("dashboard.workload.agent")}</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>{t("dashboard.workload.organization")}</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell align="right">{t("dashboard.workload.active")}</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell align="right">{t("dashboard.workload.overdue")}</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {pageRows.map((entry) => (
                    <Table.Row key={entry.userId}>
                      <Table.Cell>
                        <Text weight="medium">
                          {entry.firstName} {entry.lastName}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text size="2" color="gray">{entry.organizationCode ?? "—"}</Text>
                      </Table.Cell>
                      <Table.Cell align="right">{entry.activeCount}</Table.Cell>
                      <Table.Cell align="right">
                        {entry.overdueCount > 0 ? (
                          <Badge color="red" variant="soft">{entry.overdueCount}</Badge>
                        ) : (
                          <Text color="gray">0</Text>
                        )}
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
