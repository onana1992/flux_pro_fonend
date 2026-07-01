"use client";

import { use, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil1Icon } from "@radix-ui/react-icons";
import { Badge, Box, Button, Card, Flex, Grid, Heading, Table, Text } from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { ApiError, deleteOrganization, getOrganization, getOrganizationTree } from "@/lib/api";
import { findOrgNode } from "@/lib/org-tree";
import { orgTypeColorHex } from "@/lib/org-type-colors";
import type { OrganisationTreeNode, OrganizationDetail } from "@/lib/types";
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

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Table.Row>
      <Table.RowHeaderCell style={{ width: "11rem" }}>{label}</Table.RowHeaderCell>
      <Table.Cell>
        {typeof value === "string" ? <Text size="2">{value}</Text> : value}
      </Table.Cell>
    </Table.Row>
  );
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

export default function OrgEntityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useTranslation();
  const router = useRouter();
  const [org, setOrg] = useState<OrganizationDetail | null>(null);
  const [tree, setTree] = useState<OrganisationTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const treeNode = useMemo(() => findOrgNode(tree, id), [tree, id]);
  const accent = orgTypeColorHex(treeNode?.type.color);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [detail, orgTree] = await Promise.all([getOrganization(id), getOrganizationTree()]);
      setOrg(detail);
      setTree(orgTree);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete() {
    if (!org || !confirm(t("admin.org.deleteConfirm"))) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteOrganization(org.id);
      router.push("/admin/org");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("admin.org.deleteFailed"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <RequireAuth admin>
      <AppShell>
        <PageHeader
          title={t("admin.org.detailTitle")}
          description={t("admin.org.description")}
          actions={
            org ? (
              <Flex gap="2" wrap="wrap">
                <Button variant="soft" color="gray" asChild>
                  <Link href="/admin/org">{t("admin.org.backToList")}</Link>
                </Button>
                <Button asChild>
                  <Link href={`/admin/org/${org.id}/edit`}>
                    <Pencil1Icon />
                    {t("admin.org.edit")}
                  </Link>
                </Button>
                <Button
                  size="1"
                  variant="soft"
                  color="red"
                  disabled={deleting}
                  onClick={handleDelete}
                >
                  {t("admin.org.delete")}
                </Button>
              </Flex>
            ) : undefined
          }
        />

        {error && <StatusAlert message={error} variant="error" />}

        {loading ? (
          <Card size="3">
            <LoadingBlock message={t("admin.org.loading")} />
          </Card>
        ) : org ? (
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
                      {org.code}
                    </Text>
                    <Heading size="5" mb="1">
                      {org.name}
                    </Heading>
                    <Badge
                      color={typeBadgeColor(org.typeCode, treeNode?.type.color)}
                      variant="soft"
                      size="1"
                    >
                      {t(`orgTypes.${org.typeCode}`, { defaultValue: org.typeName })}
                    </Badge>
                  </Box>
                </Flex>
                <Badge color={org.active ? "green" : "gray"} variant="soft" size="2">
                  {org.active ? t("common.active") : t("common.inactive")}
                </Badge>
              </Flex>
            </Card>

            <Grid columns={{ initial: "1", md: "2" }} gap="4">
              <InfoCard title={t("admin.org.sectionIdentity")}>
                <Table.Root variant="surface">
                  <Table.Body>
                    <DetailRow label={t("admin.org.name")} value={org.name} />
                    <DetailRow label={t("admin.org.code")} value={org.code} />
                  </Table.Body>
                </Table.Root>
              </InfoCard>

              <InfoCard title={t("admin.org.sectionHierarchy")}>
                <Table.Root variant="surface">
                  <Table.Body>
                    <DetailRow
                      label={t("admin.org.type")}
                      value={
                        <Badge
                          color={typeBadgeColor(org.typeCode, treeNode?.type.color)}
                          variant="soft"
                          size="1"
                        >
                          {org.typeName} ({org.typeCode})
                        </Badge>
                      }
                    />
                    <DetailRow
                      label={t("admin.org.parent")}
                      value={org.parentCode ?? t("admin.org.rootEntity")}
                    />
                    <DetailRow
                      label={t("admin.org.status")}
                      value={
                        <Badge color={org.active ? "green" : "gray"} variant="soft">
                          {org.active ? t("common.active") : t("common.inactive")}
                        </Badge>
                      }
                    />
                  </Table.Body>
                </Table.Root>
              </InfoCard>
            </Grid>

            <InfoCard title={t("admin.org.sectionDisplay")}>
              <Table.Root variant="surface">
                <Table.Body>
                  <DetailRow label={t("admin.org.code")} value={org.code} />
                  <Table.Row>
                    <Table.RowHeaderCell style={{ width: "11rem" }}>
                      {t("admin.org.type")}
                    </Table.RowHeaderCell>
                    <Table.Cell>
                      <Flex align="center" gap="2">
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
                          {t(`orgTypes.${org.typeCode}`, { defaultValue: org.typeName })}
                        </Text>
                      </Flex>
                    </Table.Cell>
                  </Table.Row>
                  <DetailRow
                    label={t("admin.org.parent")}
                    value={org.parentCode ?? t("admin.org.noParent")}
                  />
                </Table.Body>
              </Table.Root>
            </InfoCard>
          </Flex>
        ) : null}
      </AppShell>
    </RequireAuth>
  );
}
