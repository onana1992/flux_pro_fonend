"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Callout,
  Card,
  Flex,
  Select,
  Switch,
  Text,
  TextField,
} from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import {
  ApiError,
  createUser,
  getOrganizationTree,
  getUser,
  updateUser,
} from "@/lib/api";
import type { OrganizationTreeNode, UserRole } from "@/lib/types";
import { LoadingBlock, PageHeader, StatusAlert } from "@/components/ui/shared";

const ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "BUSINESS_ADMIN",
  "EXECUTIVE_OFFICE",
  "SECRETARY_GENERAL",
  "DIRECTOR",
  "SERVICE_HEAD",
  "AGENT",
  "SUPPORT",
  "READER",
  "REGIONAL_DIRECTOR",
];

function flattenOrgs(nodes: OrganizationTreeNode[]): OrganizationTreeNode[] {
  const result: OrganizationTreeNode[] = [];
  function walk(list: OrganizationTreeNode[]) {
    for (const node of list) {
      result.push(node);
      if (node.children.length > 0) walk(node.children);
    }
  }
  walk(nodes);
  return result.sort((a, b) => a.code.localeCompare(b.code));
}

export function UserFormPage({ userId }: { userId?: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const isEdit = Boolean(userId);

  const [orgs, setOrgs] = useState<OrganizationTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const [staffNumber, setStaffNumber] = useState("");
  const [email, setEmail] = useState("");
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("AGENT");
  const [organizationId, setOrganizationId] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [active, setActive] = useState(true);
  const [organizationHead, setOrganizationHead] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState("");

  const flatOrgs = useMemo(() => flattenOrgs(orgs), [orgs]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const tree = await getOrganizationTree();
        setOrgs(tree);
        if (userId) {
          const user = await getUser(userId);
          setStaffNumber(user.staffNumber);
          setEmail(user.email);
          setLastName(user.lastName);
          setFirstName(user.firstName);
          setPhone(user.phone ?? "");
          setRole(user.role);
          setOrganizationId(user.organization.id);
          setJobTitle(user.jobTitle ?? "");
          setActive(user.active);
          setOrganizationHead(user.organizationHead);
        } else if (tree.length > 0) {
          const first = flattenOrgs(tree)[0];
          if (first) setOrganizationId(first.id);
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [userId, t]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const body = {
      staffNumber,
      email,
      lastName,
      firstName,
      phone: phone || undefined,
      role,
      organizationId,
      jobTitle: jobTitle || undefined,
      active,
      organizationHead,
      ...(temporaryPassword.trim() ? { temporaryPassword: temporaryPassword.trim() } : {}),
    };
    try {
      if (isEdit && userId) {
        await updateUser(userId, body);
        router.push("/admin/users");
      } else {
        const result = await createUser(body);
        setTempPassword(result.temporaryPassword);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RequireAuth admin>
      <AppShell>
        <PageHeader
          title={isEdit ? t("admin.users.editTitle") : t("admin.users.createTitle")}
          description={isEdit ? t("admin.users.editDescription") : t("admin.users.createDescription")}
        />

        {error && <StatusAlert message={error} variant="error" />}
        {tempPassword && (
          <Callout.Root color="green" mb="4">
            <Callout.Text>
              {t("admin.users.tempPassword", { password: tempPassword })}
            </Callout.Text>
          </Callout.Root>
        )}

        <Card size="3">
          {loading ? (
            <LoadingBlock message={t("common.loading")} />
          ) : (
            <form onSubmit={handleSubmit}>
              <Flex direction="column" gap="4">
                <Flex gap="3" wrap="wrap">
                  <Box style={{ flex: 1, minWidth: 200 }}>
                    <Text size="2" weight="medium" mb="1">
                      {t("admin.users.matricule")}
                    </Text>
                    <TextField.Root required value={staffNumber} onChange={(e) => setStaffNumber(e.target.value)} />
                  </Box>
                  <Box style={{ flex: 1, minWidth: 200 }}>
                    <Text size="2" weight="medium" mb="1">
                      {t("admin.users.email")}
                    </Text>
                    <TextField.Root type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </Box>
                </Flex>
                <Flex gap="3" wrap="wrap">
                  <Box style={{ flex: 1, minWidth: 200 }}>
                    <Text size="2" weight="medium" mb="1">
                      {t("admin.users.firstName")}
                    </Text>
                    <TextField.Root required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </Box>
                  <Box style={{ flex: 1, minWidth: 200 }}>
                    <Text size="2" weight="medium" mb="1">
                      {t("admin.users.lastName")}
                    </Text>
                    <TextField.Root required value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </Box>
                </Flex>
                <Box>
                  <Text size="2" weight="medium" mb="1">
                    {t("admin.users.phone")}
                  </Text>
                  <TextField.Root value={phone} onChange={(e) => setPhone(e.target.value)} />
                </Box>
                <Flex gap="3" wrap="wrap">
                  <Box style={{ flex: 1, minWidth: 200 }}>
                    <Text size="2" weight="medium" mb="1">
                      {t("admin.users.role")}
                    </Text>
                    <Select.Root value={role} onValueChange={(v) => setRole(v as UserRole)}>
                      <Select.Trigger style={{ width: "100%" }} />
                      <Select.Content>
                        {ROLES.map((r) => (
                          <Select.Item key={r} value={r}>
                            {r.replace(/_/g, " ")}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </Box>
                  <Box style={{ flex: 1, minWidth: 200 }}>
                    <Text size="2" weight="medium" mb="1">
                      {t("admin.users.organisation")}
                    </Text>
                    <Select.Root value={organizationId} onValueChange={setOrganizationId}>
                      <Select.Trigger style={{ width: "100%" }} />
                      <Select.Content>
                        {flatOrgs.map((o) => (
                          <Select.Item key={o.id} value={o.id}>
                            {o.code} — {o.name}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </Box>
                </Flex>
                <Box>
                  <Text size="2" weight="medium" mb="1">
                    {t("admin.users.jobTitle")}
                  </Text>
                  <TextField.Root value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
                </Box>
                {!isEdit && (
                  <Box>
                    <Text size="2" weight="medium" mb="1">
                      {t("admin.users.provisionalPassword")}
                    </Text>
                    <TextField.Root
                      type="password"
                      autoComplete="new-password"
                      placeholder={t("admin.users.provisionalPasswordPlaceholder")}
                      value={temporaryPassword}
                      onChange={(e) => setTemporaryPassword(e.target.value)}
                    />
                    <Text size="1" color="gray" mt="1" as="p">
                      {t("admin.users.provisionalPasswordHint")}
                    </Text>
                  </Box>
                )}
                <Flex align="center" gap="2">
                  <Switch checked={active} onCheckedChange={setActive} />
                  <Text size="2">{t("common.active")}</Text>
                </Flex>
                <Flex align="center" gap="2">
                  <Switch checked={organizationHead} onCheckedChange={setOrganizationHead} />
                  <Text size="2">{t("admin.users.organizationHead")}</Text>
                </Flex>
                <Flex gap="3" justify="end">
                  <Button type="button" variant="soft" onClick={() => router.push("/admin/users")}>
                    {t("admin.users.cancel")}
                  </Button>
                  <Button type="submit" disabled={submitting || Boolean(tempPassword)}>
                    {submitting ? t("common.loading") : isEdit ? t("admin.users.save") : t("admin.users.create")}
                  </Button>
                </Flex>
              </Flex>
            </form>
          )}
        </Card>
      </AppShell>
    </RequireAuth>
  );
}
