"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
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
  TextField,
} from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import {
  ApiError,
  getOrganization,
  getOrganizationTree,
  getOrganizationTypes,
  updateOrganization,
} from "@/lib/api";
import { collectDescendantIds, flattenOrgTree } from "@/lib/org-tree";
import { orgTypeColorHex } from "@/lib/org-type-colors";
import type { OrganisationTreeNode, OrganizationRequest, OrganizationType } from "@/lib/types";
import { LoadingBlock, PageHeader, StatusAlert } from "@/components/ui/shared";

const TYPE_BADGE_COLORS = new Set(["purple", "blue", "gray", "green", "orange", "red", "yellow"]);

function typeBadgeColor(code: string, color?: string | null): "purple" | "blue" | "gray" | "green" | "orange" {
  const c = color?.toLowerCase();
  if (c && TYPE_BADGE_COLORS.has(c)) return c as "purple" | "blue" | "gray" | "green" | "orange";
  const fallback: Record<string, "purple" | "blue" | "gray" | "green" | "orange"> = {
    MINISTRY: "purple",
    DIRECTORATE: "blue",
    DIVISION: "gray",
    SERVICE: "green",
    REGIONAL_DIRECTORATE: "orange",
  };
  return fallback[code] ?? "gray";
}

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

export function OrganizationFormPage({ organizationId }: { organizationId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [tree, setTree] = useState<OrganisationTreeNode[]>([]);
  const [types, setTypes] = useState<OrganizationType[]>([]);
  const [form, setForm] = useState<OrganizationRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const excludedParentIds = useMemo(
    () => collectDescendantIds(tree, organizationId),
    [tree, organizationId],
  );
  const parentOptions = useMemo(
    () =>
      flattenOrgTree(tree).filter(
        (org) => org.active && !excludedParentIds.has(org.id) && org.id !== organizationId,
      ),
    [tree, excludedParentIds, organizationId],
  );

  const selectedType = types.find((type) => type.id === form?.typeId);
  const parentRequired = selectedType ? !selectedType.allowsRoot : false;
  const accent = orgTypeColorHex(selectedType?.color);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [org, orgTree, orgTypes] = await Promise.all([
        getOrganization(organizationId),
        getOrganizationTree(),
        getOrganizationTypes(),
      ]);
      setTree(orgTree);
      setTypes(orgTypes);
      setForm({
        code: org.code,
        name: org.name,
        typeId: org.typeId,
        parentId: org.parentId ?? null,
        active: org.active,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [organizationId, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    if (parentRequired && !form.parentId) {
      setError(t("admin.org.parentRequired"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await updateOrganization(organizationId, {
        ...form,
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        parentId: form.parentId || null,
      });
      router.push(`/admin/org/${organizationId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("admin.org.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RequireAuth admin>
      <AppShell>
        <PageHeader
          title={t("admin.org.editTitle")}
          description={t("admin.org.description")}
          actions={
            <Button
              variant="soft"
              color="gray"
              onClick={() => router.push(`/admin/org/${organizationId}`)}
            >
              {t("common.cancel")}
            </Button>
          }
        />

        {error && <StatusAlert message={error} variant="error" />}

        {loading ? (
          <Card size="3">
            <LoadingBlock message={t("admin.org.loading")} />
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
                      {selectedType && (
                        <Badge
                          color={typeBadgeColor(selectedType.code, selectedType.color)}
                          variant="soft"
                          size="1"
                        >
                          {selectedType.name}
                        </Badge>
                      )}
                    </Box>
                  </Flex>
                  <Badge color={form.active ? "green" : "gray"} variant="soft" size="2">
                    {form.active ? t("common.active") : t("common.inactive")}
                  </Badge>
                </Flex>
              </Card>

              <Grid columns={{ initial: "1", md: "2" }} gap="4">
                <InfoCard title={t("admin.org.sectionIdentity")}>
                  <Flex direction="column" gap="3">
                    <label>
                      <FieldLabel>{t("admin.org.name")}</FieldLabel>
                      <TextField.Root
                        required
                        value={form.name}
                        onChange={(e) => setForm((f) => f && { ...f, name: e.target.value })}
                      />
                    </label>
                  </Flex>
                </InfoCard>

                <InfoCard title={t("admin.org.sectionHierarchy")}>
                  <Flex direction="column" gap="3">
                    <label>
                      <FieldLabel>{t("admin.org.type")}</FieldLabel>
                      <Select.Root
                        required
                        value={form.typeId}
                        onValueChange={(typeId) => setForm((f) => f && { ...f, typeId })}
                      >
                        <Select.Trigger placeholder={t("admin.org.typePlaceholder")} style={{ width: "100%" }} />
                        <Select.Content>
                          {types.map((type) => (
                            <Select.Item key={type.id} value={type.id}>
                              <Flex align="center" gap="2">
                                <Box
                                  style={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: "50%",
                                    background: orgTypeColorHex(type.color),
                                  }}
                                />
                                {type.name} ({type.code})
                              </Flex>
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Root>
                    </label>

                    <label>
                      <FieldLabel>
                        {t("admin.org.parent")}
                        {parentRequired ? " *" : ""}
                      </FieldLabel>
                      <Select.Root
                        value={form.parentId ?? "__none__"}
                        onValueChange={(value) =>
                          setForm((f) => f && { ...f, parentId: value === "__none__" ? null : value })
                        }
                      >
                        <Select.Trigger
                          placeholder={t("admin.org.parentPlaceholder")}
                          style={{ width: "100%" }}
                        />
                        <Select.Content>
                          {!parentRequired && (
                            <Select.Item value="__none__">{t("admin.org.noParent")}</Select.Item>
                          )}
                          {parentOptions.map((org) => (
                            <Select.Item key={org.id} value={org.id}>
                              {org.code} — {org.name}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Root>
                    </label>

                    <Flex direction="column" gap="2" mt="1">
                      <Text as="label" size="2">
                        <Flex gap="2" align="center">
                          <Checkbox
                            checked={form.active}
                            onCheckedChange={(v) =>
                              setForm((f) => f && { ...f, active: v === true })
                            }
                          />
                          {t("admin.org.active")}
                        </Flex>
                      </Text>
                    </Flex>
                  </Flex>
                </InfoCard>
              </Grid>

              <InfoCard title={t("admin.org.sectionDisplay")}>
                <Flex direction="column" gap="3">
                  <label>
                    <FieldLabel>{t("admin.org.code")}</FieldLabel>
                    <TextField.Root
                      readOnly
                      value={form.code}
                      style={{ fontFamily: "var(--font-geist-mono)", opacity: 0.75 }}
                    />
                    <Text size="1" color="gray" mt="1">
                      {t("admin.org.codeImmutableHint")}
                    </Text>
                  </label>
                  {selectedType && (
                    <label>
                      <FieldLabel>{t("admin.org.type")}</FieldLabel>
                      <Flex align="center" gap="2" mt="1">
                        <Box
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: "50%",
                            background: accent,
                            flexShrink: 0,
                          }}
                        />
                        <Text size="2">
                          {selectedType.name} ({selectedType.code})
                        </Text>
                      </Flex>
                    </label>
                  )}
                </Flex>
              </InfoCard>

              <Card size="3">
                <Flex gap="2" justify="end" wrap="wrap">
                  <Button
                    type="button"
                    variant="soft"
                    color="gray"
                    onClick={() => router.push(`/admin/org/${organizationId}`)}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? t("admin.org.saving") : t("admin.org.edit")}
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
