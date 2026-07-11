"use client";

import { FormEvent, ReactNode, useCallback, useEffect, useState } from "react";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Dialog,
  Flex,
  Grid,
  Select,
  Separator,
  Text,
  TextArea,
} from "@radix-ui/themes";
import {
  CheckCircledIcon,
  CircleIcon,
  DotFilledIcon,
  EyeOpenIcon,
  InfoCircledIcon,
  PersonIcon,
  ResetIcon,
  ResumeIcon,
  TimerIcon,
} from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/components/AuthProvider";
import {
  ApiError,
  getChainCandidates,
  getChainTemplate,
  getFilePassages,
  getUser,
  initializeFileChain,
  resumeFilePassage,
  returnFilePassage,
  searchChainTemplates,
  suspendFilePassage,
  transmitFilePassage,
} from "@/lib/api";
import { canSeePermission, hasPermission } from "@/lib/auth-storage";
import type {
  ChainStepTemplate,
  ChainTemplateDetail,
  ChainTemplateSummary,
  DelayUnit,
  FilePassageCircuit,
  FileStatus,
  PassageCandidate,
  PassageStatus,
  PassageStep,
  User,
  UserRole,
} from "@/lib/types";
import { StatusAlert } from "@/components/ui/shared";

function passageStatusColor(status: PassageStatus): "gray" | "blue" | "green" | "orange" | "red" {
  switch (status) {
    case "IN_PROGRESS":
      return "blue";
    case "COMPLETED":
      return "green";
    case "SUSPENDED":
      return "orange";
    case "RETURNED":
      return "red";
    default:
      return "gray";
  }
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "short" }).format(
      new Date(iso),
    );
  } catch {
    return iso;
  }
}

function delayLabel(value?: number, unit?: DelayUnit | null, t?: (k: string) => string): string {
  if (value == null) return "—";
  const unitLabel =
    unit === "WORKING_HOURS"
      ? t?.("files.circuit.workingHoursShort") ?? "heures ouvrées"
      : t?.("files.circuit.workingDaysShort") ?? "jours ouvrés";
  return `${value} ${unitLabel}`;
}

function DetailRow({ label, value }: { label: string; value?: ReactNode }) {
  if (value == null || value === "") return null;
  return (
    <Flex direction="column" gap="1">
      <Text size="1" color="gray" weight="medium" style={{ textTransform: "uppercase", letterSpacing: "0.03em" }}>
        {label}
      </Text>
      {typeof value === "string" || typeof value === "number" ? (
        <Text size="2">{value}</Text>
      ) : (
        value
      )}
    </Flex>
  );
}

function CircuitHeader({
  title,
  subtitle,
  progress,
}: {
  title: string;
  subtitle?: string;
  progress?: { done: number; total: number };
}) {
  return (
    <Flex justify="between" align="start" gap="3" wrap="wrap">
      <Flex direction="column" gap="1" style={{ minWidth: 0 }}>
        <Text weight="bold" size="3">
          {title}
        </Text>
        {subtitle && (
          <Text size="2" color="gray">
            {subtitle}
          </Text>
        )}
      </Flex>
      {progress && progress.total > 0 && (
        <Badge size="2" variant="soft" color="blue">
          {progress.done}/{progress.total}
        </Badge>
      )}
    </Flex>
  );
}

function StepIcon({ status, active }: { status: PassageStatus; active?: boolean }) {
  const size = 20;
  if (status === "COMPLETED") {
    return (
      <Flex
        align="center"
        justify="center"
        style={{
          width: 28,
          height: 28,
          borderRadius: "999px",
          background: "var(--green-a4)",
          flexShrink: 0,
        }}
      >
        <CheckCircledIcon color="var(--green-11)" width={size} height={size} />
      </Flex>
    );
  }
  if (status === "IN_PROGRESS" || status === "SUSPENDED" || active) {
    return (
      <Flex
        align="center"
        justify="center"
        style={{
          width: 28,
          height: 28,
          borderRadius: "999px",
          background: status === "SUSPENDED" ? "var(--orange-a4)" : "var(--accent-a4)",
          boxShadow: `0 0 0 3px ${status === "SUSPENDED" ? "var(--orange-a3)" : "var(--accent-a3)"}`,
          flexShrink: 0,
        }}
      >
        <DotFilledIcon
          color={status === "SUSPENDED" ? "var(--orange-11)" : "var(--accent-11)"}
          width={size}
          height={size}
        />
      </Flex>
    );
  }
  return (
    <Flex
      align="center"
      justify="center"
      style={{
        width: 28,
        height: 28,
        borderRadius: "999px",
        background: "var(--gray-a3)",
        flexShrink: 0,
      }}
    >
      <CircleIcon color="var(--gray-9)" width={16} height={16} />
    </Flex>
  );
}

function MetaChip({
  label,
  value,
  alert,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <Flex
      direction="column"
      gap="0"
      px="2"
      py="1"
      style={{
        borderRadius: "var(--radius-2)",
        background: alert ? "var(--red-a3)" : "var(--color-panel-solid)",
        border: `1px solid ${alert ? "var(--red-a6)" : "var(--gray-a5)"}`,
        minWidth: 0,
        flex: "1 1 100px",
      }}
    >
      <Text size="1" color={alert ? "red" : "gray"} style={{ lineHeight: 1.2 }}>
        {label}
      </Text>
      <Text size="1" weight="medium" color={alert ? "red" : undefined} style={{ lineHeight: 1.3 }}>
        {value}
      </Text>
    </Flex>
  );
}

function groupPassagesByStage(passages: PassageStep[]): { stageOrder: number; steps: PassageStep[] }[] {
  const ordered = [...passages].sort((a, b) =>
    a.stepOrder !== b.stepOrder ? a.stepOrder - b.stepOrder : a.label.localeCompare(b.label),
  );
  const stages: { stageOrder: number; steps: PassageStep[] }[] = [];
  for (const step of ordered) {
    const last = stages[stages.length - 1];
    if (last && last.stageOrder === step.stepOrder) {
      last.steps.push(step);
    } else {
      stages.push({ stageOrder: step.stepOrder, steps: [step] });
    }
  }
  return stages;
}

function groupTemplateStepsByStage(
  steps: ChainStepTemplate[],
): { stageOrder: number; steps: ChainStepTemplate[] }[] {
  const ordered = [...steps].sort((a, b) =>
    a.stepOrder !== b.stepOrder ? a.stepOrder - b.stepOrder : a.label.localeCompare(b.label),
  );
  const stages: { stageOrder: number; steps: ChainStepTemplate[] }[] = [];
  for (const step of ordered) {
    const last = stages[stages.length - 1];
    if (last && last.stageOrder === step.stepOrder) {
      last.steps.push(step);
    } else {
      stages.push({ stageOrder: step.stepOrder, steps: [step] });
    }
  }
  return stages;
}

