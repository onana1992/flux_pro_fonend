"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Flex,
  SegmentedControl,
  Select,
  Table,
  Text,
  TextField,
} from "@radix-ui/themes";
import { MagnifyingGlassIcon, PlusIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { OrganisationGraph } from "@/components/OrganisationGraph";
import { OrganizationFormDialog } from "@/components/OrganizationFormDialog";
import { RequireAuth } from "@/components/RequireAuth";
import {
  ApiError,
  deleteOrganization,
  getOrganizationTree,
  importOrganizations,
} from "@/lib/api";
import { flattenOrgTree, parentCodeOf } from "@/lib/org-tree";
import type { ImportResult, OrganisationTreeNode, OrganizationType } from "@/lib/types";
import {
  EmptyBlock,
  FileImportButton,
  LoadingBlock,
  PageHeader,
  StatusAlert,
} from "@/components/ui/shared";

type ViewMode = "graph" | "list";
type StatusFilter = "all" | "active" | "inactive";

function matchesSearch(org: OrganisationTreeNode, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return org.code.toLowerCase().includes(q) || org.name.toLowerCase().includes(q);
}

export default function AdminOrgPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [tree, setTree] = useState<OrganisationTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("list");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [parentFilter, setParentFilter] = useState("all");

  const flatOrgs = useMemo(() => flattenOrgTree(tree), [tree]);

  const typeOptions = useMemo(() => {
    const byId = new Map<string, OrganizationType>();
    for (const org of flatOrgs) {
      byId.set(org.type.id, org.type);
    }
    return [...byId.values()].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [flatOrgs]);

  const filteredOrgs = useMemo(() => {
    return flatOrgs.filter((org) => {
      if (!matchesSearch(org, search)) return false;
      if (typeFilter !== "all" && org.type.id !== typeFilter) return false;
      if (statusFilter === "active" && !org.active) return false;
      if (statusFilter === "inactive" && org.active) return false;
      if (parentFilter === "root" && parentCodeOf(tree, org.id) !== null) return false;
      if (parentFilter !== "all" && parentFilter !== "root") {
        const parent = flatOrgs.find((o) => o.id === parentFilter);
        if (!parent || parentCodeOf(tree, org.id) !== parent.code) return false;
      }
      return true;
    });
  }, [flatOrgs, tree, search, typeFilter, statusFilter, parentFilter]);

  const hasActiveFilters =
    search.trim() !== "" ||
    typeFilter !== "all" ||
    statusFilter !== "all" ||
    parentFilter !== "all";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTree(await getOrganizationTree());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setDialogOpen(true);
  }

  function resetFilters() {
    setSearch("");
    setTypeFilter("all");
    setStatusFilter("all");
    setParentFilter("all");
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSuccess(null);
    setImportResult(null);
    try {
      const result = await importOrganizations(file);
      setImportResult(result);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.importFailed"));
    }
    e.target.value = "";
  }

  async function handleDelete(id: string) {
    if (!confirm(t("admin.org.deleteConfirm"))) return;
    setDeletingId(id);
    setError(null);
    setSuccess(null);
    try {
      await deleteOrganization(id);
      setSuccess(t("admin.org.deleteSuccess"));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("admin.org.deleteFailed"));
    } finally {
      setDeletingId(null);
    }
  }

  function handleSaved() {
    setSuccess(t("admin.org.createSuccess"));
    load();
  }

  return (
    <RequireAuth admin>
      <AppShell>
        <PageHeader
          title={t("admin.org.title")}
          description={t("admin.org.description")}
          actions={
            <Flex gap="2" wrap="wrap">
              <FileImportButton label={t("common.importCsv")} onChange={handleImport} />
              <Button onClick={openCreate}>
                <PlusIcon /> {t("admin.org.create")}
              </Button>
            </Flex>
          }
        />

        {error && <StatusAlert message={error} variant="error" />}
        {success && <StatusAlert message={success} variant="success" />}
        {importResult && (
          <StatusAlert
            message={t("common.importSuccess", {
              created: importResult.created,
              updated: importResult.updated,
            })}
            variant="success"
          />
        )}

        <Flex justify="between" align="center" gap="3" mb="4" wrap="wrap">
          <SegmentedControl.Root
            value={view}
            onValueChange={(value) => setView(value as ViewMode)}
          >
            <SegmentedControl.Item value="list">{t("admin.org.viewList")}</SegmentedControl.Item>
            <SegmentedControl.Item value="graph">{t("admin.org.viewGraph")}</SegmentedControl.Item>
          </SegmentedControl.Root>
          {!loading && tree.length > 0 && view === "list" && (
            <Text size="2" color="gray">
              {hasActiveFilters
                ? t("admin.org.filteredCount", {
                    filtered: filteredOrgs.length,
                    total: flatOrgs.length,
                  })
                : t("admin.org.entityCount", { count: flatOrgs.length })}
            </Text>
          )}
        </Flex>

        {view === "list" && !loading && tree.length > 0 && (
          <Card size="2" mb="4">
            <Flex gap="3" wrap="wrap" align="end">
              <TextField.Root
                placeholder={t("admin.org.searchPlaceholder")}
                value={search}
                style={{ flex: 1, minWidth: 220 }}
                onChange={(e) => setSearch(e.target.value)}
              >
                <TextField.Slot>
                  <MagnifyingGlassIcon height="16" width="16" />
                </TextField.Slot>
              </TextField.Root>

              <Select.Root value={typeFilter} onValueChange={setTypeFilter}>
                <Select.Trigger placeholder={t("admin.org.allTypes")} style={{ minWidth: 180 }} />
                <Select.Content>
                  <Select.Item value="all">{t("admin.org.allTypes")}</Select.Item>
                  {typeOptions.map((type) => (
                    <Select.Item key={type.id} value={type.id}>
                      {type.name} ({type.code})
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>

              <Select.Root
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as StatusFilter)}
              >
                <Select.Trigger placeholder={t("admin.org.allStatuses")} style={{ minWidth: 160 }} />
                <Select.Content>
                  <Select.Item value="all">{t("admin.org.allStatuses")}</Select.Item>
                  <Select.Item value="active">{t("common.active")}</Select.Item>
                  <Select.Item value="inactive">{t("common.inactive")}</Select.Item>
                </Select.Content>
              </Select.Root>

              <Select.Root value={parentFilter} onValueChange={setParentFilter}>
                <Select.Trigger placeholder={t("admin.org.allParents")} style={{ minWidth: 200 }} />
                <Select.Content>
                  <Select.Item value="all">{t("admin.org.allParents")}</Select.Item>
                  <Select.Item value="root">{t("admin.org.rootOnly")}</Select.Item>
                  {flatOrgs.map((org) => (
                    <Select.Item key={org.id} value={org.id}>
                      {org.code} — {org.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>

              {hasActiveFilters && (
                <Button variant="soft" color="gray" onClick={resetFilters}>
                  {t("admin.org.resetFilters")}
                </Button>
              )}
            </Flex>
          </Card>
        )}

        <Card size="3">
          {loading ? (
            <LoadingBlock message={t("admin.org.loading")} />
          ) : tree.length === 0 ? (
            <EmptyBlock
              title={t("admin.org.emptyTitle")}
              description={t("admin.org.emptyDescription")}
            />
          ) : view === "graph" ? (
            <OrganisationGraph
              nodes={tree}
              onNodeClick={(nodeId) => router.push(`/admin/org/${nodeId}`)}
            />
          ) : filteredOrgs.length === 0 ? (
            <EmptyBlock
              title={t("admin.org.filterNoResults")}
              description={t("admin.org.searchPlaceholder")}
            />
          ) : (
            <Table.Root variant="surface">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>{t("admin.org.code")}</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>{t("admin.org.name")}</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>{t("admin.org.type")}</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>{t("admin.org.parent")}</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>{t("admin.org.status")}</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>{t("admin.org.actions")}</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredOrgs.map((org) => (
                  <Table.Row key={org.id}>
                    <Table.Cell>
                      <Text size="2" style={{ fontFamily: "var(--font-geist-mono)" }}>
                        {org.code}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>{org.name}</Table.Cell>
                    <Table.Cell>
                      <Badge color="blue" variant="soft" size="1">
                        {org.type.name}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="2" color="gray">
                        {parentCodeOf(tree, org.id) ?? "—"}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge color={org.active ? "green" : "gray"} variant="soft">
                        {org.active ? t("common.active") : t("common.inactive")}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Flex gap="2">
                        <Button size="1" variant="soft" asChild>
                          <Link href={`/admin/org/${org.id}`}>{t("admin.org.view")}</Link>
                        </Button>
                        <Button
                          size="1"
                          variant="soft"
                          color="red"
                          disabled={deletingId === org.id}
                          onClick={() => handleDelete(org.id)}
                        >
                          {t("admin.org.delete")}
                        </Button>
                      </Flex>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </Card>

        <OrganizationFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          tree={tree}
          onSaved={handleSaved}
        />
      </AppShell>
    </RequireAuth>
  );
}
