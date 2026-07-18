"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, Checkbox, Dialog, Flex, Select, Table, Text, TextField } from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import {
  ApiError,
  activateAlertRule,
  applyDefaultAlertProfile,
  createAlertRule,
  deactivateAlertRule,
  deleteAlertRule,
  getActiveAlertTypes,
  listAlertRules,
  updateAlertRule,
} from "@/lib/api";
import type { AlertRule, AlertRuleRequest, AlertTargetMode, AlertType, ChainStepTemplate, DelayUnit, UserRole } from "@/lib/types";
import { preventDialogDismissFromPortals } from "@/lib/dialog-portals";
import { LoadingBlock, StatusAlert } from "@/components/ui/shared";

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

const EMPTY_FORM: AlertRuleRequest = {
  chainStepTemplateId: undefined,
  thresholdCode: "",
  offsetValue: 0,
  offsetUnit: "WORKING_DAYS",
  alertTypeId: "",
  escalationLevel: undefined,
  targetMode: "ROLE",
  targetRole: undefined,
  priorityScope: undefined,
  active: true,
};

export function AlertRulesPanel({
  chainTemplateId,
  steps,
  canRead,
  canWrite,
  canDelete,
}: {
  chainTemplateId: string;
  steps: ChainStepTemplate[];
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
}) {
  const { t } = useTranslation();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [alertTypes, setAlertTypes] = useState<AlertType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [applyingProfile, setApplyingProfile] = useState(false);
  const [form, setForm] = useState<AlertRuleRequest>(EMPTY_FORM);

  const load = useCallback(async () => {
    if (!canRead) return;
    setLoading(true);
    setError(null);
    try {
      const [ruleList, types] = await Promise.all([
        listAlertRules(chainTemplateId),
        getActiveAlertTypes(),
      ]);
      setRules(ruleList);
      setAlertTypes(types);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [chainTemplateId, canRead, t]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreateDialog() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, alertTypeId: alertTypes[0]?.id ?? "" });
    setDialogOpen(true);
  }

  function openEditDialog(rule: AlertRule) {
    setEditingId(rule.id);
    setForm({
      chainStepTemplateId: rule.chainStepTemplateId ?? undefined,
      thresholdCode: rule.thresholdCode,
      offsetValue: rule.offsetValue,
      offsetUnit: rule.offsetUnit,
      alertTypeId: rule.alertTypeId,
      escalationLevel: rule.escalationLevel ?? undefined,
      targetMode: rule.targetMode,
      targetRole: rule.targetRole ?? undefined,
      priorityScope: rule.priorityScope ?? undefined,
      active: rule.active,
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (form.targetMode === "ROLE" && !form.targetRole) {
      setError(t("admin.chainTemplates.alerts.targetRoleRequired"));
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    const payload: AlertRuleRequest = {
      ...form,
      thresholdCode: form.thresholdCode.trim().toUpperCase(),
      targetRole: form.targetMode === "ROLE" ? form.targetRole : undefined,
      priorityScope: form.priorityScope || undefined,
      chainStepTemplateId: form.chainStepTemplateId || undefined,
    };
    try {
      if (editingId) {
        await updateAlertRule(chainTemplateId, editingId, payload);
      } else {
        await createAlertRule(chainTemplateId, payload);
      }
      setSuccess(t("admin.chainTemplates.alerts.saveSuccess"));
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("admin.chainTemplates.alerts.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(rule: AlertRule) {
    try {
      if (rule.active) {
        await deactivateAlertRule(chainTemplateId, rule.id);
      } else {
        await activateAlertRule(chainTemplateId, rule.id);
      }
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    }
  }

  async function handleDelete(rule: AlertRule) {
    if (!confirm(t("admin.chainTemplates.alerts.deleteConfirm"))) return;
    try {
      await deleteAlertRule(chainTemplateId, rule.id);
      setSuccess(t("admin.chainTemplates.alerts.saveSuccess"));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    }
  }

  async function handleApplyDefaultProfile() {
    if (!confirm(t("admin.chainTemplates.alerts.applyDefaultProfileConfirm"))) return;
    setApplyingProfile(true);
    setError(null);
    try {
      const created = await applyDefaultAlertProfile(chainTemplateId, false);
      setSuccess(t("admin.chainTemplates.alerts.applyDefaultProfileSuccess", { count: created.length }));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    } finally {
      setApplyingProfile(false);
    }
  }

  if (!canRead) return null;

  return (
    <Card size="3">
      <Flex justify="between" align="center" mb="3" wrap="wrap" gap="2">
        <div>
          <Text weight="bold">{t("admin.chainTemplates.alerts.title")}</Text>
          <Text as="p" size="2" color="gray">
            {t("admin.chainTemplates.alerts.description")}
          </Text>
        </div>
        <Flex gap="2" wrap="wrap">
          {canWrite && rules.length === 0 && !loading && (
            <Button variant="soft" onClick={handleApplyDefaultProfile} disabled={applyingProfile}>
              {t("admin.chainTemplates.alerts.applyDefaultProfile")}
            </Button>
          )}
          {canWrite && (
            <Button onClick={openCreateDialog}>
              <PlusIcon /> {t("admin.chainTemplates.alerts.addRule")}
            </Button>
          )}
        </Flex>
      </Flex>

      {error && <StatusAlert message={error} variant="error" />}
      {success && <StatusAlert message={success} variant="success" />}

      {loading ? (
        <LoadingBlock />
      ) : rules.length === 0 ? (
        <Flex p="4">
          <Text color="gray">{t("admin.chainTemplates.alerts.empty")}</Text>
        </Flex>
      ) : (
        <Table.Root variant="surface">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>{t("admin.chainTemplates.alerts.threshold")}</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>{t("admin.chainTemplates.alerts.step")}</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>{t("admin.chainTemplates.alerts.alertType")}</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>{t("admin.chainTemplates.alerts.targetRole")}</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>{t("admin.chainTemplates.alerts.priorityScope")}</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>{t("admin.chainTemplates.alerts.status")}</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>{t("admin.chainTemplates.alerts.actions")}</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rules.map((rule) => (
              <Table.Row key={rule.id}>
                <Table.Cell>
                  <Text size="2" style={{ fontFamily: "var(--font-geist-mono)" }}>
                    {rule.thresholdCode}
                  </Text>
                  <Text as="p" size="1" color="gray">
                    {rule.offsetValue >= 0 ? "+" : ""}
                    {rule.offsetValue} {rule.offsetUnit === "WORKING_HOURS" ? "h" : "j.o."}
                  </Text>
                </Table.Cell>
                <Table.Cell>{rule.chainStepTemplateLabel ?? t("admin.chainTemplates.alerts.allSteps")}</Table.Cell>
                <Table.Cell>
                  {rule.alertTypeLabel}
                  {rule.escalationLevel != null && (
                    <Badge ml="2" size="1" variant="soft" color="orange">
                      N{rule.escalationLevel}
                    </Badge>
                  )}
                </Table.Cell>
                <Table.Cell>
                  {rule.targetMode === "CURRENT_RESPONSIBLE"
                    ? t("admin.chainTemplates.alerts.targetModeCurrentResponsible")
                    : rule.targetRole}
                </Table.Cell>
                <Table.Cell>
                  {rule.priorityScope === "URGENT_PLUS"
                    ? t("admin.chainTemplates.alerts.priorityScopeUrgentPlus")
                    : t("admin.chainTemplates.alerts.priorityScopeAll")}
                </Table.Cell>
                <Table.Cell>
                  <Badge color={rule.active ? "green" : "gray"} variant="soft">
                    {rule.active ? t("common.active") : t("common.inactive")}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <Flex gap="2" wrap="wrap">
                    {canWrite && (
                      <Button size="1" variant="soft" onClick={() => openEditDialog(rule)}>
                        {t("admin.alertTypes.edit")}
                      </Button>
                    )}
                    {canWrite && (
                      <Button
                        size="1"
                        variant="soft"
                        color={rule.active ? "orange" : "green"}
                        onClick={() => handleToggleActive(rule)}
                      >
                        {rule.active
                          ? t("admin.chainTemplates.alerts.deactivate")
                          : t("admin.chainTemplates.alerts.activate")}
                      </Button>
                    )}
                    {canDelete && (
                      <Button size="1" variant="soft" color="red" onClick={() => handleDelete(rule)}>
                        {t("admin.chainTemplates.alerts.delete")}
                      </Button>
                    )}
                  </Flex>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}

      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Content
          maxWidth="560px"
          onPointerDownOutside={preventDialogDismissFromPortals}
          onInteractOutside={preventDialogDismissFromPortals}
          onFocusOutside={preventDialogDismissFromPortals}
        >
          <Dialog.Title>
            {editingId ? t("admin.chainTemplates.alerts.editRule") : t("admin.chainTemplates.alerts.addRule")}
          </Dialog.Title>

          <form onSubmit={handleSubmit}>
            <Flex direction="column" gap="3">
              <Flex gap="3" wrap="wrap">
                <label style={{ flex: 1, minWidth: 160 }}>
                  <Text as="div" size="2" weight="medium" mb="1">
                    {t("admin.chainTemplates.alerts.threshold")}
                  </Text>
                  <TextField.Root
                    required
                    placeholder={t("admin.chainTemplates.alerts.thresholdPlaceholder")}
                    value={form.thresholdCode}
                    onChange={(e) => setForm((f) => ({ ...f, thresholdCode: e.target.value.toUpperCase() }))}
                    style={{ fontFamily: "var(--font-geist-mono)" }}
                  />
                </label>

                <label style={{ flex: 1, minWidth: 160 }}>
                  <Text as="div" size="2" weight="medium" mb="1">
                    {t("admin.chainTemplates.alerts.step")}
                  </Text>
                  <Select.Root
                    value={form.chainStepTemplateId ?? "all"}
                    onValueChange={(v) => setForm((f) => ({ ...f, chainStepTemplateId: v === "all" ? undefined : v }))}
                  >
                    <Select.Trigger style={{ width: "100%" }} />
                    <Select.Content position="popper">
                      <Select.Item value="all">{t("admin.chainTemplates.alerts.allSteps")}</Select.Item>
                      {steps.map((s) => (
                        <Select.Item key={s.id ?? s.stepOrder} value={s.id ?? String(s.stepOrder)}>
                          {s.stepOrder}. {s.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </label>
              </Flex>

              <Flex gap="3" wrap="wrap">
                <label style={{ flex: 1, minWidth: 100 }}>
                  <Text as="div" size="2" weight="medium" mb="1">
                    {t("admin.chainTemplates.alerts.offsetValue")}
                  </Text>
                  <TextField.Root
                    type="number"
                    required
                    value={String(form.offsetValue)}
                    onChange={(e) => setForm((f) => ({ ...f, offsetValue: Number(e.target.value) }))}
                  />
                </label>
                <label style={{ flex: 1, minWidth: 140 }}>
                  <Text as="div" size="2" weight="medium" mb="1">
                    {t("admin.chainTemplates.alerts.offsetUnit")}
                  </Text>
                  <Select.Root
                    value={form.offsetUnit}
                    onValueChange={(v) => setForm((f) => ({ ...f, offsetUnit: v as DelayUnit }))}
                  >
                    <Select.Trigger style={{ width: "100%" }} />
                    <Select.Content position="popper">
                      <Select.Item value="WORKING_DAYS">{t("admin.chainTemplates.workingDays")}</Select.Item>
                      <Select.Item value="WORKING_HOURS">{t("admin.chainTemplates.workingHours")}</Select.Item>
                    </Select.Content>
                  </Select.Root>
                </label>
                <label style={{ flex: 1, minWidth: 100 }}>
                  <Text as="div" size="2" weight="medium" mb="1">
                    {t("admin.chainTemplates.alerts.escalationLevel")}
                  </Text>
                  <TextField.Root
                    type="number"
                    min={1}
                    value={form.escalationLevel != null ? String(form.escalationLevel) : ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        escalationLevel: e.target.value ? Number(e.target.value) : undefined,
                      }))
                    }
                  />
                </label>
              </Flex>

              <label>
                <Text as="div" size="2" weight="medium" mb="1">
                  {t("admin.chainTemplates.alerts.alertType")}
                </Text>
                <Select.Root
                  value={form.alertTypeId}
                  onValueChange={(v) => setForm((f) => ({ ...f, alertTypeId: v }))}
                >
                  <Select.Trigger style={{ width: "100%" }} />
                  <Select.Content position="popper">
                    {alertTypes.map((at) => (
                      <Select.Item key={at.id} value={at.id}>
                        {at.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </label>

              <Flex gap="3" wrap="wrap">
                <label style={{ flex: 1, minWidth: 180 }}>
                  <Text as="div" size="2" weight="medium" mb="1">
                    {t("admin.chainTemplates.alerts.targetMode")}
                  </Text>
                  <Select.Root
                    value={form.targetMode}
                    onValueChange={(v) => setForm((f) => ({ ...f, targetMode: v as AlertTargetMode }))}
                  >
                    <Select.Trigger style={{ width: "100%" }} />
                    <Select.Content position="popper">
                      <Select.Item value="CURRENT_RESPONSIBLE">
                        {t("admin.chainTemplates.alerts.targetModeCurrentResponsible")}
                      </Select.Item>
                      <Select.Item value="ROLE">{t("admin.chainTemplates.alerts.targetModeRole")}</Select.Item>
                    </Select.Content>
                  </Select.Root>
                </label>

                {form.targetMode === "ROLE" && (
                  <label style={{ flex: 1, minWidth: 180 }}>
                    <Text as="div" size="2" weight="medium" mb="1">
                      {t("admin.chainTemplates.alerts.targetRole")}
                    </Text>
                    <Select.Root
                      value={form.targetRole ?? ""}
                      onValueChange={(v) => setForm((f) => ({ ...f, targetRole: v as UserRole }))}
                    >
                      <Select.Trigger style={{ width: "100%" }} />
                      <Select.Content position="popper">
                        {ROLES.map((r) => (
                          <Select.Item key={r} value={r}>
                            {r}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </label>
                )}
              </Flex>

              <label>
                <Text as="div" size="2" weight="medium" mb="1">
                  {t("admin.chainTemplates.alerts.priorityScope")}
                </Text>
                <Select.Root
                  value={form.priorityScope ?? "all"}
                  onValueChange={(v) => setForm((f) => ({ ...f, priorityScope: v === "all" ? undefined : v }))}
                >
                  <Select.Trigger style={{ width: "100%" }} />
                  <Select.Content position="popper">
                    <Select.Item value="all">{t("admin.chainTemplates.alerts.priorityScopeAll")}</Select.Item>
                    <Select.Item value="URGENT_PLUS">
                      {t("admin.chainTemplates.alerts.priorityScopeUrgentPlus")}
                    </Select.Item>
                  </Select.Content>
                </Select.Root>
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
                <Button type="submit" disabled={submitting || !form.alertTypeId}>
                  {submitting
                    ? t("admin.chainTemplates.alerts.saving")
                    : t("admin.chainTemplates.alerts.save")}
                </Button>
              </Flex>
            </Flex>
          </form>
        </Dialog.Content>
      </Dialog.Root>
    </Card>
  );
}
