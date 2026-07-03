"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { MagnifyingGlassIcon, PlusIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import {
  ApiError,
  deactivateChainTemplate,
  deleteChainTemplate,
  getFileTypes,
  searchChainTemplates,
} from "@/lib/api";
import { hasPermission } from "@/lib/auth-storage";
import type { ChainTemplateSummary, FileType } from "@/lib/types";
import { EmptyBlock, LoadingBlock, PageHeader, StatusAlert } from "@/components/ui/shared";

export default function ChainTemplatesListPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const [templates, setTemplates] = useState<ChainTemplateSummary[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [fileTypeCode, setFileTypeCode] = useState("");
  const [fileTypes, setFileTypes] = useState<FileType[]>([]);

  const canCreate = hasPermission(user, "CHAIN_TEMPLATES:CREATE");
  const canUpdate = hasPermission(user, "CHAIN_TEMPLATES:UPDATE");
  const canDelete = hasPermission(user, "CHAIN_TEMPLATES:DELETE");

  useEffect(() => {
    getFileTypes()
      .then(setFileTypes)
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await searchChainTemplates({
        page: 0,
        size: 100,
        search: search.trim() || undefined,
        active: activeFilter === "all" ? undefined : activeFilter === "active",
        fileTypeCode: fileTypeCode || undefined,
      });
      setTemplates(res.content);
      setTotalElements(res.totalElements);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [search, activeFilter, fileTypeCode, t]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredCount = templates.length;
  const entityCount = useMemo(() => totalElements, [totalElements]);

  async function handleDeactivate(template: ChainTemplateSummary) {
    if (!confirm(t("admin.chainTemplates.deactivateConfirm", { code: template.code }))) return;
    try {
      await deactivateChainTemplate(template.id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    }
  }

  async function handleDelete(template: ChainTemplateSummary) {
    if (!confirm(t("admin.chainTemplates.deleteConfirm", { code: template.code }))) return;
    try {
      await deleteChainTemplate(template.id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    }
  }

  return (
    <RequireAuth permission="CHAIN_TEMPLATES:READ">
      <AppShell>
        <PageHeader
          title={t("admin.chainTemplates.title")}
          description={t("admin.chainTemplates.listDescription", {
            entityCount,
            filteredCount,
          })}
          actions={
            canCreate ? (
              <Button asChild>
                <Link href="/admin/chain-templates/new">
                  <PlusIcon /> {t("admin.chainTemplates.create")}
                </Link>
              </Button>
            ) : undefined
          }
        />

        {error && <StatusAlert message={error} variant="error" />}

        <Card size="3" mb="4">
          <Flex gap="3" wrap="wrap" align="end">
            <Box style={{ flex: "2 1 240px" }}>
              <TextField.Root
                placeholder={t("common.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              >
                <TextField.Slot>
                  <MagnifyingGlassIcon />
                </TextField.Slot>
              </TextField.Root>
            </Box>
            <Select.Root value={activeFilter} onValueChange={setActiveFilter}>
              <Select.Trigger placeholder={t("admin.chainTemplates.status")} />
              <Select.Content>
                <Select.Item value="all">{t("admin.chainTemplates.allStatuses")}</Select.Item>
                <Select.Item value="active">{t("common.active")}</Select.Item>
                <Select.Item value="inactive">{t("common.inactive")}</Select.Item>
              </Select.Content>
            </Select.Root>
            <Select.Root
              value={fileTypeCode || "all"}
              onValueChange={(v) => setFileTypeCode(v === "all" ? "" : v)}
            >
              <Select.Trigger placeholder={t("admin.chainTemplates.fileTypeCode")} />
              <Select.Content>
                <Select.Item value="all">{t("admin.chainTemplates.allFileTypes")}</Select.Item>
                {fileTypes.map((ft) => (
                  <Select.Item key={ft.code} value={ft.code}>
                    {ft.code}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Flex>
        </Card>

        {loading ? (
          <LoadingBlock />
        ) : templates.length === 0 ? (
          <EmptyBlock title={t("admin.chainTemplates.empty")} />
        ) : (
          <Card size="3">
            <Table.Root variant="surface">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>{t("admin.chainTemplates.code")}</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>{t("admin.chainTemplates.name")}</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>{t("admin.chainTemplates.fileTypeCode")}</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>{t("admin.chainTemplates.steps")}</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>{t("admin.chainTemplates.totalDelayDays")}</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>{t("admin.chainTemplates.status")}</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>{t("admin.chainTemplates.actions")}</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {templates.map((template) => (
                  <Table.Row
                    key={template.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => router.push(`/admin/chain-templates/${template.id}`)}
                  >
                    <Table.Cell>
                      <Flex gap="2" align="center">
                        <Text weight="medium">{template.code}</Text>
                        {template.systemTemplate && (
                          <Badge color="blue" size="1">
                            {t("admin.chainTemplates.systemTemplate")}
                          </Badge>
                        )}
                      </Flex>
                    </Table.Cell>
                    <Table.Cell>{template.name}</Table.Cell>
                    <Table.Cell>{template.fileTypeCode ?? "—"}</Table.Cell>
                    <Table.Cell>{template.stepCount}</Table.Cell>
                    <Table.Cell>
                      {template.totalDelayDays}{" "}
                      {template.delayUnit === "WORKING_HOURS"
                        ? t("admin.chainTemplates.workingHoursShort")
                        : t("admin.chainTemplates.workingDaysShort")}
                    </Table.Cell>
                    <Table.Cell>
                      <Badge color={template.active ? "green" : "gray"}>
                        {template.active ? t("common.active") : t("common.inactive")}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell onClick={(e) => e.stopPropagation()}>
                      <Flex gap="2">
                        <Button size="1" variant="soft" asChild>
                          <Link href={`/admin/chain-templates/${template.id}`}>
                            {t("admin.chainTemplates.view")}
                          </Link>
                        </Button>
                        {canUpdate && (
                          <Button size="1" variant="soft" asChild>
                            <Link href={`/admin/chain-templates/${template.id}/edit`}>
                              {t("admin.chainTemplates.edit")}
                            </Link>
                          </Button>
                        )}
                        {canUpdate && template.active && (
                          <Button size="1" variant="soft" color="orange" onClick={() => handleDeactivate(template)}>
                            {t("admin.chainTemplates.deactivate")}
                          </Button>
                        )}
                        {canDelete && !template.systemTemplate && (
                          <Button size="1" variant="soft" color="red" onClick={() => handleDelete(template)}>
                            {t("admin.chainTemplates.delete")}
                          </Button>
                        )}
                      </Flex>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Card>
        )}
      </AppShell>
    </RequireAuth>
  );
}
