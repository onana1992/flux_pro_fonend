"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Flex, Select, Text, TextField } from "@radix-ui/themes";
import { MagnifyingGlassIcon, PlusIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { FilesTable } from "@/components/FilesTable";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { ApiError, getFileTypes, searchFiles } from "@/lib/api";
import { hasPermission } from "@/lib/auth-storage";
import type { FilePriority, FileStatus, FileSummary, FileType } from "@/lib/types";
import { EmptyBlock, LoadingBlock, PageHeader, StatusAlert } from "@/components/ui/shared";

const ALL_STATUSES: FileStatus[] = [
  "DRAFT",
  "IN_PROGRESS",
  "ON_HOLD",
  "CLOSED",
  "ARCHIVED",
  "CANCELLED",
];

const ALL_PRIORITIES: FilePriority[] = ["NORMAL", "URGENT", "VERY_URGENT"];

function FilesListPageInner() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get("search") ?? "";

  const [files, setFiles] = useState<FileSummary[]>([]);
  const [fileTypes, setFileTypes] = useState<FileType[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalUnfiltered, setTotalUnfiltered] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(urlSearch);
  const [fileTypeCode, setFileTypeCode] = useState("all");
  const [status, setStatus] = useState<string>("all");
  const [priority, setPriority] = useState<string>("all");

  const canCreate = hasPermission(user, "FILES:CREATE");
  const hasActiveFilters =
    search.trim() !== "" || fileTypeCode !== "all" || status !== "all" || priority !== "all";

  useEffect(() => {
    getFileTypes().then(setFileTypes).catch(() => {});
  }, []);

  useEffect(() => {
    setSearch((prev) => (prev === urlSearch ? prev : urlSearch));
    setPage(0);
  }, [urlSearch]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await searchFiles({
        page,
        size: pageSize,
        search: search.trim() || undefined,
        fileTypeCode: fileTypeCode === "all" ? undefined : fileTypeCode,
        status: status === "all" ? undefined : (status as FileStatus),
        priority: priority === "all" ? undefined : (priority as FilePriority),
      });
      setFiles(res.content);
      setTotalPages(res.totalPages);
      setTotalElements(res.totalElements);
      if (!hasActiveFilters) {
        setTotalUnfiltered(res.totalElements);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [fileTypeCode, hasActiveFilters, page, pageSize, priority, search, status, t]);

  useEffect(() => {
    load();
  }, [load]);

  function updateSearch(next: string) {
    setSearch(next);
    setPage(0);
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = next.trim();
    if (trimmed) params.set("search", trimmed);
    else params.delete("search");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <>
      <PageHeader
        title={t("files.title")}
        description={t("files.listDescription")}
        actions={
          canCreate ? (
            <Button asChild>
              <Link href="/files/new">
                <PlusIcon /> {t("files.create")}
              </Link>
            </Button>
          ) : undefined
        }
      />

      {error && <StatusAlert variant="error" message={error} />}

      {!loading && (
        <Flex justify="end" mb="4">
          <Text size="2" color="gray">
            {hasActiveFilters
              ? t("files.filteredCount", {
                  filtered: totalElements,
                  total: totalUnfiltered,
                })
              : t("files.entityCount", { count: totalElements })}
          </Text>
        </Flex>
      )}

      <Card size="2" mb="4">
        <Flex gap="3" wrap="wrap">
          <TextField.Root
            placeholder={t("files.search")}
            value={search}
            style={{ flex: 1, minWidth: 200 }}
            onChange={(e) => updateSearch(e.target.value)}
          >
            <TextField.Slot>
              <MagnifyingGlassIcon height="16" width="16" />
            </TextField.Slot>
          </TextField.Root>

          <Select.Root
            value={fileTypeCode}
            onValueChange={(v) => {
              setFileTypeCode(v);
              setPage(0);
            }}
          >
            <Select.Trigger placeholder={t("files.allTypes")} style={{ minWidth: 160 }} />
            <Select.Content>
              <Select.Item value="all">{t("files.allTypes")}</Select.Item>
              {fileTypes.map((ft) => (
                <Select.Item key={ft.id} value={ft.code}>
                  {ft.code}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>

          <Select.Root
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              setPage(0);
            }}
          >
            <Select.Trigger placeholder={t("files.allStatuses")} style={{ minWidth: 160 }} />
            <Select.Content>
              <Select.Item value="all">{t("files.allStatuses")}</Select.Item>
              {ALL_STATUSES.map((s) => (
                <Select.Item key={s} value={s}>
                  {t(`files.statusValues.${s}`)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>

          <Select.Root
            value={priority}
            onValueChange={(v) => {
              setPriority(v);
              setPage(0);
            }}
          >
            <Select.Trigger placeholder={t("files.allPriorities")} style={{ minWidth: 160 }} />
            <Select.Content>
              <Select.Item value="all">{t("files.allPriorities")}</Select.Item>
              {ALL_PRIORITIES.map((p) => (
                <Select.Item key={p} value={p}>
                  {t(`files.priorityValues.${p}`)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Flex>
      </Card>

      {loading ? (
        <LoadingBlock message={t("files.loading")} />
      ) : files.length === 0 ? (
        <EmptyBlock title={t("files.emptyTitle")} description={t("files.emptyDescription")} />
      ) : (
        <FilesTable
          files={files}
          user={user}
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
      )}
    </>
  );
}

export default function FilesListPage() {
  const { t } = useTranslation();
  return (
    <RequireAuth permission="FILES:READ">
      <AppShell>
        <Suspense fallback={<LoadingBlock message={t("files.loading")} />}>
          <FilesListPageInner />
        </Suspense>
      </AppShell>
    </RequireAuth>
  );
}
