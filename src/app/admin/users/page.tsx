"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Select,
  Table,
  Text,
  TextField,
} from "@radix-ui/themes";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import {
  ApiError,
  deactivateUser,
  importUsers,
  searchUsers,
} from "@/lib/api";
import type { ImportResult, User, UserRole } from "@/lib/types";
import {
  EmptyBlock,
  FileImportButton,
  LoadingBlock,
  PageHeader,
  PaginationBar,
  RoleBadge,
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

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await searchUsers({
        page,
        search: search || undefined,
        role: role === "all" ? undefined : (role as UserRole),
      });
      setUsers(res.content);
      setTotalPages(res.totalPages);
      setTotalElements(res.totalElements);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [page, search, role, t]);

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

  async function handleDeactivate(id: string) {
    if (!confirm(t("admin.users.deactivateConfirm"))) return;
    await deactivateUser(id);
    await load();
  }

  return (
    <RequireAuth admin>
      <AppShell>
        <PageHeader
          title={t("admin.users.title")}
          description={t("admin.users.description", { count: totalElements })}
          actions={<FileImportButton label={t("admin.users.importLabel")} onChange={handleImport} />}
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

        <Card size="2" mb="4">
          <Flex gap="3" wrap="wrap">
            <Box style={{ flex: 1, minWidth: 220 }}>
              <TextField.Root
                placeholder={t("admin.users.searchPlaceholder")}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
              >
                <TextField.Slot>
                  <MagnifyingGlassIcon height="16" width="16" />
                </TextField.Slot>
              </TextField.Root>
            </Box>
            <Select.Root
              value={role}
              onValueChange={(v) => {
                setRole(v);
                setPage(0);
              }}
            >
              <Select.Trigger placeholder={t("admin.users.allRoles")} style={{ minWidth: 180 }} />
              <Select.Content>
                <Select.Item value="all">{t("admin.users.allRoles")}</Select.Item>
                {ROLES.map((r) => (
                  <Select.Item key={r} value={r}>
                    {r.replace(/_/g, " ")}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Flex>
        </Card>

        <Card size="3">
          {loading ? (
            <LoadingBlock message={t("admin.users.loading")} />
          ) : users.length === 0 ? (
            <EmptyBlock
              title={t("admin.users.emptyTitle")}
              description={t("admin.users.emptyDescription")}
            />
          ) : (
            <>
              <Table.Root variant="surface">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>{t("admin.users.agent")}</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>{t("admin.users.matricule")}</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>{t("admin.users.email")}</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>{t("admin.users.role")}</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>{t("admin.users.organisation")}</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>{t("admin.users.status")}</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {users.map((u) => (
                    <Table.Row key={u.id}>
                      <Table.Cell>
                        <Text weight="medium">
                          {u.firstName} {u.lastName}
                        </Text>
                        {u.jobTitle && (
                          <Text size="1" color="gray">
                            {u.jobTitle}
                          </Text>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        <Text size="1" style={{ fontFamily: "monospace" }}>
                          {u.staffNumber}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>{u.email}</Table.Cell>
                      <Table.Cell>
                        <RoleBadge role={u.role} />
                      </Table.Cell>
                      <Table.Cell>
                        <Text size="1" style={{ fontFamily: "monospace" }}>
                          {u.organization.code}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge color={u.active ? "green" : "red"} variant="soft">
                          {u.active ? t("common.active") : t("common.inactive")}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        {u.active && (
                          <Button
                            variant="ghost"
                            color="red"
                            size="1"
                            onClick={() => handleDeactivate(u.id)}
                          >
                            {t("admin.users.deactivate")}
                          </Button>
                        )}
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
