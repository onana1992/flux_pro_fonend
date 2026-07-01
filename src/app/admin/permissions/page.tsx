"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, Flex, Table, Text, TextField } from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { ApiError, createPermission, deletePermission, searchPermissions } from "@/lib/api";
import type { Permission } from "@/lib/types";
import { LoadingBlock, PageHeader, StatusAlert } from "@/components/ui/shared";

export default function AdminPermissionsPage() {
  const { t } = useTranslation();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [resource, setResource] = useState("");
  const [action, setAction] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await searchPermissions({ page: 0, size: 200 });
      setPermissions(res.content);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate() {
    setError(null);
    try {
      await createPermission({
        name: name.trim(),
        resource: resource.trim().toUpperCase(),
        action: action.trim().toUpperCase(),
      });
      setName("");
      setResource("");
      setAction("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("rbac.confirmDeletePermission", { defaultValue: "Supprimer cette permission ?" }))) return;
    setError(null);
    try {
      await deletePermission(id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    }
  }

  return (
    <RequireAuth permission="PERMISSIONS:READ">
      <AppShell>
        <PageHeader
          title={t("nav.permissions")}
          description={t("rbac.permissionsDescription", {
            defaultValue: "Référentiel des permissions RESOURCE:ACTION.",
          })}
        />
        {error && <StatusAlert message={error} />}
        <Card mb="4">
          <Flex direction="column" gap="3" p="4">
            <Text weight="bold">{t("rbac.newPermission", { defaultValue: "Nouvelle permission" })}</Text>
            <Flex gap="2" wrap="wrap">
              <TextField.Root
                placeholder="USERS:READ"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ minWidth: 180 }}
              />
              <TextField.Root
                placeholder="USERS"
                value={resource}
                onChange={(e) => setResource(e.target.value)}
                style={{ minWidth: 120 }}
              />
              <TextField.Root
                placeholder="READ"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                style={{ minWidth: 120 }}
              />
              <Button onClick={handleCreate} disabled={!name.trim() || !resource.trim() || !action.trim()}>
                {t("common.add", { defaultValue: "Ajouter" })}
              </Button>
            </Flex>
          </Flex>
        </Card>
        {loading ? (
          <LoadingBlock />
        ) : (
          <Card>
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>{t("rbac.permissionName", { defaultValue: "Nom" })}</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>{t("rbac.resource", { defaultValue: "Ressource" })}</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>{t("rbac.action", { defaultValue: "Action" })}</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell />
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {permissions.map((p) => (
                  <Table.Row key={p.id}>
                    <Table.Cell>
                      <Badge variant="soft">{p.name}</Badge>
                    </Table.Cell>
                    <Table.Cell>{p.resource}</Table.Cell>
                    <Table.Cell>{p.action}</Table.Cell>
                    <Table.Cell>
                      <Button size="1" color="red" variant="soft" onClick={() => handleDelete(p.id)}>
                        {t("common.delete", { defaultValue: "Supprimer" })}
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Card>
        )}
      </AppShell>
    </RequireAuth>
  );
}
