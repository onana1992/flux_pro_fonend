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
  activateAlertType,
  createAlertType,
  deactivateAlertType,
  deleteAlertType,
  getAllAlertTypes,
  updateAlertType,
} from "@/lib/api";
import { hasPermission } from "@/lib/auth-storage";
import type { AlertType, AlertTypeRequest } from "@/lib/types";
import { LoadingBlock, PageHeader, StatusAlert } from "@/components/ui/shared";

const EMPTY_FORM: AlertTypeRequest = {
  code: "",
  label: "",
  description: "",
  emailTemplateCode: "",
  active: true,
};

export default function AdminAlertTypesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [types, setTypes] = useState<AlertType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<AlertTypeRequest>(EMPTY_FORM);

  const canWrite = hasPermission(user, "ALERT_TYPES:CREATE");
  const canDelete = hasPermission(user, "ALERT_TYPES:DELETE");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTypes(await getAllAlertTypes());
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
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEditDialog(type: AlertType) {
    setEditingId(type.id);
    setForm({
      code: type.code,
      label: type.label,
      description: type.description ?? "",
      emailTemplateCode: type.emailTemplateCode ?? "",
      active: type.active,
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    const payload: AlertTypeRequest = {
      ...form,
      code: form.code.trim().toUpperCase(),
      label: form.label.trim(),
      description: form.description?.trim() || undefined,
      emailTemplateCode: form.emailTemplateCode?.trim() || undefined,
    };
    try {
      if (editingId) {
        await updateAlertType(editingId, payload);
        setSuccess(t("admin.alertTypes.updateSuccess"));
      } else {
        await createAlertType(payload);
        setSuccess(t("admin.alertTypes.createSuccess"));
      }
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("admin.alertTypes.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(type: AlertType) {
    if (!confirm(t("admin.alertTypes.deactivateConfirm", { code: type.code }))) return;
    try {
      await deactivateAlertType(type.id);
      setSuccess(t("admin.alertTypes.deactivateSuccess"));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    }
  }

  async function handleActivate(type: AlertType) {
    try {
      await activateAlertType(type.id);
      setSuccess(t("admin.alertTypes.deactivateSuccess"));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    }
  }

  async function handleDelete(type: AlertType) {
    if (!confirm(t("admin.alertTypes.deleteConfirm", { code: type.code }))) return;
    setDeletingId(type.id);
    try {
      await deleteAlertType(type.id);
      setSuccess(t("admin.alertTypes.deleteSuccess"));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("admin.alertTypes.deleteFailed"));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <RequireAuth permission="ALERT_TYPES:READ">
      <AppShell>
        <PageHeader
          title={t("admin.alertTypes.title")}
          description={`${t("admin.alertTypes.description")} (${types.length})`}
          actions={
            canWrite ? (
              <Button onClick={openCreateDialog}>
                <PlusIcon /> {t("admin.alertTypes.create")}
              </Button>
            ) : undefined
          }
        />

        {error && <StatusAlert message={error} variant="error" />}
        {success && <StatusAlert message={success} variant="success" />}

        <Card size="3">
          {loading ? (
            <LoadingBlock message={t("admin.alertTypes.loading")} />
          ) : types.length === 0 ? (
            <Flex p="4">
              <Text color="gray">{t("admin.alertTypes.empty")}</Text>
            </Flex>
          ) : (
            <Table.Root variant="surface">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>{t("admin.alertTypes.code")}</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>{t("admin.alertTypes.label")}</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>{t("admin.alertTypes.emailTemplateCode")}</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>{t("admin.alertTypes.origin")}</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>{t("admin.alertTypes.status")}</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>{t("admin.alertTypes.actions")}</Table.ColumnHeaderCell>
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
                    <Table.Cell>{type.label}</Table.Cell>
                    <Table.Cell>
                      <Text size="2" color="gray">
                        {type.emailTemplateCode ?? t("admin.alertTypes.emailTemplateGeneric")}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge color={type.systemDefined ? "blue" : "gray"} variant="soft">
                        {type.systemDefined ? t("admin.alertTypes.systemDefined") : t("admin.alertTypes.custom")}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge color={type.active ? "green" : "gray"} variant="soft">
                        {type.active ? t("common.active") : t("common.inactive")}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Flex gap="2" wrap="wrap">
                        {canWrite && (
                          <Button size="1" variant="soft" onClick={() => openEditDialog(type)}>
                            {t("admin.alertTypes.edit")}
                          </Button>
                        )}
                        {canWrite && type.active && (
                          <Button size="1" variant="soft" color="orange" onClick={() => handleDeactivate(type)}>
                            {t("admin.alertTypes.deactivate")}
                          </Button>
                        )}
                        {canWrite && !type.active && (
                          <Button size="1" variant="soft" color="green" onClick={() => handleActivate(type)}>
                            {t("admin.chainTemplates.activate")}
                          </Button>
                        )}
                        {canDelete && !type.systemDefined && (
                          <Button
                            size="1"
                            variant="soft"
                            color="red"
                            disabled={deletingId === type.id}
                            onClick={() => handleDelete(type)}
                          >
                            {t("admin.alertTypes.delete")}
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
              {editingId ? t("admin.alertTypes.editTitle") : t("admin.alertTypes.createTitle")}
            </Dialog.Title>
            <Dialog.Description size="2" color="gray" mb="4">
              {editingId ? t("admin.alertTypes.editDescription") : t("admin.alertTypes.createDescription")}
            </Dialog.Description>

            <form onSubmit={handleSubmit}>
              <Flex direction="column" gap="3">
                <label>
                  <Text as="div" size="2" weight="medium" mb="1">
                    {t("admin.alertTypes.code")}
                  </Text>
                  <TextField.Root
                    required
                    disabled={!!editingId}
                    placeholder="REMINDER"
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                    style={{ fontFamily: "var(--font-geist-mono)" }}
                  />
                </label>

                <label>
                  <Text as="div" size="2" weight="medium" mb="1">
                    {t("admin.alertTypes.label")}
                  </Text>
                  <TextField.Root
                    required
                    value={form.label}
                    onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  />
                </label>

                <label>
                  <Text as="div" size="2" weight="medium" mb="1">
                    {t("admin.alertTypes.descriptionField")}
                  </Text>
                  <TextArea
                    rows={2}
                    value={form.description ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </label>

                <label>
                  <Text as="div" size="2" weight="medium" mb="1">
                    {t("admin.alertTypes.emailTemplateCode")}
                  </Text>
                  <TextField.Root
                    placeholder="alert-reminder"
                    value={form.emailTemplateCode ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, emailTemplateCode: e.target.value }))}
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
                    {submitting ? t("admin.alertTypes.saving") : t("admin.alertTypes.save")}
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
