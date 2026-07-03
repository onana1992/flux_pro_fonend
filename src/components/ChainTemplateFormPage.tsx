"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Card,
  Checkbox,
  Flex,
  Select,
  Table,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import { PlusIcon, TrashIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import {
  ApiError,
  createChainTemplate,
  getChainTemplate,
  getFileTypes,
  replaceChainTemplateSteps,
  updateChainTemplate,
} from "@/lib/api";
import type {
  ChainStepTemplate,
  ChainTemplateDetail,
  DelayUnit,
  FileType,
  UserRole,
} from "@/lib/types";
import { LoadingBlock, PageHeader, StatusAlert } from "@/components/ui/shared";

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

function emptyStep(order: number, closure = false): ChainStepTemplate {
  return {
    stepOrder: order,
    label: "",
    responsibleRole: "AGENT",
    delayValue: closure ? 0 : 1,
    delayUnit: "WORKING_DAYS",
    expectedAction: "",
    optional: false,
    closureStep: closure,
  };
}

function toWorkingDays(step: ChainStepTemplate): number {
  if (step.delayUnit === "WORKING_HOURS") return step.delayValue / 9;
  return step.delayValue;
}

function validateSteps(steps: ChainStepTemplate[], totalDelayDays: number): string | null {
  if (steps.length < 2) return "minSteps";
  const ordered = [...steps].sort((a, b) => a.stepOrder - b.stepOrder);
  for (let i = 0; i < ordered.length; i++) {
    if (ordered[i].stepOrder !== i + 1) return "orderGap";
  }
  const closures = ordered.filter((s) => s.closureStep);
  if (closures.length !== 1) return "closure";
  if (closures[0].delayValue !== 0) return "closureDelay";
  const sum = ordered.filter((s) => !s.closureStep).reduce((acc, s) => acc + toWorkingDays(s), 0);
  if (sum > totalDelayDays) return "delaySum";
  return null;
}

interface ChainTemplateFormPageProps {
  mode: "create" | "edit";
  template?: ChainTemplateDetail;
}

export function ChainTemplateFormPage({ mode, template }: ChainTemplateFormPageProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [code, setCode] = useState(template?.code ?? "");
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [fileTypeCode, setFileTypeCode] = useState(template?.fileTypeCode ?? "");
  const [totalDelayDays, setTotalDelayDays] = useState(template?.totalDelayDays ?? 10);
  const [delayUnit, setDelayUnit] = useState<DelayUnit>(template?.delayUnit ?? "WORKING_DAYS");
  const [steps, setSteps] = useState<ChainStepTemplate[]>(
    template?.steps?.length
      ? template.steps.map((s) => ({ ...s }))
      : [emptyStep(1), emptyStep(2, true)],
  );
  const [fileTypes, setFileTypes] = useState<FileType[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stepSum = useMemo(
    () => steps.filter((s) => !s.closureStep).reduce((acc, s) => acc + toWorkingDays(s), 0),
    [steps],
  );

  useEffect(() => {
    getFileTypes()
      .then(setFileTypes)
      .catch(() => {});
  }, []);

  function updateStep(index: number, patch: Partial<ChainStepTemplate>) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addStep() {
    setSteps((prev) => {
      const withoutClosure = prev.filter((s) => !s.closureStep);
      const closure = prev.find((s) => s.closureStep);
      const next = emptyStep(withoutClosure.length + 1);
      return [...withoutClosure, next, ...(closure ? [{ ...closure, stepOrder: withoutClosure.length + 2 }] : [])];
    });
  }

  function removeStep(index: number) {
    setSteps((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.map((s, i) => ({ ...s, stepOrder: i + 1 }));
    });
  }

  function setClosureStep(index: number) {
    setSteps((prev) =>
      prev.map((s, i) => ({
        ...s,
        closureStep: i === index,
        delayValue: i === index ? 0 : s.delayValue,
      })),
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validation = validateSteps(steps, totalDelayDays);
    if (validation) {
      setError(t(`admin.chainTemplates.errors.${validation}`));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const normalizedSteps = steps
        .sort((a, b) => a.stepOrder - b.stepOrder)
        .map((s) => ({
          ...s,
          label: s.label.trim(),
          expectedAction: s.expectedAction?.trim() || undefined,
        }));

      if (mode === "create") {
        const created = await createChainTemplate({
          code: code.trim().toUpperCase(),
          name: name.trim(),
          description: description.trim() || undefined,
          fileTypeCode: fileTypeCode || undefined,
          totalDelayDays,
          delayUnit,
          steps: normalizedSteps,
        });
        router.push(`/admin/chain-templates/${created.id}`);
      } else if (template) {
        await updateChainTemplate(template.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          fileTypeCode: fileTypeCode || undefined,
          totalDelayDays,
          delayUnit,
        });
        await replaceChainTemplateSteps(template.id, normalizedSteps);
        router.push(`/admin/chain-templates/${template.id}`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    } finally {
      setSubmitting(false);
    }
  }

  const permission = mode === "create" ? "CHAIN_TEMPLATES:CREATE" : "CHAIN_TEMPLATES:UPDATE";

  return (
    <RequireAuth permission={permission}>
      <AppShell>
        <PageHeader
          title={
            mode === "create"
              ? t("admin.chainTemplates.create")
              : t("admin.chainTemplates.editTitle", { code: template?.code })
          }
          description={t("admin.chainTemplates.formDescription")}
        />
        {error && <StatusAlert message={error} variant="error" />}

        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="4">
            <Card size="3">
              <Flex direction="column" gap="3">
                <Text weight="bold">{t("admin.chainTemplates.headerSection")}</Text>
                <Flex gap="3" wrap="wrap">
                  <Box style={{ flex: "1 1 200px" }}>
                    <Text as="label" size="2" weight="medium" mb="1">
                      {t("admin.chainTemplates.code")}
                    </Text>
                    <TextField.Root
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      disabled={mode === "edit"}
                      required
                      maxLength={10}
                    />
                  </Box>
                  <Box style={{ flex: "2 1 280px" }}>
                    <Text as="label" size="2" weight="medium" mb="1">
                      {t("admin.chainTemplates.name")}
                    </Text>
                    <TextField.Root value={name} onChange={(e) => setName(e.target.value)} required />
                  </Box>
                </Flex>
                <Box>
                  <Text as="label" size="2" weight="medium" mb="1">
                    {t("admin.chainTemplates.descriptionField")}
                  </Text>
                  <TextArea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                  />
                </Box>
                <Flex gap="3" wrap="wrap">
                  <Box style={{ flex: "1 1 200px" }}>
                    <Text as="label" size="2" weight="medium" mb="1">
                      {t("admin.chainTemplates.fileTypeCode")}
                    </Text>
                    <Select.Root value={fileTypeCode || "none"} onValueChange={(v) => setFileTypeCode(v === "none" ? "" : v)}>
                      <Select.Trigger />
                      <Select.Content>
                        <Select.Item value="none">—</Select.Item>
                        {fileTypes.map((ft) => (
                          <Select.Item key={ft.code} value={ft.code}>
                            {ft.code} — {ft.name}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </Box>
                  <Box style={{ flex: "1 1 140px" }}>
                    <Text as="label" size="2" weight="medium" mb="1">
                      {t("admin.chainTemplates.totalDelayDays")}
                    </Text>
                    <TextField.Root
                      type="number"
                      min={0}
                      value={totalDelayDays}
                      onChange={(e) => setTotalDelayDays(Number(e.target.value))}
                      required
                    />
                  </Box>
                  <Box style={{ flex: "1 1 180px" }}>
                    <Text as="label" size="2" weight="medium" mb="1">
                      {t("admin.chainTemplates.delayUnit")}
                    </Text>
                    <Select.Root value={delayUnit} onValueChange={(v) => setDelayUnit(v as DelayUnit)}>
                      <Select.Trigger />
                      <Select.Content>
                        <Select.Item value="WORKING_DAYS">{t("admin.chainTemplates.workingDays")}</Select.Item>
                        <Select.Item value="WORKING_HOURS">{t("admin.chainTemplates.workingHours")}</Select.Item>
                      </Select.Content>
                    </Select.Root>
                  </Box>
                </Flex>
                <Text size="1" color="gray">
                  {t("admin.chainTemplates.delaySumHint", {
                    sum: stepSum.toFixed(1),
                    total: totalDelayDays,
                  })}
                </Text>
              </Flex>
            </Card>

            <Card size="3">
              <Flex justify="between" align="center" mb="3">
                <Text weight="bold">{t("admin.chainTemplates.steps")}</Text>
                <Button type="button" variant="soft" onClick={addStep}>
                  <PlusIcon /> {t("admin.chainTemplates.addStep")}
                </Button>
              </Flex>
              <Table.Root variant="surface">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>#</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>{t("admin.chainTemplates.stepLabel")}</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>{t("admin.chainTemplates.responsibleRole")}</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>{t("admin.chainTemplates.delayValue")}</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>{t("admin.chainTemplates.expectedAction")}</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>{t("admin.chainTemplates.optional")}</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>{t("admin.chainTemplates.closureStep")}</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell />
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {steps
                    .sort((a, b) => a.stepOrder - b.stepOrder)
                    .map((step, index) => (
                      <Table.Row key={index}>
                        <Table.Cell>{step.stepOrder}</Table.Cell>
                        <Table.Cell>
                          <TextField.Root
                            value={step.label}
                            onChange={(e) => updateStep(index, { label: e.target.value })}
                            required
                          />
                        </Table.Cell>
                        <Table.Cell>
                          <Select.Root
                            value={step.responsibleRole}
                            onValueChange={(v) => updateStep(index, { responsibleRole: v as UserRole })}
                          >
                            <Select.Trigger />
                            <Select.Content>
                              {ROLES.map((r) => (
                                <Select.Item key={r} value={r}>
                                  {r}
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select.Root>
                        </Table.Cell>
                        <Table.Cell>
                          <Flex gap="1">
                            <TextField.Root
                              type="number"
                              min={0}
                              value={step.delayValue}
                              disabled={step.closureStep}
                              onChange={(e) => updateStep(index, { delayValue: Number(e.target.value) })}
                              style={{ width: 64 }}
                            />
                            <Select.Root
                              value={step.delayUnit}
                              disabled={step.closureStep}
                              onValueChange={(v) => updateStep(index, { delayUnit: v as DelayUnit })}
                            >
                              <Select.Trigger />
                              <Select.Content>
                                <Select.Item value="WORKING_DAYS">j.o.</Select.Item>
                                <Select.Item value="WORKING_HOURS">h</Select.Item>
                              </Select.Content>
                            </Select.Root>
                          </Flex>
                        </Table.Cell>
                        <Table.Cell>
                          <TextField.Root
                            value={step.expectedAction ?? ""}
                            onChange={(e) => updateStep(index, { expectedAction: e.target.value })}
                          />
                        </Table.Cell>
                        <Table.Cell>
                          <Checkbox
                            checked={step.optional}
                            onCheckedChange={(v) => updateStep(index, { optional: v === true })}
                          />
                        </Table.Cell>
                        <Table.Cell>
                          <Checkbox
                            checked={step.closureStep}
                            onCheckedChange={() => setClosureStep(index)}
                          />
                        </Table.Cell>
                        <Table.Cell>
                          {steps.length > 2 && (
                            <Button type="button" variant="ghost" color="red" onClick={() => removeStep(index)}>
                              <TrashIcon />
                            </Button>
                          )}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                </Table.Body>
              </Table.Root>
            </Card>

            <Flex gap="3" justify="end">
              <Button
                type="button"
                variant="soft"
                color="gray"
                onClick={() =>
                  router.push(
                    mode === "edit" && template
                      ? `/admin/chain-templates/${template.id}`
                      : "/admin/chain-templates",
                  )
                }
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? t("common.loading") : t("admin.chainTemplates.save")}
              </Button>
            </Flex>
          </Flex>
        </form>
      </AppShell>
    </RequireAuth>
  );
}

export function ChainTemplateFormLoader({
  mode,
  templateId,
}: {
  mode: "create" | "edit";
  templateId?: string;
}) {
  const { t } = useTranslation();
  const [template, setTemplate] = useState<ChainTemplateDetail | null>(null);
  const [loading, setLoading] = useState(mode === "edit");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "edit" || !templateId) return;
    setLoading(true);
    getChainTemplate(templateId)
      .then(setTemplate)
      .catch((err) => setError(err instanceof ApiError ? err.message : t("common.errorLoad")))
      .finally(() => setLoading(false));
  }, [mode, templateId, t]);

  if (mode === "edit" && loading) {
    return (
      <RequireAuth permission="CHAIN_TEMPLATES:UPDATE">
        <AppShell>
          <LoadingBlock />
        </AppShell>
      </RequireAuth>
    );
  }

  if (mode === "edit" && (error || !template)) {
    return (
      <RequireAuth permission="CHAIN_TEMPLATES:UPDATE">
        <AppShell>
          <StatusAlert message={error ?? t("common.errorLoad")} variant="error" />
        </AppShell>
      </RequireAuth>
    );
  }

  return <ChainTemplateFormPage mode={mode} template={template ?? undefined} />;
}
