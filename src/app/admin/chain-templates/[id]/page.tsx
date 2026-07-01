"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Badge, Box, Button, Card, Flex, Separator, Text } from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import {
  ApiError,
  activateChainTemplate,
  deactivateChainTemplate,
  deleteChainTemplate,
  duplicateChainTemplate,
  getChainTemplate,
} from "@/lib/api";
import { hasPermission } from "@/lib/auth-storage";
import type { ChainTemplateDetail } from "@/lib/types";
import { LoadingBlock, PageHeader, StatusAlert } from "@/components/ui/shared";

export default function ChainTemplateDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params.id as string;
  const [template, setTemplate] = useState<ChainTemplateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canUpdate = hasPermission(user, "CHAIN_TEMPLATES:UPDATE");
  const canCreate = hasPermission(user, "CHAIN_TEMPLATES:CREATE");
  const canDelete = hasPermission(user, "CHAIN_TEMPLATES:DELETE");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTemplate(await getChainTemplate(id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDuplicate() {
    try {
      const copy = await duplicateChainTemplate(id);
      router.push(`/admin/chain-templates/${copy.id}/edit`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    }
  }

  async function handleToggleActive() {
    if (!template) return;
    try {
      if (template.active) {
        await deactivateChainTemplate(id);
        setSuccess(t("admin.chainTemplates.deactivateSuccess"));
      } else {
        await activateChainTemplate(id);
        setSuccess(t("admin.chainTemplates.activateSuccess"));
      }
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    }
  }

  async function handleDelete() {
    if (!template || !confirm(t("admin.chainTemplates.deleteConfirm", { code: template.code }))) return;
    try {
      await deleteChainTemplate(id);
      router.push("/admin/chain-templates");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    }
  }

  return (
    <RequireAuth permission="CHAIN_TEMPLATES:READ">
      <AppShell>
        {loading ? (
          <LoadingBlock />
        ) : !template ? (
          <StatusAlert message={error ?? t("common.errorLoad")} variant="error" />
        ) : (
          <>
            <PageHeader
              title={`${template.code} — ${template.name}`}
              description={template.description ?? t("admin.chainTemplates.detailDescription")}
              actions={
                <Flex gap="2" wrap="wrap">
                  <Button variant="soft" asChild>
                    <Link href="/admin/chain-templates">{t("admin.chainTemplates.backToList")}</Link>
                  </Button>
                  {canUpdate && (
                    <Button asChild>
                      <Link href={`/admin/chain-templates/${id}/edit`}>{t("admin.chainTemplates.edit")}</Link>
                    </Button>
                  )}
                  {canCreate && (
                    <Button variant="soft" onClick={handleDuplicate}>
                      {t("admin.chainTemplates.duplicate")}
                    </Button>
                  )}
                  {canUpdate && (
                    <Button variant="soft" color="orange" onClick={handleToggleActive}>
                      {template.active
                        ? t("admin.chainTemplates.deactivate")
                        : t("admin.chainTemplates.activate")}
                    </Button>
                  )}
                  {canDelete && !template.systemTemplate && (
                    <Button variant="soft" color="red" onClick={handleDelete}>
                      {t("admin.chainTemplates.delete")}
                    </Button>
                  )}
                </Flex>
              }
            />

            {error && <StatusAlert message={error} variant="error" />}
            {success && <StatusAlert message={success} variant="success" />}

            <Flex gap="4" direction={{ initial: "column", md: "row" }}>
              <Card size="3" style={{ flex: 1 }}>
                <Flex direction="column" gap="3">
                  <Text weight="bold">{t("admin.chainTemplates.metadata")}</Text>
                  <Flex gap="2" wrap="wrap">
                    {template.systemTemplate && (
                      <Badge color="blue">{t("admin.chainTemplates.systemTemplate")}</Badge>
                    )}
                    <Badge color={template.active ? "green" : "gray"}>
                      {template.active ? t("common.active") : t("common.inactive")}
                    </Badge>
                  </Flex>
                  <Text size="2">
                    <Text weight="medium">{t("admin.chainTemplates.fileTypeCode")}: </Text>
                    {template.fileTypeCode ?? "—"}
                  </Text>
                  <Text size="2">
                    <Text weight="medium">{t("admin.chainTemplates.totalDelayDays")}: </Text>
                    {template.totalDelayDays}{" "}
                    {template.delayUnit === "WORKING_HOURS"
                      ? t("admin.chainTemplates.workingHoursShort")
                      : t("admin.chainTemplates.workingDaysShort")}
                  </Text>
                </Flex>
              </Card>

              <Card size="3" style={{ flex: 2 }}>
                <Text weight="bold" mb="3">
                  {t("admin.chainTemplates.circuitPreview")}
                </Text>
                <Flex direction="column" gap="0">
                  {template.steps.map((step, index) => (
                    <Box key={step.id ?? index}>
                      <Flex gap="3" py="3">
                        <Flex
                          align="center"
                          justify="center"
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: "var(--accent-3)",
                            flexShrink: 0,
                          }}
                        >
                          <Text size="2" weight="bold">
                            {step.stepOrder}
                          </Text>
                        </Flex>
                        <Flex direction="column" gap="1" style={{ flex: 1 }}>
                          <Flex gap="2" align="center" wrap="wrap">
                            <Text weight="medium">{step.label}</Text>
                            {step.optional && (
                              <Badge size="1" color="orange">
                                {t("admin.chainTemplates.optional")}
                              </Badge>
                            )}
                            {step.closureStep && (
                              <Badge size="1" color="purple">
                                {t("admin.chainTemplates.closureStep")}
                              </Badge>
                            )}
                          </Flex>
                          <Text size="2" color="gray">
                            {step.responsibleRole} · {step.delayValue}{" "}
                            {step.delayUnit === "WORKING_HOURS" ? "h" : "j.o."}
                          </Text>
                          {step.expectedAction && (
                            <Text size="2" color="gray">
                              {step.expectedAction}
                            </Text>
                          )}
                        </Flex>
                      </Flex>
                      {index < template.steps.length - 1 && <Separator size="4" />}
                    </Box>
                  ))}
                </Flex>
              </Card>
            </Flex>
          </>
        )}
      </AppShell>
    </RequireAuth>
  );
}