function isManagerRole(role?: UserRole | null): boolean {
  return (
    role === "DIRECTOR" ||
    role === "SERVICE_HEAD" ||
    role === "REGIONAL_DIRECTOR" ||
    role === "SUPER_ADMIN" ||
    role === "BUSINESS_ADMIN" ||
    role === "SECRETARY_GENERAL" ||
    role === "EXECUTIVE_OFFICE"
  );
}

function canActOnPassageStep(
  step: PassageStep,
  user: User | null | undefined,
  canTransmit: boolean,
  fileStatus: FileStatus,
): boolean {
  if (!canTransmit || (fileStatus !== "IN_PROGRESS" && fileStatus !== "ON_HOLD")) return false;
  if (step.status !== "IN_PROGRESS" && step.status !== "SUSPENDED") return false;
  if (step.responsibleUserId && step.responsibleUserId === user?.id) return true;
  return isManagerRole(user?.role) || hasPermission(user, "FILES:UPDATE");
}

function PassageStepRow({
  step,
  isLast,
  onOpenStep,
  onOpenUser,
  actionSlot,
  hideConnector,
  showStepOrder = true,
}: {
  step: PassageStep;
  isLast: boolean;
  onOpenStep: (step: PassageStep) => void;
  onOpenUser: (step: PassageStep) => void;
  actionSlot?: ReactNode;
  hideConnector?: boolean;
  showStepOrder?: boolean;
}) {
  const { t } = useTranslation();
  const isActive = step.status === "IN_PROGRESS" || step.status === "SUSPENDED";
  const statusColor = passageStatusColor(step.status);

  return (
    <Flex gap="3" align="stretch">
      {!hideConnector && (
        <Flex direction="column" align="center" style={{ width: 28 }}>
          <StepIcon status={step.status} active={isActive} />
          {!isLast && (
            <Box
              style={{
                width: 2,
                flex: 1,
                minHeight: 20,
                marginTop: 4,
                marginBottom: 4,
                background:
                  step.status === "COMPLETED" ? "var(--green-a7)" : "var(--gray-a5)",
                borderRadius: 1,
              }}
            />
          )}
        </Flex>
      )}

      <Box
        mb={isLast || hideConnector ? "0" : "3"}
        style={{
          flex: 1,
          minWidth: 0,
          borderRadius: "var(--radius-3)",
          background: "var(--color-panel-solid)",
          border: `1px solid ${
            isActive
              ? step.status === "SUSPENDED"
                ? "var(--orange-a7)"
                : "var(--accent-a7)"
              : step.status === "COMPLETED"
                ? "var(--green-a6)"
                : "var(--gray-a5)"
          }`,
          overflow: "hidden",
        }}
      >
        <Flex
          align="start"
          justify="between"
          gap="2"
          px="3"
          pt="3"
          pb="2"
          style={{
            background: isActive
              ? step.status === "SUSPENDED"
                ? "var(--orange-a3)"
                : "var(--accent-a3)"
              : step.status === "COMPLETED"
                ? "var(--green-a3)"
                : "var(--gray-a2)",
            borderBottom: "1px solid var(--gray-a4)",
          }}
        >
          <Flex gap="2" align="start" style={{ minWidth: 0, flex: 1 }}>
            {showStepOrder && (
              <Badge size="1" variant="solid" color={statusColor}>
                {step.stepOrder}
              </Badge>
            )}
            {hideConnector && (
              <Box style={{ flexShrink: 0 }}>
                <StepIcon status={step.status} active={isActive} />
              </Box>
            )}
            <Flex direction="column" gap="1" style={{ minWidth: 0 }}>
              <Text size="2" weight="bold" style={{ lineHeight: 1.3 }}>
                {step.label}
              </Text>
              <Flex gap="1" wrap="wrap">
                <Badge size="1" color={statusColor} variant="soft">
                  {t(`files.circuit.statusValues.${step.status}`)}
                </Badge>
                {step.overdue && (
                  <Badge size="1" color="red" variant="solid">
                    {t("files.circuit.overdue")}
                  </Badge>
                )}
                {step.closureStep && (
                  <Badge size="1" color="violet" variant="soft">
                    {t("files.circuit.closureStep")}
                  </Badge>
                )}
                {step.optional && (
                  <Badge size="1" color="gray" variant="outline">
                    {t("files.circuit.optionalStep")}
                  </Badge>
                )}
              </Flex>
            </Flex>
          </Flex>
          <Button size="1" variant="soft" onClick={() => onOpenStep(step)} style={{ flexShrink: 0 }}>
            <EyeOpenIcon />
            {t("files.circuit.viewStep")}
          </Button>
        </Flex>

        <Flex direction="column" gap="3" p="3">
          {step.expectedAction && (
            <Flex direction="column" gap="1">
              <Text
                size="1"
                color="gray"
                weight="medium"
                style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}
              >
                {t("files.circuit.expectedAction")}
              </Text>
              <Text size="1" style={{ lineHeight: 1.45, color: "var(--gray-12)" }}>
                {step.expectedAction}
              </Text>
            </Flex>
          )}

          <Flex direction="column" gap="1">
            <Text
              size="1"
              color="gray"
              weight="medium"
              style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
            >
              {t("files.circuit.timingSection")}
            </Text>
            <Flex gap="2" wrap="wrap">
              {step.responsibleRole && (
                <MetaChip label={t("files.circuit.responsibleRole")} value={step.responsibleRole} />
              )}
              {step.delayValue != null && (
                <MetaChip
                  label={t("files.circuit.delayAllocated")}
                  value={delayLabel(step.delayValue, step.delayUnit, t)}
                />
              )}
              {step.dueAt && (
                <MetaChip
                  label={t("files.circuit.dueAt")}
                  value={formatDateTime(step.dueAt)}
                  alert={step.overdue}
                />
              )}
              {step.workingDaysHeld != null && isActive && (
                <MetaChip
                  label={t("files.circuit.heldDays", { count: step.workingDaysHeld })}
                  value={`${step.workingDaysHeld}`}
                  alert={step.overdue}
                />
              )}
            </Flex>
            {(step.receivedAt || step.transmittedAt) && (
              <Text size="1" color="gray" mt="1">
                {step.receivedAt && (
                  <>
                    {t("files.circuit.receivedAt")} {formatDateTime(step.receivedAt)}
                  </>
                )}
                {step.receivedAt && step.transmittedAt && " → "}
                {step.transmittedAt && (
                  <>
                    {t("files.circuit.transmittedAt")} {formatDateTime(step.transmittedAt)}
                  </>
                )}
              </Text>
            )}
          </Flex>

          <Flex
            direction="column"
            gap="2"
            p="2"
            style={{
              borderRadius: "var(--radius-2)",
              background: "var(--gray-a2)",
              border: "1px solid var(--gray-a4)",
            }}
          >
            <Text
              size="1"
              color="gray"
              weight="medium"
              style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}
            >
              {t("files.circuit.userDetailTitle")}
            </Text>
            {step.responsibleName ? (
              <Flex align="center" justify="between" gap="2" wrap="wrap">
                <Flex align="center" gap="2" style={{ minWidth: 0 }}>
                  <Avatar
                    size="1"
                    radius="full"
                    color="indigo"
                    fallback={initialsFromName(step.responsibleName)}
                  />
                  <Flex direction="column" style={{ minWidth: 0 }}>
                    <Text size="2" weight="medium">
                      {step.responsibleName}
                    </Text>
                    {step.responsibleOrganizationCode && (
                      <Text size="1" color="gray">
                        {step.responsibleOrganizationCode}
                        {step.responsibleOrganizationName
                          ? ` — ${step.responsibleOrganizationName}`
                          : ""}
                      </Text>
                    )}
                  </Flex>
                </Flex>
                <Button size="1" variant="soft" onClick={() => onOpenUser(step)}>
                  <PersonIcon />
                  {t("files.circuit.viewUser")}
                </Button>
              </Flex>
            ) : (
              <Text size="1" color="gray">
                {t("files.circuit.noResponsible")}
              </Text>
            )}
          </Flex>

          {actionSlot}
        </Flex>
      </Box>
    </Flex>
  );
}

