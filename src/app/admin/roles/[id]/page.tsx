"use client";

import { FormEvent, use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Flex,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import { ArrowLeftIcon, Cross2Icon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import {
  ApiError,
  assignRolePermissions,
  deleteRole,
  getRole,
  revokeRolePermission,
  searchPermissions,
  updateRole,
} from "@/lib/api";
import type { Permission, Role } from "@/lib/types";
import { EmptyBlock, LoadingBlock, PageHeader, StatusAlert } from "@/components/ui/shared";

export default function RoleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useTranslation();
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissionSearch, setPermissionSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [roleData, permPage] = await Promise.all([
        getRole(id),
        searchPermissions({ page: 0, size: 500 }),
      ]);
      setRole(roleData);
      setName(roleData.name);
      setDescription(roleData.description ?? "");
      setAllPermissions(permPage.content);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!role) return;
    setSaving(true);
    setError(null);
    try {
      await updateRole(role.id, { name: name.trim(), description: description.trim() || undefined });
      setEditing(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!role || role.systemRole) return;
    if (!confirm(t("rbac.confirmDeleteRole", { defaultValue: "Supprimer ce rôle ?" }))) return;
    setSaving(true);
    try {
      await deleteRole(role.id);
      router.push("/admin/roles");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
      setSaving(false);
    }
  }

  async function handleAssign(permissionId: string) {
    if (!role) return;
    setSaving(true);
    setError(null);
    try {
      const currentIds = role.permissions?.map((p) => p.id) ?? [];
      if (currentIds.includes(permissionId)) return;
      await assignRolePermissions(role.id, [...currentIds, permissionId]);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    } finally {
      setSaving(false);
    }
  }

  async function handleRevoke(permissionId: string) {
    if (!role) return;
    setSaving(true);
    setError(null);
    try {
      await revokeRolePermission(role.id, permissionId);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    } finally {
      setSaving(false);
    }
  }

  const assignedIds = new Set(role?.permissions?.map((p) => p.id) ?? []);
  const available = allPermissions.filter(
    (p) =>
      !assignedIds.has(p.id) &&
      (!permissionSearch.trim() || p.name.toLowerCase().includes(permissionSearch.toLowerCase())),
  );

  return (
    <RequireAuth permission="ROLES:READ">
      <AppShell>
        <Button variant="ghost" mb="3" asChild>
          <Link href="/admin/roles">
            <ArrowLeftIcon /> {t("rbac.backToRoles", { defaultValue: "Retour aux rôles" })}
          </Link>
        </Button>
        {loading ? (
          <LoadingBlock />
        ) : !role ? (
          <EmptyBlock title={t("rbac.roleNotFound", { defaultValue: "Rôle introuvable" })} />
        ) : (
          <>
            <PageHeader
              title={role.name}
              description={role.systemRole ? t("rbac.systemRole", { defaultValue: "Rôle système" }) : undefined}
              actions={
                <Flex gap="2">
                  {!role.systemRole && (
                    <Button color="red" variant="soft" onClick={handleDelete} disabled={saving}>
                      {t("common.delete", { defaultValue: "Supprimer" })}
                    </Button>
                  )}
                  <Button variant="soft" onClick={() => setEditing((v) => !v)} disabled={role.systemRole}>
                    {editing ? t("common.cancel", { defaultValue: "Annuler" }) : t("common.edit", { defaultValue: "Modifier" })}
                  </Button>
                </Flex>
              }
            />
            {error && <StatusAlert message={error} />}
            <Flex direction="column" gap="4">
              <Card>
                {editing ? (
                  <form onSubmit={handleSave}>
                    <Flex direction="column" gap="3" p="4">
                      <TextField.Root value={name} onChange={(e) => setName(e.target.value)} required />
                      <TextArea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={t("rbac.roleDescription", { defaultValue: "Description" })}
                      />
                      <Button type="submit" disabled={saving}>
                        {t("common.save", { defaultValue: "Enregistrer" })}
                      </Button>
                    </Flex>
                  </form>
                ) : (
                  <Flex direction="column" gap="2" p="4">
                    <Text weight="bold">{role.name}</Text>
                    <Text size="2" color="gray">
                      {role.description || t("rbac.noDescription", { defaultValue: "Aucune description" })}
                    </Text>
                  </Flex>
                )}
              </Card>
              <Card>
                <Flex direction="column" gap="3" p="4">
                  <Text weight="bold">{t("rbac.assignedPermissions", { defaultValue: "Permissions assignées" })}</Text>
                  {role.permissions?.length ? (
                    <Flex gap="2" wrap="wrap">
                      {role.permissions.map((p) => (
                        <Badge key={p.id} variant="soft" size="2">
                          {p.name}
                          <Button
                            size="1"
                            variant="ghost"
                            onClick={() => handleRevoke(p.id)}
                            disabled={saving}
                            style={{ marginLeft: 4 }}
                          >
                            <Cross2Icon />
                          </Button>
                        </Badge>
                      ))}
                    </Flex>
                  ) : (
                    <Text size="2" color="gray">
                      {t("rbac.noPermissionsAssigned", { defaultValue: "Aucune permission assignée" })}
                    </Text>
                  )}
                  <TextField.Root
                    placeholder={t("rbac.searchPermissions", { defaultValue: "Rechercher une permission…" })}
                    value={permissionSearch}
                    onChange={(e) => setPermissionSearch(e.target.value)}
                  />
                  <Flex direction="column" gap="1" style={{ maxHeight: 280, overflowY: "auto" }}>
                    {available.map((p) => (
                      <label key={p.id}>
                        <Flex align="center" gap="2" py="1">
                          <Checkbox
                            checked={false}
                            onCheckedChange={(checked) => {
                              if (checked) void handleAssign(p.id);
                            }}
                            disabled={saving}
                          />
                          <Text size="2">{p.name}</Text>
                        </Flex>
                      </label>
                    ))}
                  </Flex>
                </Flex>
              </Card>
            </Flex>
          </>
        )}
      </AppShell>
    </RequireAuth>
  );
}
