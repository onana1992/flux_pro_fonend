"use client";

import { Badge, Box, Card, Flex, Text } from "@radix-ui/themes";
import { CheckCircledIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import type { ChainStepTemplate } from "@/lib/types";
import { RoleBadge } from "@/components/ui/shared";

interface ChainCircuitWizardProps {
  steps: ChainStepTemplate[];
  /** Highlight a specific step (e.g. current passage on a file). */
  activeStepOrder?: number;
  /** Steps completed before the active one. */
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

export function ChainCircuitWizard({
  steps,
  activeStepOrder,
  completedStepOrders = [],
}: ChainCircuitWizardProps) {
  const { t } = useTranslation();
  const ordered = [...steps].sort((a, b) => a.stepOrder - b.stepOrder);

  return (
    <Flex
      direction="column"
      gap="0"
      role="list"
      aria-label={t("admin.chainTemplates.circuitPreview")}
    >
      {ordered.map((step, index) => {
        const isActive = activeStepOrder === step.stepOrder;
        const isCompleted = completedStepOrders.includes(step.stepOrder);
        const isLast = index === ordered.length - 1;
        const circleColor = stepCircleColor(step, isActive, isCompleted);
        const circleBg = stepCircleBg(step, isActive, isCompleted);

        return (
          <Flex
            key={step.id ?? step.stepOrder}
            gap="4"
            align="stretch"
            role="listitem"
          >
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
                  background: circleBg,
                  border: `2px solid ${circleColor}`,
                  flexShrink: 0,
                }}
              >
                {isCompleted ? (
                  <CheckCircledIcon width={20} height={20} color={circleColor} />
                ) : (
                  <Text size="2" weight="bold" style={{ color: circleColor }}>
                    {step.stepOrder}
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
              <Card
                size="2"
                variant={isActive ? "classic" : "surface"}
                style={{
                  width: "100%",
                  ...(isActive
                    ? { borderColor: "var(--accent-7)", boxShadow: "0 0 0 1px var(--accent-7)" }
                    : {}),
                }}
              >
                <Flex direction="column" gap="2">
                  <Flex gap="2" align="center" wrap="wrap">
                    <Text weight="medium" size="3">
                      {step.label}
                    </Text>
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
                    {isActive && (
                      <Badge size="1" color="blue" variant="solid">
                        {t("admin.chainTemplates.currentStep")}
                      </Badge>
                    )}
                  </Flex>

                  <Flex gap="2" align="center" wrap="wrap">
                    <RoleBadge role={step.responsibleRole} />
                    <Text size="2" color="gray">
                      · {step.delayValue}{" "}
                      {step.delayUnit === "WORKING_HOURS"
                        ? t("admin.chainTemplates.workingHoursShort")
                        : t("admin.chainTemplates.workingDaysShort")}
                    </Text>
                  </Flex>

                  {step.expectedAction && (
                    <Text size="2" color="gray" style={{ fontStyle: "italic" }}>
                      {step.expectedAction}
                    </Text>
                  )}
                </Flex>
              </Card>
            </Box>
          </Flex>
        );
      })}
    </Flex>
  );
}