function PassageStepDetailDialog({
  step,
  open,
  onOpenChange,
  onOpenUser,
}: {
  step: PassageStep | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenUser: (step: PassageStep) => void;
}) {
  const { t } = useTranslation();
  if (!step) return null;

  const statusColor = passageStatusColor(step.status);
  const headerBg =
    step.status === "COMPLETED"
      ? "linear-gradient(145deg, var(--green-a3), var(--green-a2) 55%, transparent)"
      : step.status === "SUSPENDED" || step.overdue
        ? "linear-gradient(145deg, var(--orange-a3), var(--orange-a2) 55%, transparent)"
        : step.status === "IN_PROGRESS"
          ? "linear-gradient(145deg, var(--accent-a3), var(--accent-a2) 55%, transparent)"
          : "linear-gradient(145deg, var(--gray-a3), var(--gray-a2) 55%, transparent)";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="520px" style={{ padding: 0, overflow: "hidden" }}>
        <Box
          px="5"
          pt="5"
          pb="4"
          style={{
            background: headerBg,
            borderBottom: "1px solid var(--gray-a4)",
          }}
        >
          <Dialog.Title mb="1">{t("files.circuit.viewStep")}</Dialog.Title>
          <Dialog.Description size="2" color="gray" mb="0">
            {t("files.circuit.stepDetailSubtitle")}
          </Dialog.Description>

          <Flex align="start" gap="4" mt="4">
            <Flex
              align="center"
              justify="center"
              style={{
                width: 52,
                height: 52,
                borderRadius: "var(--radius-3)",
                background: "var(--color-panel-solid)",
                border: "1px solid var(--gray-a5)",
                flexShrink: 0,
                boxShadow: "0 1px 2px var(--gray-a4)",
              }}
            >
              <Text size="5" weight="bold" style={{ color: `var(--${statusColor}-11)` }}>
                {step.stepOrder}
              </Text>
            </Flex>
            <Flex direction="column" gap="2" style={{ minWidth: 0, flex: 1 }}>
              <Flex gap="2" wrap="wrap">
                <Badge size="2" color={statusColor} variant="soft">
                  {t(`files.circuit.statusValues.${step.status}`)}
                </Badge>
                {step.overdue && (
                  <Badge size="2" color="red" variant="solid">
                    {t("files.circuit.overdue")}
                  </Badge>
                )}
                {step.closureStep && (
                  <Badge size="1" color="violet" variant="soft">
                    {t("files.circuit.closureStep")}
                  </Badge>
                )}
                {step.optional && (
                  <Badge size="1" color="gray" variant="outline">
                    {t("files.circuit.optionalStep")}
                  </Badge>
                )}
              </Flex>
              <Text size="5" weight="bold" style={{ lineHeight: 1.25, letterSpacing: "-0.02em" }}>
                {step.label}
              </Text>
            </Flex>
          </Flex>
        </Box>

        <Box px="5" py="4">
          <Flex direction="column" gap="4">
            {step.expectedAction && (
              <Flex
                direction="column"
                gap="2"
                p="3"
                style={{
                  borderRadius: "var(--radius-3)",
                  background: "var(--accent-a2)",
                  border: "1px solid var(--accent-a5)",
                }}
              >
                <Text
                  size="1"
                  color="gray"
                  weight="medium"
                  style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}
                >
                  {t("files.circuit.expectedAction")}
                </Text>
                <Text size="2" style={{ lineHeight: 1.5 }}>
                  {step.expectedAction}
                </Text>
              </Flex>
            )}

            <Flex direction="column" gap="2">
              <Text
                size="1"
                weight="bold"
                color="gray"
                style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
              >
                {t("files.circuit.timingSection")}
              </Text>
              <Grid columns={{ initial: "1", sm: "2" }} gap="2">
                <InfoTile
                  label={t("files.circuit.responsibleRole")}
                  value={step.responsibleRole}
                />
                <InfoTile
                  label={t("files.circuit.delayAllocated")}
                  value={delayLabel(step.delayValue, step.delayUnit, t)}
                />
                <InfoTile label={t("files.circuit.receivedAt")} value={formatDateTime(step.receivedAt)} />
                <InfoTile
                  label={t("files.circuit.transmittedAt")}
                  value={formatDateTime(step.transmittedAt)}
                />
                <InfoTile
                  label={t("files.circuit.dueAt")}
                  value={formatDateTime(step.dueAt)}
                />
                <InfoTile
                  label={t("files.circuit.consumedHours")}
                  value={step.consumedHours != null ? String(step.consumedHours) : null}
                />
                {step.workingDaysHeld != null && (
                  <InfoTile
                    label={t("files.circuit.heldDays", { count: step.workingDaysHeld })}
                    value={String(step.workingDaysHeld)}
                  />
                )}
                {step.suspendedAt && (
                  <InfoTile
                    label={t("files.circuit.suspendedAt")}
                    value={formatDateTime(step.suspendedAt)}
                  />
                )}
                {step.resumedAt && (
                  <InfoTile
                    label={t("files.circuit.resumedAt")}
                    value={formatDateTime(step.resumedAt)}
                  />
                )}
              </Grid>
            </Flex>

            <Flex direction="column" gap="2">
              <Text
                size="1"
                weight="bold"
                color="gray"
                style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
              >
                {t("files.circuit.userDetailTitle")}
              </Text>
              {step.responsibleName ? (
                <Box
                  p="3"
                  style={{
                    borderRadius: "var(--radius-3)",
                    background: "var(--gray-a2)",
                    border: "1px solid var(--gray-a4)",
                  }}
                >
                  <Flex align="center" justify="between" gap="3" wrap="wrap">
                    <Flex align="center" gap="3" style={{ minWidth: 0 }}>
                      <Avatar
                        size="3"
                        radius="full"
                        color="indigo"
                        fallback={initialsFromName(step.responsibleName)}
                      />
                      <Flex direction="column" gap="1" style={{ minWidth: 0 }}>
                        <Text size="3" weight="medium">
                          {step.responsibleName}
                        </Text>
                        <Text size="1" color="gray">
                          {[step.responsibleOrganizationCode, step.responsibleOrganizationName]
                            .filter(Boolean)
                            .join(" — ") || "—"}
                        </Text>
                        {step.responsibleEmail && (
                          <Text size="1" color="gray">
                            {step.responsibleEmail}
                          </Text>
                        )}
                      </Flex>
                    </Flex>
                    <Button size="2" variant="soft" onClick={() => onOpenUser(step)}>
                      <PersonIcon />
                      {t("files.circuit.viewUser")}
                    </Button>
                  </Flex>
                </Box>
              ) : (
                <Box
                  p="3"
                  style={{
                    borderRadius: "var(--radius-3)",
                    background: "var(--gray-a2)",
                    border: "1px dashed var(--gray-a6)",
                  }}
                >
                  <Text size="2" color="gray">
                    {t("files.circuit.noResponsible")}
                  </Text>
                </Box>
              )}
            </Flex>

            {(step.comment || step.internalComment || step.returnReason) && (
              <Flex direction="column" gap="2">
                <Text
                  size="1"
                  weight="bold"
                  color="gray"
                  style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
                >
                  {t("files.circuit.notesSection")}
                </Text>
                <Flex direction="column" gap="2">
                  {step.comment && (
                    <InfoTile label={t("files.circuit.comment")} value={step.comment} />
                  )}
                  {step.internalComment && (
                    <InfoTile
                      label={t("files.circuit.internalComment")}
                      value={step.internalComment}
                    />
                  )}
                  {step.returnReason && (
                    <InfoTile
                      label={t("files.circuit.returnReasonLabel")}
                      value={step.returnReason}
                    />
                  )}
                </Flex>
              </Flex>
            )}
          </Flex>
        </Box>

        <Flex
          justify="end"
          px="5"
          py="3"
          style={{ borderTop: "1px solid var(--gray-a4)", background: "var(--gray-a2)" }}
        >
          <Dialog.Close>
            <Button variant="soft">{t("files.circuit.close")}</Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function InfoTile({
  label,
  value,
  href,
}: {
  label: string;
  value?: string | null;
  href?: string;
}) {
  const display = value?.trim() || "—";
  return (
    <Box
      p="3"
      style={{
        borderRadius: "var(--radius-3)",
        background: "var(--gray-a2)",
        border: "1px solid var(--gray-a4)",
        minHeight: 72,
      }}
    >
      <Flex direction="column" gap="1">
        <Text
          size="1"
          color="gray"
          weight="medium"
          style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}
        >
          {label}
        </Text>
        {href && display !== "—" ? (
          <Text size="2" weight="medium" asChild>
            <a href={href} style={{ color: "var(--accent-11)", textDecoration: "none", wordBreak: "break-word" }}>
              {display}
            </a>
          </Text>
        ) : (
          <Text size="2" weight="medium" style={{ wordBreak: "break-word" }}>
            {display}
          </Text>
        )}
      </Flex>
    </Box>
  );
}

