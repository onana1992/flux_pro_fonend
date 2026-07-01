"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Flex, Table, Text } from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import {
  ApiError,
  activateUser,
  deactivateUser,
  getUser,
  resetUserPassword,
  unlockUser,
} from "@/lib/api";
import { isSuperAdmin } from "@/lib/auth-storage";
import type { User } from "@/lib/types";
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
  const superAdmin = isSuperAdmin(currentUser?.role);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUser(await getUser(id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

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
