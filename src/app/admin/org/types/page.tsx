"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  Flex,
  Select,
  Table,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import { PlusIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import {
  ApiError,
  createOrganizationType,
  deleteOrganizationType,
  getAllOrganizationTypes,
} from "@/lib/api";
import type { OrganizationType, OrganizationTypeRequest } from "@/lib/types";
import { preventDialogDismissFromPortals } from "@/lib/dialog-portals";
import { EmptyBlock, LoadingBlock, PageHeader, StatusAlert } from "@/components/ui/shared";

const COLOR_OPTIONS = ["purple", "blue", "gray", "green", "orange"] as const;

type StatusFilter = "all" | "active" | "inactive";
type BooleanFilter = "all" | "yes" | "no";

function matchesSearch(type: OrganizationType, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    type.code.toLowerCase().includes(q) ||
    type.name.toLowerCase().includes(q) ||
    (type.nameEn?.toLowerCase().includes(q) ?? false)
  );
}

function sortTypes(items: OrganizationType[]): OrganizationType[] {
  const list = Array.isArray(items) ? items : [];
  return [...list].sort((a, b) => a.sortOrder - b.sortOrder);
}

const EMPTY_FORM: OrganizationTypeRequest = {
  code: "",
  name: "",
  nameEn: "",
  description: "",
  color: "blue",
  sortOrder: 10,
  allowsRoot: false,
  isRegionalScope: false,
  active: true,
};

