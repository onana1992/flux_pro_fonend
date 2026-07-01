"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Checkbox, Flex, Text, TextArea, TextField } from "@radix-ui/themes";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { ApiError, createRole, searchPermissions } from "@/lib/api";
import type { Permission } from "@/lib/types";
import { LoadingBlock, PageHeader, StatusAlert } from "@/components/ui/shared";

export default function NewRolePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissionIds, setPermissionIds] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadPermissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await searchPermissions({ page: 0, size: 500 });
      setPermissions(res.content);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const role = await createRole({
        name: name.trim(),
        description: description.trim() || undefined,
        permissionIds,
      });
      router.push(`/admin/roles/${role.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
      setSubmitting(false);
    }
  }

  const filtered = permissions.filter(
    (p) => !search.trim() || p.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <RequireAuth permission="ROLES:CREATE">
      <AppShell>
        <Button variant="ghost" mb="3" asChild>
          <Link href="/admin/roles">
            <ArrowLeftIcon /> {t("rbac.backToRoles", { defaultValue: "Retour aux rôles" })}
          </Link>
        </Button>
        <PageHeader title={t("rbac.newRole", { defaultValue: "Nouveau rôle" })} />
        {error && <StatusAlert message={error} />}
        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="4">
            <Card>
              <Flex direction="column" gap="3" p="4">
                <TextField.Root
                  placeholder={t("rbac.roleName", { defaultValue: "Nom du rôle" })}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <TextArea
                  placeholder={t("rbac.roleDescription", { defaultValue: "Description" })}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Flex>
            </Card>
            <Card>
              <Flex direction="column" gap="3" p="4">
                <Text weight="bold">{t("rbac.selectPermissions", { defaultValue: "Permissions" })}</Text>
                <TextField.Root
                  placeholder={t("rbac.searchPermissions", { defaultValue: "Rechercher…" })}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {loading ? (
                  <LoadingBlock />
                ) : (
                  <Flex direction="column" gap="1" style={{ maxHeight: 320, overflowY: "auto" }}>
                    {filtered.map((p) => {
                      const checked = permissionIds.includes(p.id);
                      return (
                        <label key={p.id}>
                          <Flex align="center" gap="2" py="1">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) => {
                                setPermissionIds((ids) =>
                                  v ? [...ids, p.id] : ids.filter((id) => id !== p.id),
                                );
                              }}
                            />
                            <Text size="2">{p.name}</Text>
                          </Flex>
                        </label>
                      );
                    })}
                  </Flex>
                )}
              </Flex>
            </Card>
            <Flex justify="end" gap="2">
              <Button type="button" variant="soft" asChild>
                <Link href="/admin/roles">{t("common.cancel", { defaultValue: "Annuler" })}</Link>
              </Button>
              <Button type="submit" disabled={submitting || !name.trim()}>
                {t("common.create", { defaultValue: "Créer" })}
              </Button>
            </Flex>
          </Flex>
        </form>
      </AppShell>
    </RequireAuth>
  );
}
