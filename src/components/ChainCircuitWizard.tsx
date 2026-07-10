"use client";

import { Badge, Box, Card, Flex, Text } from "@radix-ui/themes";
import { CheckCircledIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import type { ChainStepTemplate } from "@/lib/types";
import { RoleBadge } from "@/components/ui/shared";

interface ChainCircuitWizardProps {
  steps: ChainStepTemplate[];
  /** Highlight a specific stage (e.g. current passage on a file). */
  activeStepOrder?: number;
  /** Stages completed before the active one. */
  completedStepOrders?: number[];
}

const CIRCLE_SIZE = 40;
const STEP_GAP = 24;

function stepCircleColor(
  step: ChainStepTemplate,
  isActive: boolean,
  isCompleted: boolean,
): string {
  if (isCompleted) return "var(--green-9)";
  if (isActive) return "var(--accent-9)";
  if (step.closureStep) return "var(--purple-9)";
  if (step.optional) return "var(--orange-9)";
  return "var(--accent-9)";
}

function stepCircleBg(
  step: ChainStepTemplate,
  isActive: boolean,
  isCompleted: boolean,
): string {
  if (isCompleted) return "var(--green-3)";
  if (isActive) return "var(--accent-3)";
  if (step.closureStep) return "var(--purple-3)";
  if (step.optional) return "var(--orange-3)";
  return "var(--accent-3)";
}

function StepCard({
  step,
  isActive,
  isCompleted,
}: {
  step: ChainStepTemplate;
  isActive: boolean;
  isCompleted: boolean;
}) {
  const { t } = useTranslation();
  const circleColor = stepCircleColor(step, isActive, isCompleted);
  const circleBg = stepCircleBg(step, isActive, isCompleted);

  return (
    <Card
      size="2"
      variant={isActive ? "classic" : "surface"}
      style={{
        flex: 1,
        minWidth: 200,
        ...(isActive
          ? { borderColor: "var(--accent-7)", boxShadow: "0 0 0 1px var(--accent-7)" }
          : {}),
      }}
    >
      <Flex direction="column" gap="2">
        <Flex align="center" gap="2">
          <Flex
            align="center"
            justify="center"
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: circleBg,
              border: `2px solid ${circleColor}`,
              flexShrink: 0,
            }}
          >
            {isCompleted ? (
              <CheckCircledIcon width={16} height={16} color={circleColor} />
            ) : (
              <Text size="1" weight="bold" style={{ color: circleColor }}>
                {step.stepOrder}
              </Text>
            )}
          </Flex>
          <Text size="2" weight="bold">
            {step.label || "—"}
          </Text>
        </Flex>
        <RoleBadge role={step.responsibleRole} />
        {step.expectedAction && (
          <Text size="1" color="gray">
            {step.expectedAction}
          </Text>
        )}
        {!step.closureStep && (
          <Text size="1" color="gray">
            {step.delayValue} {step.delayUnit === "WORKING_HOURS" ? "h" : t("admin.chainTemplates.workingDaysShort")}
          </Text>
        )}
        {step.optional && (
          <Badge size="1" color="orange" variant="soft">
            {t("admin.chainTemplates.optional")}
          </Badge>
        )}
        {step.closureStep && (
          <Badge size="1" color="purple" variant="soft">
            {t("admin.chainTemplates.closureStep")}
          </Badge>
        )}
      </Flex>
    </Card>
  );
}

export function ChainCircuitWizard({
  steps,
  activeStepOrder,
  completedStepOrders = [],
}: ChainCircuitWizardProps) {
  const { t } = useTranslation();
  const ordered = [...steps].sort((a, b) =>
    a.stepOrder !== b.stepOrder ? a.stepOrder - b.stepOrder : a.label.localeCompare(b.label),
  );
  const stages = [...new Set(ordered.map((s) => s.stepOrder))].sort((a, b) => a - b);

  return (
    <Flex
      direction="column"
      gap="0"
      role="list"
      aria-label={t("admin.chainTemplates.circuitPreview")}
    >
      {stages.map((stageOrder, stageIndex) => {
        const stageSteps = ordered.filter((s) => s.stepOrder === stageOrder);
        const isActive = activeStepOrder === stageOrder;
        const isCompleted = completedStepOrders.includes(stageOrder);
        const isLast = stageIndex === stages.length - 1;
        const isParallel = stageSteps.length > 1;

        return (
          <Flex key={stageOrder} direction="column" gap="2" role="listitem">
            <Flex gap="4" align="stretch">
              <Flex
                direction="column"
                align="center"
                style={{ width: CIRCLE_SIZE, flexShrink: 0 }}
              >
                <Flex
                  align="center"
                  justify="center"
                  style={{
                    width: CIRCLE_SIZE,
                    height: CIRCLE_SIZE,
                    borderRadius: "50%",
                    background: isCompleted
                      ? "var(--green-3)"
                      : isActive
                        ? "var(--accent-3)"
                        : "var(--gray-a3)",
                    border: `2px solid ${isCompleted ? "var(--green-9)" : isActive ? "var(--accent-9)" : "var(--gray-9)"}`,
                  }}
                >
                  {isCompleted ? (
                    <CheckCircledIcon width={20} height={20} color="var(--green-9)" />
                  ) : (
                    <Text size="2" weight="bold">
                      {stageOrder}
                    </Text>
                  )}
                </Flex>
                {!isLast && (
                  <Box
                    aria-hidden
                    style={{
                      width: 2,
                      flex: 1,
                      minHeight: STEP_GAP,
                      background: "var(--gray-a6)",
                    }}
                  />
                )}
              </Flex>

              <Box style={{ flex: 1, paddingBottom: isLast ? 0 : STEP_GAP }}>
                {isParallel && (
                  <Text size="1" color="gray" mb="2">
                    {t("admin.chainTemplates.parallelStage")}
                  </Text>
                )}
                <Flex gap="3" wrap="wrap">
                  {stageSteps.map((step) => (
                    <StepCard
                      key={step.id ?? `${step.stepOrder}-${step.label}`}
                      step={step}
                      isActive={isActive}
                      isCompleted={isCompleted}
                    />
                  ))}
                </Flex>
              </Box>
            </Flex>
          </Flex>
        );
      })}
    </Flex>
  );
}
