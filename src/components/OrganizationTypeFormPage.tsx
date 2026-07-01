"use client";

import { FormEvent, useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Flex,
  Grid,
  Heading,
  Select,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { ApiError, getOrganizationType, updateOrganizationType } from "@/lib/api";
import { ORG_TYPE_COLOR_OPTIONS, orgTypeColorHex } from "@/lib/org-type-colors";
import type { OrganizationTypeRequest } from "@/lib/types";
import { LoadingBlock, PageHeader, StatusAlert } from "@/components/ui/shared";

function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card size="3">
      <Text as="p" size="2" weight="bold" mb="3">
        {title}
      </Text>
      {children}
    </Card>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <Text as="div" size="2" weight="medium" mb="1">
      {children}
    </Text>
  );
}

export function OrganizationTypeFormPage({ typeId }: { typeId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<OrganizationTypeRequest | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const type = await getOrganizationType(typeId);
      setForm({
        code: type.code,
        name: type.name,
        nameEn: type.nameEn,
        description: type.description,
        color: type.color ?? "blue",
        sortOrder: type.sortOrder,
        allowsRoot: type.allowsRoot,
        isRegionalScope: type.isRegionalScope,
        active: type.active,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [typeId, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSubmitting(true);
    setError(null);
    try {
      await updateOrganizationType(typeId, {
        ...form,
        name: form.name.trim(),
        nameEn: form.nameEn?.trim() || undefined,
        description: form.description?.trim() || undefined,
      });
      router.push(`/admin/org/types/${typeId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("admin.orgTypes.editFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  const accent = orgTypeColorHex(form?.color);

  return (
    <RequireAuth admin>
      <AppShell>
        <PageHeader
          title={t("admin.orgTypes.editTitle")}
          description={t("admin.orgTypes.description")}
          actions={
            <Button
              variant="soft"
              color="gray"
              onClick={() => router.push(`/admin/org/types/${typeId}`)}
            >
              {t("common.cancel")}
            </Button>
          }
        />

        {error && <StatusAlert message={error} variant="error" />}

        {loading ? (
          <Card size="3">
            <LoadingBlock message={t("admin.orgTypes.loading")} />
          </Card>
        ) : form ? (
          <form onSubmit={handleSubmit}>
            <Flex direction="column" gap="4">
              <Card size="3">
                <Flex align="center" justify="between" gap="4" wrap="wrap">
                  <Flex align="center" gap="4">
                    <Box
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 12,
                        background: accent,
                        flexShrink: 0,
                      }}
                    />
                    <Box>
                      <Text
                        size="1"
                        color="gray"
                        mb="1"
                        style={{ fontFamily: "var(--font-geist-mono)", letterSpacing: "0.05em" }}
                      >
                        {form.code}
                      </Text>
                      <Heading size="5" mb="1">
                        {form.name || "—"}
                      </Heading>
                      {form.nameEn && (
                        <Text size="2" color="gray">
                          {form.nameEn}
                        </Text>
                      )}
                    </Box>
                  </Flex>
                  <Badge color={form.active ? "green" : "gray"} variant="soft" size="2">
                    {form.active ? t("common.active") : t("common.inactive")}
                  </Badge>
                </Flex>
              </Card>

              <Grid columns={{ initial: "1", md: "2" }} gap="4">
                <InfoCard title={t("admin.orgTypes.sectionIdentity")}>
                  <Flex direction="column" gap="3">
                    <label>
                      <FieldLabel>{t("admin.orgTypes.name")}</FieldLabel>
                      <TextField.Root
                        required
                        value={form.name}
                        onChange={(e) => setForm((f) => f && { ...f, name: e.target.value })}
                      />
                    </label>
                    <label>
                      <FieldLabel>{t("admin.orgTypes.nameEn")}</FieldLabel>
                      <TextField.Root
                        value={form.nameEn ?? ""}
                        onChange={(e) => setForm((f) => f && { ...f, nameEn: e.target.value })}
                      />
                    </label>
                    <label>
                      <FieldLabel>{t("admin.orgTypes.descriptionField")}</FieldLabel>
                      <TextArea
                        rows={3}
                        value={form.description ?? ""}
                        onChange={(e) =>
                          setForm((f) => f && { ...f, description: e.target.value })
                        }
                      />
                    </label>
                  </Flex>
                </InfoCard>

                <InfoCard title={t("admin.orgTypes.sectionConfiguration")}>
                  <Flex direction="column" gap="3">
                    <label>
                      <FieldLabel>{t("admin.orgTypes.sortOrder")}</FieldLabel>
                      <TextField.Root
                        type="number"
                        value={String(form.sortOrder ?? 0)}
                        onChange={(e) =>
                          setForm(
                            (f) => f && { ...f, sortOrder: Number(e.target.value) || 0 },
                          )
                        }
                      />
                    </label>
                    <Flex direction="column" gap="2" mt="1">
                      <Text as="label" size="2">
                        <Flex gap="2" align="center">
                          <Checkbox
                            checked={form.allowsRoot}
                            onCheckedChange={(v) =>
                              setForm((f) => f && { ...f, allowsRoot: v === true })
                            }
                          />
                          {t("admin.orgTypes.allowsRoot")}
                        </Flex>
                      </Text>
                      <Text as="label" size="2">
                        <Flex gap="2" align="center">
                          <Checkbox
                            checked={form.isRegionalScope}
                            onCheckedChange={(v) =>
                              setForm((f) => f && { ...f, isRegionalScope: v === true })
                            }
                          />
                          {t("admin.orgTypes.isRegionalScope")}
                        </Flex>
                      </Text>
                      <Text as="label" size="2">
                        <Flex gap="2" align="center">
                          <Checkbox
                            checked={form.active}
                            onCheckedChange={(v) =>
                              setForm((f) => f && { ...f, active: v === true })
                            }
                          />
                          {t("common.active")}
                        </Flex>
                      </Text>
                    </Flex>
                  </Flex>
                </InfoCard>
              </Grid>

              <InfoCard title={t("admin.orgTypes.sectionDisplay")}>
                <Flex direction="column" gap="3">
                  <label>
                    <FieldLabel>{t("admin.orgTypes.code")}</FieldLabel>
                    <TextField.Root
                      readOnly
                      value={form.code}
                      style={{ fontFamily: "var(--font-geist-mono)", opacity: 0.75 }}
                    />
                    <Text size="1" color="gray" mt="1">
                      {t("admin.orgTypes.codeImmutableHint")}
                    </Text>
                  </label>
                  <label>
                    <FieldLabel>{t("admin.orgTypes.color")}</FieldLabel>
                    <Select.Root
                      value={form.color ?? "blue"}
                      onValueChange={(color) => setForm((f) => f && { ...f, color })}
                    >
                      <Select.Trigger style={{ width: "100%" }} />
                      <Select.Content>
                        {ORG_TYPE_COLOR_OPTIONS.map((color) => (
                          <Select.Item key={color} value={color}>
                            <Flex align="center" gap="2">
                              <Box
                                style={{
                                  width: 10,
                                  height: 10,
                                  borderRadius: "50%",
                                  background: orgTypeColorHex(color),
                                }}
                              />
                              {color}
                            </Flex>
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </label>
                </Flex>
              </InfoCard>

              <Card size="3">
                <Flex gap="2" justify="end" wrap="wrap">
                  <Button
                    type="button"
                    variant="soft"
                    color="gray"
                    onClick={() => router.push(`/admin/org/types/${typeId}`)}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? t("admin.orgTypes.saving") : t("admin.orgTypes.edit")}
                  </Button>
                </Flex>
              </Card>
            </Flex>
          </form>
        ) : null}
      </AppShell>
    </RequireAuth>
  );
}
