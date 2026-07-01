"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Flex, Select, Table, Text } from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import {
  ApiError,
  activateUser,
  assignUserRole,
  deactivateUser,
  getUser,
  listRoles,
  resetUserPassword,
  revokeUserRole,
  unlockUser,
} from "@/lib/api";
import { hasPermission, isSuperAdmin } from "@/lib/auth-storage";
import type { Role, User } from "@/lib/types";
import { LoadingBlock, PageHeader, StatusAlert } from "@/components/ui/shared";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Table.Row>
      <Table.RowHeaderCell style={{ width: "12rem" }}>{label}</Table.RowHeaderCell>
      <Table.Cell>
        <Text size="2">{value}</Text>
      </Table.Cell>
    </Table.Row>
  );
}

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useTranslation();
  const router = useRouter();
  const { user: currentUser, isAdmin } = useAuth();
  const superAdmin = isSuperAdmin(currentUser);

  const [user, setUser] = useState<User | null>(null);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const canUpdateUser = currentUser ? hasPermission(currentUser, "USERS:UPDATE") : false;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [userData, roles] = await Promise.all([
        getUser(id),
        canUpdateUser ? listRoles().catch(() => []) : Promise.resolve([]),
      ]);
      setUser(userData);
      setAllRoles(roles);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [id, t, canUpdateUser]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDeactivate() {
    if (!user || !confirm(t("admin.users.deactivateConfirm"))) return;
    await deactivateUser(user.id);
    await load();
  }

  async function handleActivate() {
    if (!user) return;
    await activateUser(user.id);
    await load();
  }

  async function handleResetPassword() {
    if (!user || !confirm(t("admin.users.resetConfirm"))) return;
    const result = await resetUserPassword(user.id);
    setInfo(t("admin.users.tempPassword", { password: result.temporaryPassword }));
  }

  async function handleUnlock() {
    if (!user) return;
    await unlockUser(user.id);
    await load();
  }

  async function handleAssignRole() {
    if (!user || !selectedRoleId) return;
    setError(null);
    try {
      await assignUserRole(user.id, selectedRoleId);
      setSelectedRoleId("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    }
  }

  async function handleRevokeRole(roleId: string) {
    if (!user) return;
    setError(null);
    try {
      await revokeUserRole(user.id, roleId);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    }
  }

  const assignedRoleIds = new Set(user?.roles?.map((r) => r.id) ?? []);
  const assignableRoles = allRoles.filter((r) => !assignedRoleIds.has(r.id));

  return (
    <RequireAuth userRead>
      <AppShell>
        <PageHeader
          title={t("admin.users.detailTitle")}
          description={user ? `${user.firstName} ${user.lastName}` : undefined}
          actions={
            <Button variant="soft" onClick={() => router.push("/admin/users")}>
              {t("admin.users.backToList")}
            </Button>
          }
        />

        {error && <StatusAlert message={error} variant="error" />}
        {info && <StatusAlert message={info} variant="success" />}

        {loading ? (
          <LoadingBlock message={t("common.loading")} />
        ) : user ? (
          <Flex direction="column" gap="4">
            <Card size="2">
              <Table.Root variant="surface">
                <Table.Body>
                  <DetailRow label={t("admin.users.matricule")} value={user.staffNumber} />
                  <DetailRow label={t("admin.users.lastName")} value={user.lastName} />
                  <DetailRow label={t("admin.users.firstName")} value={user.firstName} />
                  <DetailRow label={t("admin.users.email")} value={user.email} />
                  <DetailRow label={t("admin.users.phone")} value={user.phone ?? "—"} />
                  <DetailRow label={t("admin.users.role")} value={user.role.replace(/_/g, " ")} />
                  <DetailRow label={t("admin.users.organisation")} value={user.organization.code} />
                  <DetailRow label={t("admin.users.orgName")} value={user.organization.name} />
                  <DetailRow label={t("admin.users.jobTitle")} value={user.jobTitle ?? "—"} />
                  <DetailRow
                    label={t("admin.users.status")}
                    value={user.active ? t("common.active") : t("common.inactive")}
                  />
                  <DetailRow
                    label={t("admin.users.passwordStatus")}
                    value={
                      user.mustChangePassword
                        ? t("common.passwordChangeRequired")
                        : t("common.passwordUpToDate")
                    }
                  />
                </Table.Body>
              </Table.Root>
            </Card>

            {canUpdateUser && (
              <Card size="2">
                <Flex direction="column" gap="3" p="4">
                  <Text weight="bold">{t("rbac.userRoles", { defaultValue: "Rôles RBAC" })}</Text>
                  {user.roles?.length ? (
                    <Flex gap="2" wrap="wrap">
                      {user.roles.map((r) => (
                        <Badge key={r.id} variant="soft" size="2">
                          {r.name}
                          <Button
                            size="1"
                            variant="ghost"
                            color="red"
                            onClick={() => handleRevokeRole(r.id)}
                            style={{ marginLeft: 4 }}
                          >
                            ×
                          </Button>
                        </Badge>
                      ))}
                    </Flex>
                  ) : (
                    <Text size="2" color="gray">
                      {t("rbac.noRolesAssigned", { defaultValue: "Aucun rôle assigné" })}
                    </Text>
                  )}
                  {assignableRoles.length > 0 && (
                    <Flex gap="2" align="end" wrap="wrap">
                      <Select.Root value={selectedRoleId} onValueChange={setSelectedRoleId}>
                        <Select.Trigger placeholder={t("rbac.selectRole", { defaultValue: "Choisir un rôle" })} />
                        <Select.Content>
                          {assignableRoles.map((r) => (
                            <Select.Item key={r.id} value={r.id}>
                              {r.name}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Root>
                      <Button onClick={handleAssignRole} disabled={!selectedRoleId}>
                        {t("rbac.assignRole", { defaultValue: "Assigner" })}
                      </Button>
                    </Flex>
                  )}
                </Flex>
              </Card>
            )}

            {(isAdmin || superAdmin) && (
              <Flex gap="2" wrap="wrap">
                {isAdmin && (
                  <Button asChild>
                    <Link href={`/admin/users/${user.id}/edit`}>{t("admin.users.edit")}</Link>
                  </Button>
                )}
                {isAdmin && user.active && (
                  <Button color="red" variant="soft" onClick={handleDeactivate}>
                    {t("admin.users.deactivate")}
                  </Button>
                )}
                {isAdmin && !user.active && (
                  <Button color="green" variant="soft" onClick={handleActivate}>
                    {t("admin.users.activate")}
                  </Button>
                )}
                {superAdmin && (
                  <>
                    <Button variant="soft" onClick={handleResetPassword}>
                      {t("admin.users.resetPassword")}
                    </Button>
                    <Button variant="soft" onClick={handleUnlock}>
                      {t("admin.users.unlock")}
                    </Button>
                  </>
                )}
              </Flex>
            )}
          </Flex>
        ) : null}
      </AppShell>
    </RequireAuth>
  );
}
