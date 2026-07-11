"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  Checkbox,
  Flex,
  Grid,
  Select,
  Table,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import { DragHandleDots2Icon, PlusIcon, TrashIcon } from "@radix-ui/react-icons";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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

/* React 19 + @dnd-kit JSX typing mismatch */
/* eslint-disable @typescript-eslint/no-explicit-any */
const DndContextHost = DndContext as any;
const SortableContextHost = SortableContext as any;
/* eslint-enable @typescript-eslint/no-explicit-any */

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

type FormStep = ChainStepTemplate & { clientKey: string };

function newClientKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `step-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <Flex direction="column" gap="1" style={{ minWidth: 0 }}>
      <Text as="label" size="2" weight="medium">
        {label}
        {required && (
          <Text as="span" color="red">
            {" "}
            *
          </Text>
        )}
      </Text>
      {children}
    </Flex>
  );
}

function emptyStep(order: number, closure = false): FormStep {
  return {
    clientKey: newClientKey(),
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

function toFormSteps(steps: ChainStepTemplate[]): FormStep[] {
  return [...steps]
    .sort((a, b) =>
      a.stepOrder !== b.stepOrder
        ? a.stepOrder - b.stepOrder
        : (a.label || "").localeCompare(b.label || ""),
    )
    .map((s) => ({ ...s, clientKey: s.id ?? newClientKey() }));
}

function toWorkingDays(step: ChainStepTemplate): number {
  if (step.delayUnit === "WORKING_HOURS") return step.delayValue / 9;
  return step.delayValue;
}

function validateSteps(steps: ChainStepTemplate[], totalDelayDays: number): string | null {
  if (steps.length < 2) return "minSteps";
  const stages = [...new Set(steps.map((s) => s.stepOrder))].sort((a, b) => a - b);
  for (let i = 0; i < stages.length; i++) {
    if (stages[i] !== i + 1) return "orderGap";
  }
  const closures = steps.filter((s) => s.closureStep);
  if (closures.length !== 1) return "closure";
  const closure = closures[0];
  if (closure.delayValue !== 0) return "closureDelay";
  const lastStage = stages[stages.length - 1];
  const lastStageSteps = steps.filter((s) => s.stepOrder === lastStage);
  if (closure.stepOrder !== lastStage || lastStageSteps.length !== 1) return "parallelClosure";
  const sum = stages
    .filter((stage) => stage !== lastStage)
    .reduce((acc, stage) => {
      const stageMax = Math.max(
        ...steps.filter((s) => s.stepOrder === stage).map((s) => toWorkingDays(s)),
      );
      return acc + stageMax;
    }, 0);
  if (sum > totalDelayDays) return "delaySum";
  return null;
}

/** After a drag reorder: keep closure last, assign sequential stage numbers. */
function renumberAfterReorder(steps: FormStep[]): FormStep[] {
  const closure = steps.find((s) => s.closureStep);
  const others = steps.filter((s) => !s.closureStep);
  const ordered = [...others, ...(closure ? [closure] : [])];
  return ordered.map((s, i) => ({ ...s, stepOrder: i + 1 }));
}

function SortableStepRow({
  step,
  index,
  stepsCount,
  onUpdate,
  onAddParallel,
  onRemove,
  onSetClosure,
}: {
  step: FormStep;
  index: number;
  stepsCount: number;
  onUpdate: (index: number, patch: Partial<ChainStepTemplate>) => void;
  onAddParallel: (index: number) => void;
  onRemove: (index: number) => void;
  onSetClosure: (index: number) => void;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.clientKey,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    background: isDragging ? "var(--accent-a3)" : undefined,
    position: "relative" as const,
    zIndex: isDragging ? 1 : undefined,
  };

  return (
    <Table.Row ref={setNodeRef} style={style}>
      <Table.Cell>
        <Flex align="center" gap="2">
          <button
            type="button"
            aria-label={t("admin.chainTemplates.dragHandle")}
            title={t("admin.chainTemplates.dragHandle")}
            {...attributes}
            {...listeners}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: isDragging ? "grabbing" : "grab",
              border: "none",
              background: "transparent",
              padding: 4,
              color: "var(--gray-11)",
              touchAction: "none",
            }}
          >
            <DragHandleDots2Icon width={16} height={16} />
          </button>
          <TextField.Root
            type="number"
            min={1}
            value={step.stepOrder}
            disabled={step.closureStep}
            onChange={(e) => onUpdate(index, { stepOrder: Number(e.target.value) || 1 })}
            style={{ width: 64 }}
          />
        </Flex>
      </Table.Cell>
      <Table.Cell>
        <TextField.Root
          value={step.label}
          onChange={(e) => onUpdate(index, { label: e.target.value })}
          required
        />
      </Table.Cell>
      <Table.Cell>
        <Select.Root
          value={step.responsibleRole}
          onValueChange={(v) => onUpdate(index, { responsibleRole: v as UserRole })}
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
            onChange={(e) => onUpdate(index, { delayValue: Number(e.target.value) })}
            style={{ width: 64 }}
          />
          <Select.Root
            value={step.delayUnit}
            disabled={step.closureStep}
            onValueChange={(v) => onUpdate(index, { delayUnit: v as DelayUnit })}
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
          onChange={(e) => onUpdate(index, { expectedAction: e.target.value })}
        />
      </Table.Cell>
      <Table.Cell>
        <Checkbox
          checked={step.optional}
          onCheckedChange={(v) => onUpdate(index, { optional: v === true })}
        />
      </Table.Cell>
      <Table.Cell>
        <Checkbox checked={step.closureStep} onCheckedChange={() => onSetClosure(index)} />
      </Table.Cell>
      <Table.Cell>
        <Flex gap="1">
          {!step.closureStep && (
            <Button
              type="button"
              variant="ghost"
              size="1"
              onClick={() => onAddParallel(index)}
              title={t("admin.chainTemplates.addParallel")}
            >
              <PlusIcon />
            </Button>
          )}
          {stepsCount > 2 && (
            <Button type="button" variant="ghost" color="red" onClick={() => onRemove(index)}>
              <TrashIcon />
            </Button>
          )}
        </Flex>
      </Table.Cell>
    </Table.Row>
  );
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
  const [steps, setSteps] = useState<FormStep[]>(
    template?.steps?.length ? toFormSteps(template.steps) : [emptyStep(1), emptyStep(2, true)],
  );
  const [fileTypes, setFileTypes] = useState<FileType[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const sortedSteps = useMemo(
    () =>
      [...steps].sort((a, b) =>
        a.stepOrder !== b.stepOrder
          ? a.stepOrder - b.stepOrder
          : a.clientKey.localeCompare(b.clientKey),
      ),
    [steps],
  );

  const sortableIds = useMemo(() => sortedSteps.map((s) => s.clientKey), [sortedSteps]);

  const stepSum = useMemo(() => {
    const stages = [...new Set(steps.map((s) => s.stepOrder))].sort((a, b) => a - b);
    const lastStage = stages[stages.length - 1];
    return stages
      .filter((stage) => stage !== lastStage)
      .reduce((acc, stage) => {
        const stageMax = Math.max(
          ...steps.filter((s) => s.stepOrder === stage).map((s) => toWorkingDays(s)),
        );
        return acc + stageMax;
      }, 0);
  }, [steps]);

  useEffect(() => {
    getFileTypes()
      .then(setFileTypes)
      .catch(() => {});
  }, []);

  function updateStep(index: number, patch: Partial<ChainStepTemplate>) {
    setSteps((prev) => {
      const sorted = [...prev].sort((a, b) =>
        a.stepOrder !== b.stepOrder
          ? a.stepOrder - b.stepOrder
          : a.clientKey.localeCompare(b.clientKey),
      );
      const targetKey = sorted[index]?.clientKey;
      if (!targetKey) return prev;
      return prev.map((s) => (s.clientKey === targetKey ? { ...s, ...patch } : s));
    });
  }

  function addStep() {
    setSteps((prev) => {
      const withoutClosure = prev.filter((s) => !s.closureStep);
      const closure = prev.find((s) => s.closureStep);
      const maxStage = withoutClosure.reduce((max, s) => Math.max(max, s.stepOrder), 0);
      const nextStage = maxStage + 1;
      const next = emptyStep(nextStage);
      return [
        ...withoutClosure,
        next,
        ...(closure ? [{ ...closure, stepOrder: nextStage + 1 }] : []),
      ];
    });
  }

  function addParallelStep(index: number) {
    setSteps((prev) => {
      const sorted = [...prev].sort((a, b) =>
        a.stepOrder !== b.stepOrder
          ? a.stepOrder - b.stepOrder
          : a.clientKey.localeCompare(b.clientKey),
      );
      const ref = sorted[index];
      if (!ref || ref.closureStep) return prev;
      const parallel = emptyStep(ref.stepOrder);
      const insertAt = prev.findIndex((s) => s.clientKey === ref.clientKey);
      if (insertAt < 0) return prev;
      const next = [...prev];
      next.splice(insertAt + 1, 0, parallel);
      return next;
    });
  }

  function removeStep(index: number) {
    setSteps((prev) => {
      const sorted = [...prev].sort((a, b) =>
        a.stepOrder !== b.stepOrder
          ? a.stepOrder - b.stepOrder
          : a.clientKey.localeCompare(b.clientKey),
      );
      const targetKey = sorted[index]?.clientKey;
      if (!targetKey) return prev;
      return prev.filter((s) => s.clientKey !== targetKey);
    });
  }

  function setClosureStep(index: number) {
    setSteps((prev) => {
      const sorted = [...prev].sort((a, b) =>
        a.stepOrder !== b.stepOrder
          ? a.stepOrder - b.stepOrder
          : a.clientKey.localeCompare(b.clientKey),
      );
      const targetKey = sorted[index]?.clientKey;
      if (!targetKey) return prev;
      return prev.map((s) => ({
        ...s,
        closureStep: s.clientKey === targetKey,
        delayValue: s.clientKey === targetKey ? 0 : s.delayValue,
      }));
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setSteps((prev) => {
      const sorted = [...prev].sort((a, b) =>
        a.stepOrder !== b.stepOrder
          ? a.stepOrder - b.stepOrder
          : a.clientKey.localeCompare(b.clientKey),
      );
      const oldIndex = sorted.findIndex((s) => s.clientKey === active.id);
      const newIndex = sorted.findIndex((s) => s.clientKey === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return renumberAfterReorder(arrayMove(sorted, oldIndex, newIndex));
    });
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
      const normalizedSteps = [...steps]
        .sort((a, b) =>
          a.stepOrder !== b.stepOrder
            ? a.stepOrder - b.stepOrder
            : a.clientKey.localeCompare(b.clientKey),
        )
        .map((s) => ({
          id: s.id,
          stepOrder: s.stepOrder,
          label: s.label.trim(),
          responsibleRole: s.responsibleRole,
          delayValue: s.delayValue,
          delayUnit: s.delayUnit,
          expectedAction: s.expectedAction?.trim() || undefined,
          optional: s.optional,
          closureStep: s.closureStep,
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
              <Flex direction="column" gap="4">
                <Text weight="bold">{t("admin.chainTemplates.headerSection")}</Text>
                <Grid columns={{ initial: "1", sm: "1fr 2fr" }} gap="3">
                  <FormField label={t("admin.chainTemplates.code")} required>
                    <TextField.Root
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      disabled={mode === "edit"}
                      required
                      maxLength={10}
                    />
                  </FormField>
                  <FormField label={t("admin.chainTemplates.name")} required>
                    <TextField.Root value={name} onChange={(e) => setName(e.target.value)} required />
                  </FormField>
                </Grid>
                <FormField label={t("admin.chainTemplates.descriptionField")}>
                  <TextArea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                  />
                </FormField>
                <Grid columns={{ initial: "1", sm: "3" }} gap="3">
                  <FormField label={t("admin.chainTemplates.fileTypeCode")}>
                    <Select.Root
                      value={fileTypeCode || "none"}
                      onValueChange={(v) => setFileTypeCode(v === "none" ? "" : v)}
                    >
                      <Select.Trigger style={{ width: "100%" }} />
                      <Select.Content>
                        <Select.Item value="none">—</Select.Item>
                        {fileTypes.map((ft) => (
                          <Select.Item key={ft.code} value={ft.code}>
                            {ft.code} — {ft.name}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </FormField>
                  <FormField label={t("admin.chainTemplates.totalDelayDays")} required>
                    <TextField.Root
                      type="number"
                      min={0}
                      value={totalDelayDays}
                      onChange={(e) => setTotalDelayDays(Number(e.target.value))}
                      required
                    />
                  </FormField>
                  <FormField label={t("admin.chainTemplates.delayUnit")}>
                    <Select.Root value={delayUnit} onValueChange={(v) => setDelayUnit(v as DelayUnit)}>
                      <Select.Trigger style={{ width: "100%" }} />
                      <Select.Content>
                        <Select.Item value="WORKING_DAYS">{t("admin.chainTemplates.workingDays")}</Select.Item>
                        <Select.Item value="WORKING_HOURS">{t("admin.chainTemplates.workingHours")}</Select.Item>
                      </Select.Content>
                    </Select.Root>
                  </FormField>
                </Grid>
                <Text size="1" color="gray">
                  {t("admin.chainTemplates.delaySumHint", {
                    sum: stepSum.toFixed(1),
                    total: totalDelayDays,
                  })}
                </Text>
              </Flex>
            </Card>

            <Card size="3">
              <Flex justify="between" align="center" mb="2" wrap="wrap" gap="2">
                <Text weight="bold">{t("admin.chainTemplates.steps")}</Text>
                <Button type="button" variant="soft" onClick={addStep}>
                  <PlusIcon /> {t("admin.chainTemplates.addStep")}
                </Button>
              </Flex>
              <Text size="1" color="gray" mb="3" as="p">
                {t("admin.chainTemplates.dragHint")}
              </Text>
              <DndContextHost sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <Table.Root variant="surface">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeaderCell>{t("admin.chainTemplates.stageOrder")}</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>{t("admin.chainTemplates.stepLabel")}</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>{t("admin.chainTemplates.responsibleRole")}</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>{t("admin.chainTemplates.delayValue")}</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>{t("admin.chainTemplates.expectedAction")}</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>{t("admin.chainTemplates.optional")}</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>{t("admin.chainTemplates.closureStep")}</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell />
                    </Table.Row>
                  </Table.Header>
                  <SortableContextHost items={sortableIds} strategy={verticalListSortingStrategy}>
                    <Table.Body>
                      {sortedSteps.map((step, index) => (
                        <SortableStepRow
                          key={step.clientKey}
                          step={step}
                          index={index}
                          stepsCount={steps.length}
                          onUpdate={updateStep}
                          onAddParallel={addParallelStep}
                          onRemove={removeStep}
                          onSetClosure={setClosureStep}
                        />
                      ))}
                    </Table.Body>
                  </SortableContextHost>
                </Table.Root>
              </DndContextHost>
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
