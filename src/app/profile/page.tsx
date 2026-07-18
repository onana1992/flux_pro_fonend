"use client";

import { useCallback, useEffect, useState } from "react";
import { Avatar, Badge, Card, Flex, Table, Text } from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { ApiError, getMe } from "@/lib/api";
import type { UserProfile } from "@/lib/types";
import { LoadingBlock, PageHeader, StatusAlert } from "@/components/ui/shared";

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Table.Row>
      <Table.RowHeaderCell style={{ width: "12rem" }}>{label}</Table.RowHeaderCell>
      <Table.Cell>
        {typeof value === "string" ? <Text size="2">{value}</Text> : value}
      </Table.Cell>
    </Table.Row>
  );
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user: sessionUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(sessionUser);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await getMe();
      setProfile(me);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
      if (sessionUser) setProfile(sessionUser);
    } finally {
      setLoading(false);
    }
  }, [sessionUser, t]);

  useEffect(() => {
    load();
  }, [load]);

  const display = profile ?? sessionUser;

  return (
    <RequireAuth>
      <AppShell>
        <PageHeader title={t("profile.title")} description={t("profile.description")} />

        {error && <StatusAlert message={error} variant="error" />}

        {loading && !display ? (
          <LoadingBlock message={t("common.loading")} />
        ) : display ? (
          <Flex direction="column" gap="4" style={{ maxWidth: "40rem" }}>
            <Card size="2">
              <Flex align="center" gap="4" p="4" pb="2">
                <Avatar
                  size="5"
                  fallback={`${display.firstName[0]}${display.lastName[0]}`}
                  radius="full"
                  color="indigo"
                />
                <Flex direction="column" gap="1">
                  <Text size="5" weight="bold">
                    {display.firstName} {display.lastName}
                  </Text>
                  <Text size="2" color="gray">
                    {display.email}
                  </Text>
                  <Badge variant="soft" color="indigo" style={{ width: "fit-content" }}>
                    {display.role.replace(/_/g, " ")}
                  </Badge>
                </Flex>
              </Flex>

              <Table.Root variant="surface">
                <Table.Body>
                  <DetailRow label={t("profile.lastName")} value={display.lastName} />
                  <DetailRow label={t("profile.firstName")} value={display.firstName} />
                  <DetailRow label={t("profile.email")} value={display.email} />
                  <DetailRow
                    label={t("profile.role")}
                    value={display.role.replace(/_/g, " ")}
                  />
                  <DetailRow label={t("profile.organisation")} value={display.organization.name} />
                  <DetailRow label={t("profile.orgCode")} value={display.organization.code} />
                  <DetailRow
                    label={t("profile.passwordStatus")}
                    value={
                      display.mustChangePassword
                        ? t("common.passwordChangeRequired")
                        : t("common.passwordUpToDate")
                    }
                  />
                </Table.Body>
              </Table.Root>
            </Card>

            <Card size="2">
              <Flex direction="column" gap="3" p="4">
                <Text weight="bold">{t("profile.rbacRoles")}</Text>
                {display.roles?.length ? (
                  <Flex gap="2" wrap="wrap">
                    {display.roles.map((role) => (
                      <Badge key={role} variant="soft" size="2">
                        {role}
                      </Badge>
                    ))}
                  </Flex>
                ) : (
                  <Text size="2" color="gray">
                    {t("profile.noRbacRoles")}
                  </Text>
                )}
              </Flex>
            </Card>
          </Flex>
        ) : null}
      </AppShell>
    </RequireAuth>
  );
}
