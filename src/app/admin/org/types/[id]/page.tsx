"use client";

import { use, useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil1Icon } from "@radix-ui/react-icons";
import { Badge, Box, Button, Card, Flex, Grid, Heading, Table, Text } from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { ApiError, deleteOrganizationType, getOrganizationType } from "@/lib/api";
import { orgTypeColorHex } from "@/lib/org-type-colors";
import type { OrganizationType } from "@/lib/types";
import { LoadingBlock, PageHeader, StatusAlert } from "@/components/ui/shared";

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

export default function OrgTypeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useTranslation();
  const router = useRouter();
  const [type, setType] = useState<OrganizationType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setType(await getOrganizationType(id));
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
    if (!type || !confirm(t("admin.orgTypes.deleteConfirm"))) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteOrganizationType(type.id);
      router.push("/admin/org/types");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("admin.orgTypes.deleteFailed"));
    } finally {
      setDeleting(false);
    }
  }

  const accent = orgTypeColorHex(type?.color);

  return (
    <RequireAuth admin>
      <AppShell>
        <PageHeader
          title={t("admin.orgTypes.detailTitle")}
          description={t("admin.orgTypes.description")}
          actions={
            type ? (
              <Flex gap="2" wrap="wrap">
                <Button variant="soft" color="gray" asChild>
                  <Link href="/admin/org/types">{t("admin.orgTypes.backToList")}</Link>
                </Button>
                <Button asChild>
                  <Link href={`/admin/org/types/${type.id}/edit`}>
                    <Pencil1Icon />
                    {t("admin.orgTypes.edit")}
                  </Link>
                </Button>
                <Button
                  size="1"
                  variant="soft"
                  color="red"
                  disabled={deleting}
                  onClick={handleDelete}
                >
                  {t("admin.orgTypes.delete")}
                </Button>
              </Flex>
            ) : undefined
          }
        />

        {error && <StatusAlert message={error} variant="error" />}

        {loading ? (
          <Card size="3">
            <LoadingBlock message={t("admin.orgTypes.loading")} />
          </Card>
        ) : type ? (
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
                      {type.code}
                    </Text>
                    <Heading size="5" mb="1">
                      {type.name}
                    </Heading>
                    {type.nameEn && (
                      <Text size="2" color="gray">
                        {type.nameEn}
                      </Text>
                    )}
                  </Box>
                </Flex>
                <Badge color={type.active ? "green" : "gray"} variant="soft" size="2">
                  {type.active ? t("common.active") : t("common.inactive")}
                </Badge>
              </Flex>
            </Card>

            <Grid columns={{ initial: "1", md: "2" }} gap="4">
              <InfoCard title={t("admin.orgTypes.sectionIdentity")}>
                <Table.Root variant="surface">
                  <Table.Body>
                    <DetailRow label={t("admin.orgTypes.name")} value={type.name} />
                    <DetailRow label={t("admin.orgTypes.nameEn")} value={type.nameEn ?? "—"} />
                    <DetailRow
                      label={t("admin.orgTypes.descriptionField")}
                      value={type.description?.trim() ? type.description : "—"}
                    />
                  </Table.Body>
                </Table.Root>
              </InfoCard>

              <InfoCard title={t("admin.orgTypes.sectionConfiguration")}>
                <Table.Root variant="surface">
                  <Table.Body>
                    <DetailRow
                      label={t("admin.orgTypes.root")}
                      value={type.allowsRoot ? t("common.yes") : t("common.no")}
                    />
                    <DetailRow
                      label={t("admin.orgTypes.regional")}
                      value={type.isRegionalScope ? t("common.yes") : t("common.no")}
                    />
                    <DetailRow label={t("admin.orgTypes.sortOrder")} value={String(type.sortOrder)} />
                    <DetailRow
                      label={t("admin.orgTypes.status")}
                      value={
                        <Badge color={type.active ? "green" : "gray"} variant="soft">
                          {type.active ? t("common.active") : t("common.inactive")}
                        </Badge>
                      }
                    />
                  </Table.Body>
                </Table.Root>
              </InfoCard>
            </Grid>

            <InfoCard title={t("admin.orgTypes.sectionDisplay")}>
              <Table.Root variant="surface">
                <Table.Body>
                  <DetailRow label={t("admin.orgTypes.code")} value={type.code} />
                  <Table.Row>
                    <Table.RowHeaderCell style={{ width: "11rem" }}>
                      {t("admin.orgTypes.color")}
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
                        <Text size="2">{type.color ?? "—"}</Text>
                      </Flex>
                    </Table.Cell>
                  </Table.Row>
                </Table.Body>
              </Table.Root>
            </InfoCard>
          </Flex>
        ) : null}
      </AppShell>
    </RequireAuth>
  );
}