function ResponsibleUserDialog({
  step,
  open,
  onOpenChange,
}: {
  step: PassageStep | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !step?.responsibleUserId) {
      setUser(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getUser(step.responsibleUserId)
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, step?.responsibleUserId]);

  if (!step) return null;

  const displayName = user
    ? `${user.firstName} ${user.lastName}`
    : step.responsibleName ?? t("files.circuit.unassigned");
  const email = user?.email ?? step.responsibleEmail ?? null;
  const phone = user?.phone ?? step.responsiblePhone ?? null;
  const jobTitle = user?.jobTitle ?? step.responsibleJobTitle ?? null;
  const role = user?.role ?? step.responsibleRole ?? null;
  const orgCode = user?.organization.code ?? step.responsibleOrganizationCode ?? null;
  const orgName = user?.organization.name ?? step.responsibleOrganizationName ?? null;
  const staffNumber = user?.staffNumber ?? null;
  const active = user?.active;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="480px" style={{ padding: 0, overflow: "hidden" }}>
        <Box
          px="5"
          pt="5"
          pb="4"
          style={{
            background: "linear-gradient(145deg, var(--accent-a3), var(--accent-a2) 55%, transparent)",
            borderBottom: "1px solid var(--gray-a4)",
          }}
        >
          <Dialog.Title mb="1">{t("files.circuit.userDetailTitle")}</Dialog.Title>
          <Dialog.Description size="2" color="gray" mb="0">
            {t("files.circuit.userDetailSubtitle", {
              step: `${step.stepOrder}. ${step.label}`,
            })}
          </Dialog.Description>

          <Flex align="center" gap="4" mt="4">
            <Avatar
              size="5"
              radius="full"
              color="indigo"
              fallback={initialsFromName(displayName)}
            />
            <Flex direction="column" gap="2" style={{ minWidth: 0, flex: 1 }}>
              <Text size="5" weight="bold" style={{ lineHeight: 1.2, letterSpacing: "-0.02em" }}>
                {displayName}
              </Text>
              {jobTitle && (
                <Text size="2" color="gray">
                  {jobTitle}
                </Text>
              )}
              <Flex gap="2" wrap="wrap" align="center">
                {role && (
                  <Badge size="2" variant="soft" color="indigo">
                    {role}
                  </Badge>
                )}
                {active === true && (
                  <Badge size="1" variant="soft" color="green">
                    {t("files.circuit.userActive")}
                  </Badge>
                )}
                {active === false && (
                  <Badge size="1" variant="soft" color="red">
                    {t("files.circuit.userInactive")}
                  </Badge>
                )}
              </Flex>
            </Flex>
          </Flex>
        </Box>

        <Box px="5" py="4">
          {loading ? (
            <Flex align="center" gap="2" py="4">
              <InfoCircledIcon color="var(--gray-9)" />
              <Text size="2" color="gray">
                {t("common.loading")}
              </Text>
            </Flex>
          ) : (
            <Flex direction="column" gap="4">
              <Flex direction="column" gap="2">
                <Text
                  size="1"
                  weight="bold"
                  color="gray"
                  style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
                >
                  {t("files.circuit.contactSection")}
                </Text>
                <Grid columns={{ initial: "1", sm: "2" }} gap="2">
                  <InfoTile
                    label={t("files.circuit.email")}
                    value={email}
                    href={email ? `mailto:${email}` : undefined}
                  />
                  <InfoTile
                    label={t("files.circuit.phone")}
                    value={phone}
                    href={phone ? `tel:${phone.replace(/\s+/g, "")}` : undefined}
                  />
                </Grid>
              </Flex>

              <Flex direction="column" gap="2">
                <Text
                  size="1"
                  weight="bold"
                  color="gray"
                  style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
                >
                  {t("files.circuit.identitySection")}
                </Text>
                <Grid columns={{ initial: "1", sm: "2" }} gap="2">
                  <InfoTile label={t("files.circuit.staffNumber")} value={staffNumber} />
                  <InfoTile label={t("files.circuit.role")} value={role} />
                </Grid>
              </Flex>

              <Box
                p="3"
                style={{
                  borderRadius: "var(--radius-3)",
                  background: "var(--accent-a2)",
                  border: "1px solid var(--accent-a5)",
                }}
              >
                <Flex align="start" gap="3">
                  <Flex
                    align="center"
                    justify="center"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "var(--radius-2)",
                      background: "var(--accent-a4)",
                      flexShrink: 0,
                    }}
                  >
                    <PersonIcon width={18} height={18} color="var(--accent-11)" />
                  </Flex>
                  <Flex direction="column" gap="1" style={{ minWidth: 0 }}>
                    <Text size="1" color="gray" weight="medium" style={{ textTransform: "uppercase" }}>
                      {t("files.circuit.organization")}
                    </Text>
                    <Text size="3" weight="medium">
                      {orgCode ?? "—"}
                    </Text>
                    {orgName && (
                      <Text size="2" color="gray">
                        {orgName}
                      </Text>
                    )}
                  </Flex>
                </Flex>
              </Box>

              <Box
                p="3"
                style={{
                  borderRadius: "var(--radius-3)",
                  background: "var(--gray-a2)",
                  border: "1px solid var(--gray-a4)",
                }}
              >
                <Flex direction="column" gap="3">
                  <Flex justify="between" align="start" gap="2" wrap="wrap">
                    <Text size="1" color="gray" weight="medium" style={{ textTransform: "uppercase" }}>
                      {t("files.circuit.stepContext")}
                    </Text>
                    <Flex gap="2" wrap="wrap">
                      <Badge size="1" color={passageStatusColor(step.status)} variant="soft">
                        {t(`files.circuit.statusValues.${step.status}`)}
                      </Badge>
                      {step.overdue && (
                        <Badge size="1" color="red" variant="solid">
                          {t("files.circuit.overdue")}
                        </Badge>
                      )}
                    </Flex>
                  </Flex>
                  <Text size="3" weight="medium" style={{ lineHeight: 1.3 }}>
                    {step.stepOrder}. {step.label}
                  </Text>
                </Flex>
              </Box>
            </Flex>
          )}
        </Box>

        <Flex
          justify="end"
          px="5"
          py="3"
          style={{ borderTop: "1px solid var(--gray-a4)", background: "var(--gray-a2)" }}
        >
          <Dialog.Close>
            <Button variant="soft">{t("files.circuit.close")}</Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function AssignmentStepCard({
  step,
  candidates,
  value,
  onChange,
  disabled,
  selectUserLabel,
  noCandidatesLabel,
}: {
  step: ChainStepTemplate;
  candidates: PassageCandidate[];
  value: string;
  onChange: (userId: string) => void;
  disabled?: boolean;
  selectUserLabel: string;
  noCandidatesLabel: string;
}) {
  const stepId = step.id ?? "";
  return (
    <Box
      p="3"
      style={{
        borderRadius: "var(--radius-3)",
        background: "var(--gray-a2)",
        border: "1px solid var(--gray-a5)",
      }}
    >
      <Flex direction="column" gap="2">
        <Flex align="center" gap="2" wrap="wrap">
          <Badge size="1" variant="soft" color="gray">
            {step.stepOrder}
          </Badge>
          <Text size="2" weight="medium">
            {step.label}
          </Text>
          <Badge size="1" variant="outline" color="gray">
            {step.responsibleRole}
          </Badge>
        </Flex>
        <Select.Root
          value={value || "none"}
          onValueChange={(v) => onChange(v === "none" ? "" : v)}
          disabled={disabled || !stepId}
          required
        >
          <Select.Trigger placeholder={selectUserLabel} style={{ width: "100%" }} />
          <Select.Content>
            <Select.Item value="none">—</Select.Item>
            {candidates.map((c) => (
              <Select.Item key={c.id} value={c.id}>
                {c.firstName} {c.lastName} ({c.organizationCode})
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
        {candidates.length === 0 && (
          <Text size="1" color="orange">
            {noCandidatesLabel}
          </Text>
        )}
      </Flex>
    </Box>
  );
}

function PassageActionPanel({
  step,
  isParallel,
  busy,
  comment,
  returnReason,
  suspendReason,
  showReturn,
  showSuspend,
  onCommentChange,
  onReturnReasonChange,
  onSuspendReasonChange,
  onShowReturn,
  onShowSuspend,
  onTransmit,
  onReturn,
  onSuspend,
  onResume,
}: {
  step: PassageStep;
  isParallel: boolean;
  busy: boolean;
  comment: string;
  returnReason: string;
  suspendReason: string;
  showReturn: boolean;
  showSuspend: boolean;
  onCommentChange: (value: string) => void;
  onReturnReasonChange: (value: string) => void;
  onSuspendReasonChange: (value: string) => void;
  onShowReturn: (show: boolean) => void;
  onShowSuspend: (show: boolean) => void;
  onTransmit: (e: FormEvent) => void;
  onReturn: (e: FormEvent) => void;
  onSuspend: (e: FormEvent) => void;
  onResume: () => void;
}) {
  const { t } = useTranslation();
  const markDoneLabel = isParallel ? t("files.circuit.markDone") : t("files.circuit.transmit");

  return (
    <Box
      mt="1"
      p="3"
      style={{
        borderRadius: "var(--radius-2)",
        background: "var(--accent-a2)",
        border: "1px solid var(--accent-a5)",
      }}
    >
      {step.status === "SUSPENDED" ? (
        <Button onClick={onResume} disabled={busy} size="2" style={{ width: "100%" }}>
          <ResumeIcon />
          {t("files.circuit.resume")}
        </Button>
      ) : (
        <Flex direction="column" gap="3">
          <Text size="2" weight="medium">
            {markDoneLabel}
          </Text>
          {isParallel && (
            <Text size="1" color="gray">
              {t("files.circuit.markDoneHint")}
            </Text>
          )}
          <form onSubmit={onTransmit}>
            <Flex direction="column" gap="2">
              <TextArea
                value={comment}
                onChange={(e) => onCommentChange(e.target.value)}
                placeholder={t("files.circuit.transmitComment")}
                rows={2}
              />
              <Button type="submit" disabled={busy} size="2">
                <CheckCircledIcon />
                {markDoneLabel}
              </Button>
            </Flex>
          </form>

          <Separator size="4" />

          <Flex gap="2" wrap="wrap">
            {!showReturn ? (
              <Button
                variant="soft"
                color="orange"
                onClick={() => {
                  onShowReturn(true);
                  onShowSuspend(false);
                }}
                disabled={busy}
              >
                <ResetIcon />
                {t("files.circuit.return")}
              </Button>
            ) : null}
            {!showSuspend ? (
              <Button
                variant="soft"
                color="gray"
                onClick={() => {
                  onShowSuspend(true);
                  onShowReturn(false);
                }}
                disabled={busy}
              >
                <TimerIcon />
                {t("files.circuit.suspend")}
              </Button>
            ) : null}
          </Flex>

          {showReturn && (
            <form onSubmit={onReturn}>
              <Flex direction="column" gap="2">
                <TextArea
                  value={returnReason}
                  onChange={(e) => onReturnReasonChange(e.target.value)}
                  placeholder={t("files.circuit.returnReason")}
                  minLength={20}
                  required
                  rows={3}
                />
                <Flex gap="2" align="center" wrap="wrap" mt="1">
                  <Button type="submit" size="2" color="orange" variant="soft" disabled={busy}>
                    {t("files.circuit.confirmReturn")}
                  </Button>
                  <Button
                    type="button"
                    size="2"
                    variant="soft"
                    color="gray"
                    disabled={busy}
                    onClick={() => onShowReturn(false)}
                  >
                    {t("common.cancel")}
                  </Button>
                </Flex>
              </Flex>
            </form>
          )}

          {showSuspend && (
            <form onSubmit={onSuspend}>
              <Flex direction="column" gap="2">
                <TextArea
                  value={suspendReason}
                  onChange={(e) => onSuspendReasonChange(e.target.value)}
                  placeholder={t("files.circuit.suspendReason")}
                  minLength={10}
                  required
                  rows={3}
                />
                <Flex gap="2" align="center" wrap="wrap" mt="1">
                  <Button type="submit" size="2" variant="soft" disabled={busy}>
                    {t("files.circuit.confirmSuspend")}
                  </Button>
                  <Button
                    type="button"
                    size="2"
                    variant="soft"
                    color="gray"
                    disabled={busy}
                    onClick={() => onShowSuspend(false)}
                  >
                    {t("common.cancel")}
                  </Button>
                </Flex>
              </Flex>
            </form>
          )}
        </Flex>
      )}
    </Box>
  );
}

export function PassageCircuit({
  fileId,
  fileStatus,
  onChanged,
}: {
  fileId: string;
  fileStatus: FileStatus;
  onChanged?: () => void;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [circuit, setCircuit] = useState<FilePassageCircuit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [suspendReason, setSuspendReason] = useState("");
  const [showReturn, setShowReturn] = useState(false);
  const [showSuspend, setShowSuspend] = useState(false);

  const [templates, setTemplates] = useState<ChainTemplateSummary[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<ChainTemplateDetail | null>(null);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [candidatesByRole, setCandidatesByRole] = useState<Partial<Record<UserRole, PassageCandidate[]>>>({});
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [detailStep, setDetailStep] = useState<PassageStep | null>(null);
  const [userStep, setUserStep] = useState<PassageStep | null>(null);
  const [actionStepId, setActionStepId] = useState<string | null>(null);

  const canTransmit = canSeePermission(user, "FILES:TRANSMIT");
  const canInitialize = canSeePermission(user, "FILES:UPDATE");
  const activeSteps =
    circuit?.passages.filter((p) => p.status === "IN_PROGRESS" || p.status === "SUSPENDED") ?? [];
  const preferredActionStep =
    activeSteps.find((p) => p.responsibleUserId && p.responsibleUserId === user?.id) ??
    activeSteps.find((p) => canActOnPassageStep(p, user, canTransmit, fileStatus)) ??
    activeSteps[0];
  const actionStep =
    (actionStepId ? activeSteps.find((p) => p.id === actionStepId) : null) ?? preferredActionStep;

  useEffect(() => {
    if (!actionStepId) return;
    const stillActive = circuit?.passages.some(
      (p) =>
        p.id === actionStepId && (p.status === "IN_PROGRESS" || p.status === "SUSPENDED"),
    );
    if (!stillActive) setActionStepId(null);
  }, [actionStepId, circuit?.passages]);

  const actionableSteps = activeSteps.filter((p) =>
    canActOnPassageStep(p, user, canTransmit, fileStatus),
  );
  const canActAnywhere = actionableSteps.length > 0;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCircuit(await getFilePassages(fileId));
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setCircuit(null);
      } else {
        setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
      }
    } finally {
      setLoading(false);
    }
  }, [fileId, t]);

  useEffect(() => {
    if (fileStatus !== "DRAFT") {
      load();
    } else {
      setLoading(false);
    }
  }, [fileStatus, load]);

  useEffect(() => {
    if (!canInitialize || (fileStatus !== "IN_PROGRESS" && fileStatus !== "ON_HOLD")) return;
    if (circuit && circuit.passages.length > 0) return;

    let cancelled = false;
    (async () => {
      try {
        const page = await searchChainTemplates({ active: true, size: 100 });
        if (!cancelled) setTemplates(page.content);
      } catch {
        // listing templates is optional until user opens the form
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canInitialize, circuit, fileStatus]);

  async function loadTemplate(templateId: string) {
    setSelectedTemplateId(templateId);
    setSelectedTemplate(null);
    setAssignments({});
    setCandidatesByRole({});
    if (!templateId) return;

    setLoadingTemplate(true);
    setError(null);
    try {
      const detail = await getChainTemplate(templateId);
      setSelectedTemplate(detail);

      const roles = [...new Set(detail.steps.map((s) => s.responsibleRole))];
      const entries = await Promise.all(
        roles.map(async (role) => [role, await getChainCandidates(fileId, role)] as const),
      );
      const byRole: Partial<Record<UserRole, PassageCandidate[]>> = {};
      for (const [role, candidates] of entries) {
        byRole[role] = candidates;
      }
      setCandidatesByRole(byRole);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    } finally {
      setLoadingTemplate(false);
    }
  }

  async function runAction(action: () => Promise<FilePassageCircuit>) {
    setBusy(true);
    setError(null);
    try {
      setCircuit(await action());
      onChanged?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("files.circuit.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleTransmit(e: FormEvent, step: PassageStep) {
    e.preventDefault();
    await runAction(() => transmitFilePassage(fileId, step.id, { comment: comment || undefined }));
    setComment("");
    setActionStepId(null);
  }

  async function handleReturn(e: FormEvent, step: PassageStep) {
    e.preventDefault();
    await runAction(() => returnFilePassage(fileId, step.id, { reason: returnReason }));
    setReturnReason("");
    setShowReturn(false);
    setActionStepId(null);
  }

  async function handleSuspend(e: FormEvent, step: PassageStep) {
    e.preventDefault();
    await runAction(() => suspendFilePassage(fileId, step.id, { reason: suspendReason }));
    setSuspendReason("");
    setShowSuspend(false);
    setActionStepId(null);
  }

  async function handleInitialize(e: FormEvent) {
    e.preventDefault();
    if (!selectedTemplate) return;

    const steps = selectedTemplate.steps;
    const missing = steps.find((s) => !s.id || !assignments[s.id]);
    if (missing) {
      setError(t("files.circuit.assignmentRequired"));
      return;
    }

    await runAction(() =>
      initializeFileChain(fileId, {
        chainTemplateId: selectedTemplate.id,
        assignments: steps.map((s) => ({
          chainStepTemplateId: s.id!,
          responsibleUserId: assignments[s.id!],
        })),
      }),
    );
  }

  async function handleResume(step: PassageStep) {
    await runAction(() => resumeFilePassage(fileId, step.id));
    setActionStepId(null);
  }

  if (fileStatus === "DRAFT") {
    return (
      <Card size="3">
        <Flex direction="column" gap="3">
          <CircuitHeader title={t("files.circuit.title")} />
          <Box
            p="4"
            style={{
              borderRadius: "var(--radius-3)",
              background: "var(--gray-a2)",
              border: "1px dashed var(--gray-a6)",
              textAlign: "center",
            }}
          >
            <Text size="2" color="gray">
              {t("files.circuit.availableAfterSubmit")}
            </Text>
          </Box>
        </Flex>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card size="3">
        <Flex direction="column" gap="3">
          <CircuitHeader title={t("files.circuit.title")} />
          <Text size="2" color="gray">
            {t("files.circuit.loading")}
          </Text>
        </Flex>
      </Card>
    );
  }

  if (!circuit || circuit.passages.length === 0) {
    const assignedCount = selectedTemplate
      ? selectedTemplate.steps.filter((s) => s.id && assignments[s.id]).length
      : 0;
    const totalSteps = selectedTemplate?.steps.length ?? 0;

    return (
      <Card size="3">
        <Flex direction="column" gap="4">
          <CircuitHeader title={t("files.circuit.title")} />

          <Box
            p="3"
            style={{
              borderRadius: "var(--radius-3)",
              background: "var(--accent-a2)",
              border: "1px solid var(--accent-a5)",
            }}
          >
            <Text size="2" color="gray" as="p">
              {t("files.circuit.empty")}
            </Text>
            <Text size="2" color="gray" as="p" mt="1">
              {t("files.circuit.initializeHint")}
            </Text>
          </Box>

          {canInitialize && (fileStatus === "IN_PROGRESS" || fileStatus === "ON_HOLD") ? (
            <form onSubmit={handleInitialize}>
              <Flex direction="column" gap="4">
                <Flex direction="column" gap="2">
                  <Text size="2" weight="medium">
                    {t("files.circuit.selectTemplate")}
                  </Text>
                  <Select.Root
                    value={selectedTemplateId || "none"}
                    onValueChange={(v) => loadTemplate(v === "none" ? "" : v)}
                    disabled={busy || loadingTemplate}
                  >
                    <Select.Trigger placeholder={t("files.circuit.selectTemplate")} style={{ width: "100%" }} />
                    <Select.Content>
                      <Select.Item value="none">—</Select.Item>
                      {templates.map((tpl) => (
                        <Select.Item key={tpl.id} value={tpl.id}>
                          {tpl.code} — {tpl.name}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </Flex>

                {loadingTemplate && (
                  <Text size="2" color="gray">
                    {t("common.loading")}
                  </Text>
                )}

                {selectedTemplate && (
                  <Flex direction="column" gap="3">
                    <Flex justify="between" align="center" wrap="wrap" gap="2">
                      <Text size="2" weight="medium">
                        {t("files.circuit.assignUsers")}
                      </Text>
                      <Badge size="1" variant="soft" color={assignedCount === totalSteps ? "green" : "gray"}>
                        {assignedCount}/{totalSteps}
                      </Badge>
                    </Flex>
                    {groupTemplateStepsByStage(selectedTemplate.steps).map((stage) => (
                      <Flex key={stage.stageOrder} direction="column" gap="2">
                        {stage.steps.length > 1 && (
                          <Text size="1" color="gray">
                            {t("files.circuit.parallelStage")}
                          </Text>
                        )}
                        {stage.steps.map((step) => (
                          <AssignmentStepCard
                            key={step.id || `${step.stepOrder}-${step.label}`}
                            step={step}
                            candidates={candidatesByRole[step.responsibleRole] ?? []}
                            value={step.id ? assignments[step.id] ?? "" : ""}
                            onChange={(userId) =>
                              step.id &&
                              setAssignments((prev) => ({
                                ...prev,
                                [step.id!]: userId,
                              }))
                            }
                            disabled={busy}
                            selectUserLabel={t("files.circuit.selectUser")}
                            noCandidatesLabel={t("files.circuit.noCandidates")}
                          />
                        ))}
                      </Flex>
                    ))}
                  </Flex>
                )}

                <Button
                  type="submit"
                  size="3"
                  disabled={busy || !selectedTemplate || loadingTemplate || assignedCount < totalSteps}
                >
                  {t("files.circuit.linkCircuit")}
                </Button>
              </Flex>
            </form>
          ) : (
            <Text size="2" color="gray" as="p">
              {t("files.circuit.initializeForbidden")}
            </Text>
          )}

          {error && <StatusAlert variant="error" message={error} />}
        </Flex>
      </Card>
    );
  }

  const doneCount = circuit.passages.filter((p) => p.status === "COMPLETED").length;
  const totalCount = circuit.passages.length;
  const stages = groupPassagesByStage(circuit.passages);

  function renderActionSlot(step: PassageStep, isParallel: boolean) {
    if (!canActOnPassageStep(step, user, canTransmit, fileStatus)) return undefined;
    const isOpen = actionStep?.id === step.id;
    if (!isOpen) {
      return (
        <Button
          size="2"
          variant="soft"
          disabled={busy}
          onClick={() => {
            setActionStepId(step.id);
            setShowReturn(false);
            setShowSuspend(false);
            setComment("");
          }}
        >
          <CheckCircledIcon />
          {step.status === "SUSPENDED"
            ? t("files.circuit.resume")
            : isParallel
              ? t("files.circuit.markDone")
              : t("files.circuit.transmit")}
        </Button>
      );
    }
    return (
      <PassageActionPanel
        step={step}
        isParallel={isParallel}
        busy={busy}
        comment={comment}
        returnReason={returnReason}
        suspendReason={suspendReason}
        showReturn={showReturn}
        showSuspend={showSuspend}
        onCommentChange={setComment}
        onReturnReasonChange={setReturnReason}
        onSuspendReasonChange={setSuspendReason}
        onShowReturn={setShowReturn}
        onShowSuspend={setShowSuspend}
        onTransmit={(e) => handleTransmit(e, step)}
        onReturn={(e) => handleReturn(e, step)}
        onSuspend={(e) => handleSuspend(e, step)}
        onResume={() => handleResume(step)}
      />
    );
  }

  return (
    <Card size="3">
      <Flex direction="column" gap="4">
        <CircuitHeader
          title={t("files.circuit.title")}
          subtitle={
            circuit.templateCode
              ? `${circuit.templateCode} — ${circuit.templateName}`
              : undefined
          }
          progress={{ done: doneCount, total: totalCount }}
        />

        {(circuit.currentHolders?.length ? circuit.currentHolders : circuit.currentHolder ? [circuit.currentHolder] : []).map(
          (holder) => (
            <Box
              key={`${holder.userId}-${holder.stepLabel}`}
              p="3"
              mb="2"
              style={{
                borderRadius: "var(--radius-3)",
                background: holder.overdue ? "var(--red-a3)" : "var(--accent-a3)",
                border: `1px solid ${holder.overdue ? "var(--red-a7)" : "var(--accent-a6)"}`,
              }}
            >
              <Flex justify="between" align="start" gap="2" wrap="wrap">
                <Flex direction="column" gap="1">
                  <Flex align="center" gap="2">
                    <PersonIcon
                      width={14}
                      height={14}
                      color={holder.overdue ? "var(--red-11)" : "var(--accent-11)"}
                    />
                    <Text size="2" weight="medium">
                      {t("files.circuit.currentHolder", {
                        name: holder.fullName,
                        days: holder.workingDaysHeld,
                      })}
                    </Text>
                  </Flex>
                  <Text size="1" color="gray">
                    {holder.stepLabel} · {holder.organizationCode}
                  </Text>
                </Flex>
                {activeSteps.find((s) => s.label === holder.stepLabel) && (
                  <Flex gap="2">
                    <Button
                      size="1"
                      variant="soft"
                      onClick={() => {
                        const step = activeSteps.find((s) => s.label === holder.stepLabel);
                        if (step) setDetailStep(step);
                      }}
                    >
                      <EyeOpenIcon />
                      {t("files.circuit.viewStep")}
                    </Button>
                    <Button
                      size="1"
                      variant="soft"
                      onClick={() => {
                        const step = activeSteps.find((s) => s.label === holder.stepLabel);
                        if (step) setUserStep(step);
                      }}
                    >
                      <PersonIcon />
                      {t("files.circuit.viewUser")}
                    </Button>
                  </Flex>
                )}
              </Flex>
            </Box>
          ),
        )}

        {error && <StatusAlert variant="error" message={error} />}

        <Box>
          {stages.map((stage, stageIndex) => {
            const isParallel = stage.steps.length > 1;
            const isLastStage = stageIndex === stages.length - 1;
            const stageDone = stage.steps.filter((s) => s.status === "COMPLETED").length;
            const stageTotal = stage.steps.length;
            const stageComplete = stageDone === stageTotal;
            const stageActive = stage.steps.some(
              (s) => s.status === "IN_PROGRESS" || s.status === "SUSPENDED",
            );

            if (!isParallel) {
              const step = stage.steps[0];
              return (
                <PassageStepRow
                  key={step.id}
                  step={step}
                  isLast={isLastStage}
                  onOpenStep={setDetailStep}
                  onOpenUser={setUserStep}
                  actionSlot={renderActionSlot(step, false)}
                />
              );
            }

            return (
              <Flex key={stage.stageOrder} gap="3" align="stretch" mb={isLastStage ? "0" : "3"}>
                <Flex direction="column" align="center" style={{ width: 28 }}>
                  <StepIcon
                    status={stageComplete ? "COMPLETED" : stageActive ? "IN_PROGRESS" : "PENDING"}
                    active={stageActive}
                  />
                  {!isLastStage && (
                    <Box
                      style={{
                        width: 2,
                        flex: 1,
                        minHeight: 20,
                        marginTop: 4,
                        marginBottom: 4,
                        background: stageComplete ? "var(--green-a7)" : "var(--gray-a5)",
                        borderRadius: 1,
                      }}
                    />
                  )}
                </Flex>

                <Box style={{ flex: 1, minWidth: 0 }}>
                  <Flex
                    direction="column"
                    gap="3"
                    p="3"
                    style={{
                      borderRadius: "var(--radius-3)",
                      background: stageActive ? "var(--accent-a2)" : "var(--gray-a2)",
                      border: `1px solid ${
                        stageComplete
                          ? "var(--green-a6)"
                          : stageActive
                            ? "var(--accent-a6)"
                            : "var(--gray-a5)"
                      }`,
                    }}
                  >
                    <Flex justify="between" align="start" gap="2" wrap="wrap">
                      <Flex direction="column" gap="1">
                        <Flex align="center" gap="2" wrap="wrap">
                          <Badge size="1" variant="solid" color={stageComplete ? "green" : stageActive ? "blue" : "gray"}>
                            {stage.stageOrder}
                          </Badge>
                          <Text size="2" weight="bold">
                            {t("files.circuit.parallelStage")}
                          </Text>
                        </Flex>
                        <Text size="1" color="gray">
                          {t("files.circuit.parallelProgress", {
                            done: stageDone,
                            total: stageTotal,
                          })}
                        </Text>
                      </Flex>
                      <Badge size="1" variant="soft" color={stageComplete ? "green" : "blue"}>
                        {stageDone}/{stageTotal}
                      </Badge>
                    </Flex>

                    {stageActive && !stageComplete && (
                      <Text size="1" color="gray">
                        {t("files.circuit.parallelAutoAdvance")}
                      </Text>
                    )}

                    <Flex direction="column" gap="3">
                      {stage.steps.map((step) => (
                        <PassageStepRow
                          key={step.id}
                          step={step}
                          isLast
                          hideConnector
                          showStepOrder={false}
                          onOpenStep={setDetailStep}
                          onOpenUser={setUserStep}
                          actionSlot={renderActionSlot(step, true)}
                        />
                      ))}
                    </Flex>
                  </Flex>
                </Box>
              </Flex>
            );
          })}
        </Box>

        <PassageStepDetailDialog
          step={detailStep}
          open={Boolean(detailStep)}
          onOpenChange={(open) => {
            if (!open) setDetailStep(null);
          }}
          onOpenUser={(step) => {
            setDetailStep(null);
            setUserStep(step);
          }}
        />

        <ResponsibleUserDialog
          step={userStep}
          open={Boolean(userStep)}
          onOpenChange={(open) => {
            if (!open) setUserStep(null);
          }}
        />

        {canTransmit &&
          activeSteps.length > 0 &&
          !canActAnywhere &&
          (fileStatus === "IN_PROGRESS" || fileStatus === "ON_HOLD") && (
            <Box
              p="3"
              style={{
                borderRadius: "var(--radius-3)",
                background: "var(--gray-a3)",
                border: "1px solid var(--gray-a5)",
              }}
            >
              <Text size="2" color="gray" as="p">
                {t("files.circuit.notResponsible", {
                  name:
                    activeSteps
                      .map((s) => s.responsibleName)
                      .filter(Boolean)
                      .join(", ") || t("files.circuit.unassigned"),
                })}
              </Text>
            </Box>
          )}
      </Flex>
    </Card>
  );
}
