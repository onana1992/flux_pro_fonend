"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, Flex, Text } from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { ApiError, listRoles } from "@/lib/api";
import type { Role } from "@/lib/types";
import { EmptyBlock, LoadingBlock, PageHeader, StatusAlert } from "@/components/ui/shared";

export default function AdminRolesPage() {
  const { t } = useTranslation();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRoles(await listRoles());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <RequireAuth permission="ROLES:READ">
      <AppShell>
        <PageHeader
          title={t("nav.roles")}
          description={t("rbac.rolesDescription", { defaultValue: "Gestion des rôles et de leurs permissions." })}
          actions={
            <Button asChild>
              <Link href="/admin/roles/new">
                <PlusIcon /> {t("rbac.newRole", { defaultValue: "Nouveau rôle" })}
              </Link>
            </Button>
          }
        />
        {error && <StatusAlert message={error} />}
        {loading ? (
          <LoadingBlock />
        ) : roles.length === 0 ? (
          <EmptyBlock title={t("rbac.noRoles", { defaultValue: "Aucun rôle" })} />
        ) : (
          <Flex direction="column" gap="3">
            {roles.map((role) => (
              <Card key={role.id} asChild>
                <Link href={`/admin/roles/${role.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <Flex justify="between" align="center" p="4">
                    <Flex direction="column" gap="1">
                      <Text weight="bold">{role.name}</Text>
                      {role.description && (
                        <Text size="2" color="gray">
                          {role.description}
                        </Text>
                      )}
                    </Flex>
                    <Flex gap="2" align="center">
                      {role.systemRole && (
                        <Badge color="blue">{t("rbac.systemRole", { defaultValue: "Système" })}</Badge>
                      )}
                      <Badge variant="soft">{role.permissions?.length ?? 0} permissions</Badge>
                    </Flex>
                  </Flex>
                </Link>
              </Card>
            ))}
          </Flex>
        )}
      </AppShell>
    </RequireAuth>
  );
}