export default function AdminOrgTypesPage() {
  const { t } = useTranslation();
  const [types, setTypes] = useState<OrganizationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<OrganizationTypeRequest>(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [rootFilter, setRootFilter] = useState<BooleanFilter>("all");
  const [regionalFilter, setRegionalFilter] = useState<BooleanFilter>("all");

  const filteredTypes = useMemo(() => {
    return types.filter((type) => {
      if (!matchesSearch(type, search)) return false;
      if (statusFilter === "active" && !type.active) return false;
      if (statusFilter === "inactive" && type.active) return false;
      if (rootFilter === "yes" && !type.allowsRoot) return false;
      if (rootFilter === "no" && type.allowsRoot) return false;
      if (regionalFilter === "yes" && !type.isRegionalScope) return false;
      if (regionalFilter === "no" && type.isRegionalScope) return false;
      return true;
    });
  }, [types, search, statusFilter, rootFilter, regionalFilter]);

  const hasActiveFilters =
    search.trim() !== "" ||
    statusFilter !== "all" ||
    rootFilter !== "all" ||
    regionalFilter !== "all";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTypes(sortTypes(await getAllOrganizationTypes()));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreateDialog() {
    setForm({ ...EMPTY_FORM, sortOrder: (types.length + 1) * 10 });
    setDialogOpen(true);
  }

  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
    setRootFilter("all");
    setRegionalFilter("all");
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createOrganizationType({
        ...form,
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        nameEn: form.nameEn?.trim() || undefined,
        description: form.description?.trim() || undefined,
      });
      setSuccess(t("admin.orgTypes.createSuccess"));
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("admin.orgTypes.createFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(type: OrganizationType) {
    if (!confirm(t("admin.orgTypes.deleteConfirm"))) return;
    setDeletingId(type.id);
    setError(null);
    setSuccess(null);
    try {
      await deleteOrganizationType(type.id);
      setSuccess(t("admin.orgTypes.deleteSuccess"));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("admin.orgTypes.deleteFailed"));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <RequireAuth admin>
      <AppShell>
        <PageHeader
          title={t("admin.orgTypes.title")}
          description={t("admin.orgTypes.description")}
          actions={
            <Button onClick={openCreateDialog}>
              <PlusIcon /> {t("admin.orgTypes.create")}
            </Button>
          }
        />

        {error && <StatusAlert message={error} variant="error" />}
        {success && <StatusAlert message={success} variant="success" />}

        {!loading && types.length > 0 && (
          <Flex justify="end" align="center" gap="3" mb="4" wrap="wrap">
            <Text size="2" color="gray">
              {hasActiveFilters
                ? t("admin.orgTypes.filteredCount", {
                    filtered: filteredTypes.length,
                    total: types.length,
                  })
                : t("admin.orgTypes.entityCount", { count: types.length })}
            </Text>
          </Flex>
        )}

        {!loading && types.length > 0 && (
          <Card size="2" mb="4">
            <Flex gap="3" wrap="wrap" align="end">
              <TextField.Root
                placeholder={t("admin.orgTypes.searchPlaceholder")}
                value={search}
                style={{ flex: 1, minWidth: 220 }}
                onChange={(e) => setSearch(e.target.value)}
              >
                <TextField.Slot>
                  <MagnifyingGlassIcon height="16" width="16" />
                </TextField.Slot>
              </TextField.Root>

              <Select.Root
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as StatusFilter)}
              >
                <Select.Trigger placeholder={t("admin.orgTypes.allStatuses")} style={{ minWidth: 160 }} />
                <Select.Content>
                  <Select.Item value="all">{t("admin.orgTypes.allStatuses")}</Select.Item>
                  <Select.Item value="active">{t("common.active")}</Select.Item>
                  <Select.Item value="inactive">{t("common.inactive")}</Select.Item>
                </Select.Content>
              </Select.Root>

              <Select.Root
                value={rootFilter}
                onValueChange={(value) => setRootFilter(value as BooleanFilter)}
              >
                <Select.Trigger placeholder={t("admin.orgTypes.allRoot")} style={{ minWidth: 160 }} />
                <Select.Content>
                  <Select.Item value="all">{t("admin.orgTypes.allRoot")}</Select.Item>
                  <Select.Item value="yes">{t("common.yes")}</Select.Item>
                  <Select.Item value="no">{t("common.no")}</Select.Item>
                </Select.Content>
              </Select.Root>

              <Select.Root
                value={regionalFilter}
                onValueChange={(value) => setRegionalFilter(value as BooleanFilter)}
              >
                <Select.Trigger placeholder={t("admin.orgTypes.allRegional")} style={{ minWidth: 180 }} />
                <Select.Content>
                  <Select.Item value="all">{t("admin.orgTypes.allRegional")}</Select.Item>
                  <Select.Item value="yes">{t("common.yes")}</Select.Item>
                  <Select.Item value="no">{t("common.no")}</Select.Item>
                </Select.Content>
              </Select.Root>

              {hasActiveFilters && (
                <Button variant="soft" color="gray" onClick={resetFilters}>
                  {t("admin.orgTypes.resetFilters")}
                </Button>
              )}
            </Flex>
          </Card>
        )}

        <Card size="3">
          {loading ? (
            <LoadingBlock message={t("admin.orgTypes.loading")} />
          ) : types.length === 0 ? (
            <EmptyBlock
              title={t("admin.orgTypes.emptyTitle")}
              description={t("admin.orgTypes.emptyDescription")}
            />
          ) : filteredTypes.length === 0 ? (
            <EmptyBlock
              title={t("admin.orgTypes.filterNoResults")}
              description={t("admin.orgTypes.searchPlaceholder")}
            />
          ) : (
            <Table.Root variant="surface">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>{t("admin.orgTypes.code")}</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>{t("admin.orgTypes.name")}</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>{t("admin.orgTypes.root")}</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>{t("admin.orgTypes.regional")}</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>{t("admin.orgTypes.status")}</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>{t("admin.orgTypes.actions")}</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredTypes.map((type) => (
                  <Table.Row key={type.id || type.code}>
                    <Table.Cell>
                      <Text size="2" style={{ fontFamily: "var(--font-geist-mono)" }}>
                        {type.code}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>{type.name}</Table.Cell>
                    <Table.Cell>{type.allowsRoot ? t("common.yes") : t("common.no")}</Table.Cell>
                    <Table.Cell>
                      {type.isRegionalScope ? t("common.yes") : t("common.no")}
                    </Table.Cell>
                    <Table.Cell>
                      <Badge color={type.active ? "green" : "gray"} variant="soft">
                        {type.active ? t("common.active") : t("common.inactive")}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Flex gap="2">
                        <Button size="1" variant="soft" asChild>
                          <Link href={`/admin/org/types/${type.id}`}>{t("admin.orgTypes.view")}</Link>
                        </Button>
                        <Button
                          size="1"
                          variant="soft"
                          color="red"
                          disabled={deletingId === type.id}
                          onClick={() => handleDelete(type)}
                        >
                          {t("admin.orgTypes.delete")}
                        </Button>
                      </Flex>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </Card>

        <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
          <Dialog.Content
            maxWidth="480px"
            onPointerDownOutside={preventDialogDismissFromPortals}
            onInteractOutside={preventDialogDismissFromPortals}
            onFocusOutside={preventDialogDismissFromPortals}
          >
            <Dialog.Title>{t("admin.orgTypes.createTitle")}</Dialog.Title>
            <Dialog.Description size="2" color="gray" mb="4">
              {t("admin.orgTypes.createDescription")}
            </Dialog.Description>

            <form onSubmit={handleCreate}>
              <Flex direction="column" gap="3">
                <label>
                  <Text as="div" size="2" weight="medium" mb="1">
                    {t("admin.orgTypes.code")}
                  </Text>
                  <TextField.Root
                    required
                    placeholder="AGENCY"
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                    style={{ fontFamily: "var(--font-geist-mono)" }}
                  />
                </label>

                <label>
                  <Text as="div" size="2" weight="medium" mb="1">
                    {t("admin.orgTypes.name")}
                  </Text>
                  <TextField.Root
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </label>

                <label>
                  <Text as="div" size="2" weight="medium" mb="1">
                    {t("admin.orgTypes.nameEn")}
                  </Text>
                  <TextField.Root
                    value={form.nameEn ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
                  />
                </label>

                <label>
                  <Text as="div" size="2" weight="medium" mb="1">
                    {t("admin.orgTypes.descriptionField")}
                  </Text>
                  <TextArea
                    rows={3}
                    value={form.description ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </label>

                <label>
                  <Text as="div" size="2" weight="medium" mb="1">
                    {t("admin.orgTypes.color")}
                  </Text>
                  <Select.Root
                    value={form.color ?? "blue"}
                    onValueChange={(color) => setForm((f) => ({ ...f, color }))}
                  >
                    <Select.Trigger style={{ width: "100%" }} />
                    <Select.Content>
                      {COLOR_OPTIONS.map((color) => (
                        <Select.Item key={color} value={color}>
                          {color}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </label>

                <label>
                  <Text as="div" size="2" weight="medium" mb="1">
                    {t("admin.orgTypes.sortOrder")}
                  </Text>
                  <TextField.Root
                    type="number"
                    value={String(form.sortOrder ?? 0)}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))
                    }
                  />
                </label>

                <Flex direction="column" gap="2">
                  <Text as="label" size="2">
                    <Flex gap="2" align="center">
                      <Checkbox
                        checked={form.allowsRoot}
                        onCheckedChange={(v) => setForm((f) => ({ ...f, allowsRoot: v === true }))}
                      />
                      {t("admin.orgTypes.allowsRoot")}
                    </Flex>
                  </Text>
                  <Text as="label" size="2">
                    <Flex gap="2" align="center">
                      <Checkbox
                        checked={form.isRegionalScope}
                        onCheckedChange={(v) =>
                          setForm((f) => ({ ...f, isRegionalScope: v === true }))
                        }
                      />
                      {t("admin.orgTypes.isRegionalScope")}
                    </Flex>
                  </Text>
                  <Text as="label" size="2">
                    <Flex gap="2" align="center">
                      <Checkbox
                        checked={form.active}
                        onCheckedChange={(v) => setForm((f) => ({ ...f, active: v === true }))}
                      />
                      {t("common.active")}
                    </Flex>
                  </Text>
                </Flex>

                <Flex gap="2" justify="end" mt="2">
                  <Dialog.Close>
                    <Button type="button" variant="soft" color="gray">
                      {t("common.cancel")}
                    </Button>
                  </Dialog.Close>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? t("admin.orgTypes.creating") : t("admin.orgTypes.create")}
                  </Button>
                </Flex>
              </Flex>
            </form>
          </Dialog.Content>
        </Dialog.Root>
      </AppShell>
    </RequireAuth>
  );
}
