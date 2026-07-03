"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  Flex,
  Table,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import {
  ApiError,
  createFileType,
  deactivateFileType,
  deleteFileType,
  getAllFileTypes,
  updateFileType,
} from "@/lib/api";
import { hasPermission } from "@/lib/auth-storage";
import type { FileType, FileTypeRequest } from "@/lib/types";
import { LoadingBlock, PageHeader, StatusAlert } from "@/components/ui/shared";

const EMPTY_FORM: FileTypeRequest = {
  code: "",
  name: "",
  nameEn: "",
  description: "",
  directionCode: "",
  sortOrder: 10,
  active: true,
};

function sortFileTypes(items: FileType[]): FileType[] {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder);
}

export default function AdminFileTypesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [types, setTypes] = useState<FileType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<FileTypeRequest>(EMPTY_FORM);

  const canWrite = hasPermission(user, "FILE_TYPES:CREATE");
  const canDelete = hasPermission(user, "FILE_TYPES:DELETE");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTypes(sortFileTypes(await getAllFileTypes()));
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
    setEditingId(null);
    setForm({ ...EMPTY_FORM, sortOrder: (types.length + 1) * 10 });
    setDialogOpen(true);
  }

  function openEditDialog(type: FileType) {
    setEditingId(type.id);
    setForm({
      code: type.code,
      name: type.name,
      nameEn: type.nameEn ?? "",
      description: type.description ?? "",
      directionCode: type.directionCode ?? "",
      sortOrder: type.sortOrder,
      active: type.active,
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    const payload: FileTypeRequest = {
      ...form,
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      nameEn: form.nameEn?.trim() || undefined,
      description: form.description?.trim() || undefined,
      directionCode: form.directionCode?.trim() || undefined,
    };
    try {
      if (editingId) {
        await updateFileType(editingId, payload);
        setSuccess(t("admin.fileTypes.updateSuccess"));
      } else {
        await createFileType(payload);
        setSuccess(t("admin.fileTypes.createSuccess"));
      }
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("admin.fileTypes.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(type: FileType) {
    if (!confirm(t("admin.fileTypes.deactivateConfirm", { code: type.code }))) return;
    try {
      await deactivateFileType(type.id);
      setSuccess(t("admin.fileTypes.deactivateSuccess"));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    }
  }

  async function handleDelete(type: FileType) {
    if (!confirm(t("admin.fileTypes.deleteConfirm", { code: type.code }))) return;
    setDeletingId(type.id);
    try {
      await deleteFileType(type.id);
      setSuccess(t("admin.fileTypes.deleteSuccess"));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("admin.fileTypes.deleteFailed"));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <RequireAuth permission="FILE_TYPES:READ">
      <AppShell>
        <PageHeader
          title={t("admin.fileTypes.title")}
          description={`${t("admin.fileTypes.description")} (${types.length})`}
          actions={
            canWrite ? (
              <Button onClick={openCreateDialog}>
                <PlusIcon /> {t("admin.fileTypes.create")}
              </Button>
            ) : undefined
          }
        />

        {error && <StatusAlert message={error} variant="error" />}
        {success && <StatusAlert message={success} variant="success" />}

        <Card size="3">
          {loading ? (
            <LoadingBlock message={t("admin.fileTypes.loading")} />
          ) : types.length === 0 ? (
            <Flex p="4">
              <Text color="gray">{t("admin.fileTypes.empty")}</Text>
            </Flex>
          ) : (
            <Table.Root variant="surface">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>{t("admin.fileTypes.code")}</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>{t("admin.fileTypes.name")}</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>{t("admin.fileTypes.direction")}</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>{t("admin.fileTypes.status")}</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>{t("admin.fileTypes.actions")}</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {types.map((type) => (
                  <Table.Row key={type.id}>
                    <Table.Cell>
                      <Text size="2" style={{ fontFamily: "var(--font-geist-mono)" }}>
                        {type.code}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>{type.name}</Table.Cell>
                    <Table.Cell>{type.directionCode ?? "—"}</Table.Cell>
                    <Table.Cell>
                      <Badge color={type.active ? "green" : "gray"} variant="soft">
                        {type.active ? t("common.active") : t("common.inactive")}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Flex gap="2" wrap="wrap">
                        {canWrite && (
                          <Button size="1" variant="soft" onClick={() => openEditDialog(type)}>
                            {t("admin.fileTypes.edit")}
                          </Button>
                        )}
                        {canWrite && type.active && (
                          <Button size="1" variant="soft" color="orange" onClick={() => handleDeactivate(type)}>
                            {t("admin.fileTypes.deactivate")}
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            size="1"
                            variant="soft"
                            color="red"
                            disabled={deletingId === type.id}
                            onClick={() => handleDelete(type)}
                          >
                            {t("admin.fileTypes.delete")}
                          </Button>
                        )}
                      </Flex>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </Card>

        <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
          <Dialog.Content maxWidth="520px">
            <Dialog.Title>
              {editingId ? t("admin.fileTypes.editTitle") : t("admin.fileTypes.createTitle")}
            </Dialog.Title>
            <Dialog.Description size="2" color="gray" mb="4">
              {editingId ? t("admin.fileTypes.editDescription") : t("admin.fileTypes.createDescription")}
            </Dialog.Description>

            <form onSubmit={handleSubmit}>
              <Flex direction="column" gap="3">
                <label>
                  <Text as="div" size="2" weight="medium" mb="1">
                    {t("admin.fileTypes.code")}
                  </Text>
                  <TextField.Root
                    required
                    disabled={!!editingId}
                    placeholder="COUR-STD"
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                    style={{ fontFamily: "var(--font-geist-mono)" }}
                  />
                </label>

                <label>
                  <Text as="div" size="2" weight="medium" mb="1">
                    {t("admin.fileTypes.name")}
                  </Text>
                  <TextField.Root
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </label>

                <label>
                  <Text as="div" size="2" weight="medium" mb="1">
                    {t("admin.fileTypes.descriptionField")}
                  </Text>
                  <TextArea
                    rows={2}
                    value={form.description ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </label>

                <label>
                  <Text as="div" size="2" weight="medium" mb="1">
                    {t("admin.fileTypes.direction")}
                  </Text>
                  <TextField.Root
                    placeholder="DAG"
                    value={form.directionCode ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, directionCode: e.target.value.toUpperCase() }))}
                  />
                </label>

                <label>
                  <Text as="div" size="2" weight="medium" mb="1">
                    {t("admin.fileTypes.sortOrder")}
                  </Text>
                  <TextField.Root
                    type="number"
                    value={String(form.sortOrder ?? 0)}
                    onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))}
                  />
                </label>

                <Text as="label" size="2">
                  <Flex gap="2" align="center">
                    <Checkbox
                      checked={form.active}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, active: v === true }))}
                    />
                    {t("common.active")}
                  </Flex>
                </Text>

                <Flex gap="2" justify="end" mt="2">
                  <Dialog.Close>
                    <Button type="button" variant="soft" color="gray">
                      {t("common.cancel")}
                    </Button>
                  </Dialog.Close>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? t("admin.fileTypes.saving") : t("admin.fileTypes.save")}
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
