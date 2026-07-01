"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button, Card, Flex, Select, Text, TextField } from "@radix-ui/themes";
import { MagnifyingGlassIcon, PlusIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { UsersTable } from "@/components/UsersTable";
import { useAuth } from "@/components/AuthProvider";
import { ApiError, getOrganizationTree, importUsers, searchUsers } from "@/lib/api";
import { isSuperAdmin } from "@/lib/auth-storage";
import type { ImportResult, OrganizationTreeNode, User, UserRole } from "@/lib/types";
import {
  EmptyBlock,
  FileImportButton,
  LoadingBlock,
  PageHeader,
  StatusAlert,
} from "@/components/ui/shared";

const ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "BUSINESS_ADMIN",
  "EXECUTIVE_OFFICE",
  "SECRETARY_GENERAL",
  "DIRECTOR",
  "SERVICE_HEAD",
  "AGENT",
  "SUPPORT",
  "READER",
  "REGIONAL_DIRECTOR",
];

function flattenOrgs(nodes: OrganizationTreeNode[]): OrganizationTreeNode[] {
  const result: OrganizationTreeNode[] = [];
  function walk(list: OrganizationTreeNode[]) {
    for (const node of list) {
      result.push(node);
      if (node.children.length > 0) walk(node.children);
    }
  }
  walk(nodes);
  return result.sort((a, b) => a.code.localeCompare(b.code));
}

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [orgs, setOrgs] = useState<OrganizationTreeNode[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<string>("all");
  const [organizationId, setOrganizationId] = useState<string>("all");
  const [totalUnfiltered, setTotalUnfiltered] = useState(0);
  const [loading, setLoading] = useState(true);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const flatOrgs = useMemo(() => flattenOrgs(orgs), [orgs]);
  const superAdmin = isSuperAdmin(user);
  const hasActiveFilters =
    search.trim() !== "" || role !== "all" || organizationId !== "all";

  useEffect(() => {
    getOrganizationTree()
      .then(setOrgs)
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await searchUsers({
        page,
        size: pageSize,
        search: search || undefined,
        role: role === "all" ? undefined : (role as UserRole),
        organizationId: organizationId === "all" ? undefined : organizationId,
      });
      setUsers(res.content);
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
  }, [page, pageSize, search, role, organizationId, hasActiveFilters, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await importUsers(file);
      setImportResult(result);
      setPage(0);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.importFailed"));
    }
    e.target.value = "";
  }

  return (
    <RequireAuth userRead>
      <AppShell>
        <PageHeader
          title={t("admin.users.title")}
          description={t("admin.users.description")}
          actions={
            <Flex gap="2" wrap="wrap">
              {isAdmin && (
                <Button asChild>
                  <Link href="/admin/users/new">
                    <PlusIcon /> {t("admin.users.create")}
                  </Link>
                </Button>
              )}
              {superAdmin && (
                <FileImportButton label={t("admin.users.importLabel")} onChange={handleImport} />
              )}
            </Flex>
          }
        />

        {error && <StatusAlert message={error} variant="error" />}
        {importResult && (
          <StatusAlert
            message={t("common.importSuccessShort", {
              created: importResult.created,
              updated: importResult.updated,
            })}
            variant="success"
          />
        )}

        {!loading && (
          <Flex justify="end" mb="4">
            <Text size="2" color="gray">
              {hasActiveFilters
                ? t("admin.users.filteredCount", {
                    filtered: totalElements,
                    total: totalUnfiltered,
                  })
                : t("admin.users.entityCount", { count: totalElements })}
            </Text>
          </Flex>
        )}

        <Card size="2" mb="4">
          <Flex gap="3" wrap="wrap">
            <TextField.Root
              placeholder={t("admin.users.searchPlaceholder")}
              value={search}
              style={{ flex: 1, minWidth: 200 }}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            >
              <TextField.Slot>
                <MagnifyingGlassIcon height="16" width="16" />
              </TextField.Slot>
            </TextField.Root>
            <Select.Root
              value={role}
              onValueChange={(v) => {
                setRole(v);
                setPage(0);
              }}
            >
              <Select.Trigger placeholder={t("admin.users.allRoles")} style={{ minWidth: 160 }} />
              <Select.Content>
                <Select.Item value="all">{t("admin.users.allRoles")}</Select.Item>
                {ROLES.map((r) => (
                  <Select.Item key={r} value={r}>
                    {r.replace(/_/g, " ")}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
            <Select.Root
              value={organizationId}
              onValueChange={(v) => {
                setOrganizationId(v);
                setPage(0);
              }}
            >
              <Select.Trigger placeholder={t("admin.users.allOrgs")} style={{ minWidth: 160 }} />
              <Select.Content>
                <Select.Item value="all">{t("admin.users.allOrgs")}</Select.Item>
                {flatOrgs.map((o) => (
                  <Select.Item key={o.id} value={o.id}>
                    {o.code}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Flex>
        </Card>

        {loading ? (
          <LoadingBlock message={t("admin.users.loading")} />
        ) : users.length === 0 ? (
          <EmptyBlock
            title={t("admin.users.emptyTitle")}
            description={t("admin.users.emptyDescription")}
          />
        ) : (
          <UsersTable
            users={users}
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
      </AppShell>
    </RequireAuth>
  );
}
