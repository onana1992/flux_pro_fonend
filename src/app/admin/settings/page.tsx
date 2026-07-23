"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Dialog,
  Flex,
  Select,
  Table,
  Tabs,
  Text,
  TextField,
} from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import {
  ApiError,
  addDigestRecipientRole,
  createBusinessCalendarDay,
  deleteBusinessCalendarDay,
  getDigestRecipientRoles,
  getTenantSettings,
  listBusinessCalendarDays,
  removeDigestRecipientRole,
  updateBusinessCalendarDay,
  updateTenantSettings,
} from "@/lib/api";
import { hasPermission } from "@/lib/auth-storage";
import { preventDialogDismissFromPortals } from "@/lib/dialog-portals";
import type {
  BusinessCalendarDay,
  BusinessCalendarDayRequest,
  TenantConfig,
  TenantSettingsRequest,
  UserRole,
} from "@/lib/types";
import { LoadingBlock, PageHeader, StatusAlert } from "@/components/ui/shared";
import { useTenant } from "@/components/TenantProvider";

const EMPTY_FORM: BusinessCalendarDayRequest = {
  calendarDate: "",
  label: "",
  countryCode: "CM",
};

const DIGEST_ROLE_OPTIONS: UserRole[] = [
  "EXECUTIVE_OFFICE",
  "SECRETARY_GENERAL",
  "DIRECTOR",
  "REGIONAL_DIRECTOR",
  "SERVICE_HEAD",
  "BUSINESS_ADMIN",
  "AGENT",
  "SUPPORT",
  "READER",
  "SUPER_ADMIN",
];

/** Fuseaux IANA courants pour l'Afrique + UTC (liste fermée pour le select). */
const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: "Africa/Abidjan", label: "Africa/Abidjan (UTC)" },
  { value: "Africa/Accra", label: "Africa/Accra (UTC)" },
  { value: "Africa/Addis_Ababa", label: "Africa/Addis_Ababa (UTC+3)" },
  { value: "Africa/Algiers", label: "Africa/Algiers (UTC+1)" },
  { value: "Africa/Bamako", label: "Africa/Bamako (UTC)" },
  { value: "Africa/Bangui", label: "Africa/Bangui (UTC+1)" },
  { value: "Africa/Brazzaville", label: "Africa/Brazzaville (UTC+1)" },
  { value: "Africa/Cairo", label: "Africa/Cairo (UTC+2)" },
  { value: "Africa/Casablanca", label: "Africa/Casablanca" },
  { value: "Africa/Conakry", label: "Africa/Conakry (UTC)" },
  { value: "Africa/Dakar", label: "Africa/Dakar (UTC)" },
  { value: "Africa/Dar_es_Salaam", label: "Africa/Dar_es_Salaam (UTC+3)" },
  { value: "Africa/Douala", label: "Africa/Douala (UTC+1)" },
  { value: "Africa/Johannesburg", label: "Africa/Johannesburg (UTC+2)" },
  { value: "Africa/Kampala", label: "Africa/Kampala (UTC+3)" },
  { value: "Africa/Khartoum", label: "Africa/Khartoum (UTC+2)" },
  { value: "Africa/Kinshasa", label: "Africa/Kinshasa (UTC+1)" },
  { value: "Africa/Lagos", label: "Africa/Lagos (UTC+1)" },
  { value: "Africa/Libreville", label: "Africa/Libreville (UTC+1)" },
  { value: "Africa/Lome", label: "Africa/Lome (UTC)" },
  { value: "Africa/Luanda", label: "Africa/Luanda (UTC+1)" },
  { value: "Africa/Lusaka", label: "Africa/Lusaka (UTC+2)" },
  { value: "Africa/Maputo", label: "Africa/Maputo (UTC+2)" },
  { value: "Africa/Nairobi", label: "Africa/Nairobi (UTC+3)" },
  { value: "Africa/Ndjamena", label: "Africa/Ndjamena (UTC+1)" },
  { value: "Africa/Niamey", label: "Africa/Niamey (UTC+1)" },
  { value: "Africa/Nouakchott", label: "Africa/Nouakchott (UTC)" },
  { value: "Africa/Ouagadougou", label: "Africa/Ouagadougou (UTC)" },
  { value: "Africa/Porto-Novo", label: "Africa/Porto-Novo (UTC+1)" },
  { value: "Africa/Tunis", label: "Africa/Tunis (UTC+1)" },
  { value: "Africa/Windhoek", label: "Africa/Windhoek (UTC+2)" },
  { value: "UTC", label: "UTC" },
  { value: "Europe/Paris", label: "Europe/Paris" },
];

function HolidaysTab() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { config: tenant } = useTenant();
  const locale = i18n.language?.startsWith("en") ? "en-GB" : "fr-FR";
  const currentYear = new Date().getFullYear();
  const countryCode = tenant.countryCode || "CM";
  const timeZone = tenant.timezone || "Africa/Douala";

  const yearOptions = useMemo(
    () => [currentYear - 1, currentYear, currentYear + 1, currentYear + 2],
    [currentYear],
  );

  const [year, setYear] = useState(currentYear);
  const [days, setDays] = useState<BusinessCalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<BusinessCalendarDayRequest>(EMPTY_FORM);

  const canWrite = hasPermission(user, "BUSINESS_CALENDAR:CREATE");
  const canUpdate = hasPermission(user, "BUSINESS_CALENDAR:UPDATE");
  const canDelete = hasPermission(user, "BUSINESS_CALENDAR:DELETE");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDays(await listBusinessCalendarDays({ year, countryCode }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [t, year, countryCode]);

  useEffect(() => {
    load();
  }, [load]);

  function formatDate(isoDate: string) {
    return new Date(`${isoDate}T12:00:00`).toLocaleDateString(locale, {
      weekday: "short",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone,
    });
  }

  function openCreateDialog() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, calendarDate: `${year}-01-01`, countryCode });
    setDialogOpen(true);
  }

  function openEditDialog(day: BusinessCalendarDay) {
    setEditingId(day.id);
    setForm({
      calendarDate: day.calendarDate,
      label: day.label,
      countryCode: day.countryCode,
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    const payload: BusinessCalendarDayRequest = {
      calendarDate: form.calendarDate,
      label: form.label.trim(),
      countryCode: (form.countryCode || countryCode).trim().toUpperCase(),
    };
    try {
      if (editingId) {
        await updateBusinessCalendarDay(editingId, payload);
        setSuccess(t("admin.settings.holidays.updateSuccess"));
      } else {
        await createBusinessCalendarDay(payload);
        setSuccess(t("admin.settings.holidays.createSuccess"));
      }
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("admin.settings.holidays.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(day: BusinessCalendarDay) {
    if (!confirm(t("admin.settings.holidays.deleteConfirm", { label: day.label, date: day.calendarDate }))) {
      return;
    }
    setDeletingId(day.id);
    setError(null);
    setSuccess(null);
    try {
      await deleteBusinessCalendarDay(day.id);
      setSuccess(t("admin.settings.holidays.deleteSuccess"));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("admin.settings.holidays.deleteFailed"));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <Flex justify="between" align="center" gap="3" mb="3" wrap="wrap">
        <Flex align="center" gap="2">
          <Text size="2" color="gray">
            {t("admin.settings.holidays.year")}
          </Text>
          <Select.Root value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <Select.Trigger />
            <Select.Content>
              {yearOptions.map((y) => (
                <Select.Item key={y} value={String(y)}>
                  {y}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Flex>
        {canWrite && (
          <Button onClick={openCreateDialog}>
            <PlusIcon /> {t("admin.settings.holidays.create")}
          </Button>
        )}
      </Flex>

      {error && <StatusAlert message={error} variant="error" />}
      {success && <StatusAlert message={success} variant="success" />}

      <Card size="3">
        {loading ? (
          <LoadingBlock message={t("admin.settings.holidays.loading")} />
        ) : days.length === 0 ? (
          <Flex p="4">
            <Text color="gray">{t("admin.settings.holidays.empty")}</Text>
          </Flex>
        ) : (
          <Table.Root variant="surface">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>{t("admin.settings.holidays.date")}</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>{t("admin.settings.holidays.label")}</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>{t("admin.settings.holidays.country")}</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>{t("admin.settings.holidays.actions")}</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {days.map((day) => (
                <Table.Row key={day.id}>
                  <Table.Cell>
                    <Text size="2">{formatDate(day.calendarDate)}</Text>
                  </Table.Cell>
                  <Table.Cell>{day.label}</Table.Cell>
                  <Table.Cell>
                    <Text size="2" style={{ fontFamily: "var(--font-geist-mono)" }}>
                      {day.countryCode}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Flex gap="2" wrap="wrap">
                      {canUpdate && (
                        <Button size="1" variant="soft" onClick={() => openEditDialog(day)}>
                          {t("admin.settings.holidays.edit")}
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          size="1"
                          variant="soft"
                          color="red"
                          disabled={deletingId === day.id}
                          onClick={() => handleDelete(day)}
                        >
                          {t("admin.settings.holidays.delete")}
                        </Button>
                      )}
                    </Flex>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        )}
      </Card>

      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Content
          maxWidth="480px"
          onPointerDownOutside={preventDialogDismissFromPortals}
          onInteractOutside={preventDialogDismissFromPortals}
          onFocusOutside={preventDialogDismissFromPortals}
        >
          <Dialog.Title>
            {editingId
              ? t("admin.settings.holidays.editTitle")
              : t("admin.settings.holidays.createTitle")}
          </Dialog.Title>
          <Dialog.Description size="2" color="gray" mb="4">
            {editingId
              ? t("admin.settings.holidays.editDescription")
              : t("admin.settings.holidays.createDescription")}
          </Dialog.Description>

          <form onSubmit={handleSubmit}>
            <Flex direction="column" gap="3">
              <label>
                <Text as="div" size="2" weight="medium" mb="1">
                  {t("admin.settings.holidays.date")}
                </Text>
                <TextField.Root
                  type="date"
                  required
                  value={form.calendarDate}
                  onChange={(e) => setForm((f) => ({ ...f, calendarDate: e.target.value }))}
                />
              </label>

              <label>
                <Text as="div" size="2" weight="medium" mb="1">
                  {t("admin.settings.holidays.label")}
                </Text>
                <TextField.Root
                  required
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder={t("admin.settings.holidays.labelPlaceholder")}
                />
              </label>

              <label>
                <Text as="div" size="2" weight="medium" mb="1">
                  {t("admin.settings.holidays.country")}
                </Text>
                <TextField.Root
                  required
                  maxLength={2}
                  value={form.countryCode ?? "CM"}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, countryCode: e.target.value.toUpperCase() }))
                  }
                  style={{ fontFamily: "var(--font-geist-mono)" }}
                />
              </label>

              <Flex gap="2" justify="end" mt="2">
                <Dialog.Close>
                  <Button type="button" variant="soft" color="gray">
                    {t("common.cancel")}
                  </Button>
                </Dialog.Close>
                <Button type="submit" disabled={submitting}>
                  {submitting
                    ? t("admin.settings.holidays.saving")
                    : t("admin.settings.holidays.save")}
                </Button>
              </Flex>
            </Flex>
          </form>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
}

function TenantOrgTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { refresh } = useTenant();
  const [form, setForm] = useState<TenantSettingsRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canWrite = hasPermission(user, "BUSINESS_CALENDAR:UPDATE");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cfg: TenantConfig = await getTenantSettings();
      setForm({
        tenantName: cfg.tenantName,
        productName: cfg.productName,
        timezone: cfg.timezone,
        countryCode: cfg.countryCode,
        referencePrefix: cfg.referencePrefix,
        badge: cfg.badge,
        fromAddress: cfg.fromAddress,
        emailRedirectTo: cfg.emailRedirectTo ?? "",
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const saved = await updateTenantSettings({
        ...form,
        countryCode: form.countryCode.trim().toUpperCase(),
        referencePrefix: form.referencePrefix.trim().toUpperCase(),
        emailRedirectTo: form.emailRedirectTo?.trim() || undefined,
      });
      setForm({
        ...saved,
        emailRedirectTo: saved.emailRedirectTo ?? "",
      });
      await refresh();
      setSuccess(t("admin.settings.tenant.saveSuccess"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("admin.settings.tenant.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !form) {
    return <LoadingBlock message={t("admin.settings.tenant.loading")} />;
  }

  return (
    <>
      <Text size="2" color="gray" mb="3" as="p">
        {t("admin.settings.tenant.hint")}
      </Text>
      {error && <StatusAlert message={error} variant="error" />}
      {success && <StatusAlert message={success} variant="success" />}

      <Card size="3">
        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="3" p="4">
            {(
              [
                ["tenantName", t("admin.settings.tenant.tenantName")],
                ["productName", t("admin.settings.tenant.productName")],
                ["badge", t("admin.settings.tenant.badge")],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                <Text as="div" size="2" weight="medium" mb="1">
                  {label}
                </Text>
                <TextField.Root
                  required
                  disabled={!canWrite}
                  value={form[key] ?? ""}
                  onChange={(e) =>
                    setForm((f) => (f ? { ...f, [key]: e.target.value } : f))
                  }
                />
              </label>
            ))}

            <label>
              <Text as="div" size="2" weight="medium" mb="1">
                {t("admin.settings.tenant.timezone")}
              </Text>
              <Select.Root
                value={form.timezone}
                disabled={!canWrite}
                onValueChange={(v) => setForm((f) => (f ? { ...f, timezone: v } : f))}
              >
                <Select.Trigger style={{ width: "100%" }} />
                <Select.Content position="popper" style={{ maxHeight: 320 }}>
                  {(TIMEZONE_OPTIONS.some((z) => z.value === form.timezone)
                    ? TIMEZONE_OPTIONS
                    : [{ value: form.timezone, label: form.timezone }, ...TIMEZONE_OPTIONS]
                  ).map((z) => (
                    <Select.Item key={z.value} value={z.value}>
                      {z.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </label>

            {(
              [
                ["countryCode", t("admin.settings.tenant.countryCode")],
                ["referencePrefix", t("admin.settings.tenant.referencePrefix")],
                ["fromAddress", t("admin.settings.tenant.fromAddress")],
                ["emailRedirectTo", t("admin.settings.tenant.emailRedirectTo")],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                <Text as="div" size="2" weight="medium" mb="1">
                  {label}
                </Text>
                <TextField.Root
                  required={key !== "emailRedirectTo"}
                  disabled={!canWrite}
                  type={key === "fromAddress" || key === "emailRedirectTo" ? "email" : "text"}
                  maxLength={key === "countryCode" ? 2 : undefined}
                  value={form[key] ?? ""}
                  onChange={(e) =>
                    setForm((f) =>
                      f
                        ? {
                            ...f,
                            [key]:
                              key === "countryCode" || key === "referencePrefix"
                                ? e.target.value.toUpperCase()
                                : e.target.value,
                          }
                        : f,
                    )
                  }
                  style={
                    key === "countryCode" || key === "referencePrefix"
                      ? { fontFamily: "var(--font-geist-mono)" }
                      : undefined
                  }
                />
              </label>
            ))}

            {canWrite && (
              <Flex justify="end" mt="2">
                <Button type="submit" disabled={submitting}>
                  {submitting
                    ? t("admin.settings.tenant.saving")
                    : t("admin.settings.tenant.save")}
                </Button>
              </Flex>
            )}
          </Flex>
        </form>
      </Card>
    </>
  );
}

function DigestRolesTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [roleToAdd, setRoleToAdd] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canWrite = hasPermission(user, "ALERT_RULES:UPDATE");
  const availableToAdd = DIGEST_ROLE_OPTIONS.filter((r) => !roles.includes(r));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDigestRecipientRoles();
      setRoles(res.roles);
      setRoleToAdd("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd() {
    if (!roleToAdd) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await addDigestRecipientRole(roleToAdd as UserRole);
      setRoles(res.roles);
      setRoleToAdd("");
      setSuccess(t("admin.settings.digest.addSuccess"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("admin.settings.digest.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(role: UserRole) {
    if (!confirm(t("admin.settings.digest.removeConfirm", { role }))) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await removeDigestRecipientRole(role);
      setRoles(res.roles);
      setSuccess(t("admin.settings.digest.removeSuccess"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("admin.settings.digest.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Text size="2" color="gray" mb="3" as="p">
        {t("admin.settings.digest.hint")}
      </Text>

      {error && <StatusAlert message={error} variant="error" />}
      {success && <StatusAlert message={success} variant="success" />}

      {canWrite && (
        <Flex gap="2" align="end" mb="3" wrap="wrap">
          <Flex direction="column" gap="1" style={{ minWidth: 220 }}>
            <Text size="2" weight="medium">
              {t("admin.settings.digest.addRole")}
            </Text>
            <Select.Root
              value={roleToAdd || undefined}
              onValueChange={setRoleToAdd}
              disabled={availableToAdd.length === 0 || busy}
            >
              <Select.Trigger placeholder={t("admin.settings.digest.selectRole")} />
              <Select.Content>
                {availableToAdd.map((role) => (
                  <Select.Item key={role} value={role}>
                    {role}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Flex>
          <Button onClick={handleAdd} disabled={!roleToAdd || busy}>
            <PlusIcon /> {t("admin.settings.digest.add")}
          </Button>
        </Flex>
      )}

      <Card size="3">
        {loading ? (
          <LoadingBlock message={t("admin.settings.digest.loading")} />
        ) : roles.length === 0 ? (
          <Flex p="4">
            <Text color="gray">{t("admin.settings.digest.empty")}</Text>
          </Flex>
        ) : (
          <Table.Root variant="surface">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>{t("admin.settings.digest.role")}</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>{t("admin.settings.digest.actions")}</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {roles.map((role) => (
                <Table.Row key={role}>
                  <Table.Cell>
                    <Text size="2" style={{ fontFamily: "var(--font-geist-mono)" }}>
                      {role}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    {canWrite && (
                      <Button
                        size="1"
                        variant="soft"
                        color="red"
                        disabled={busy}
                        onClick={() => handleRemove(role)}
                      >
                        {t("admin.settings.digest.remove")}
                      </Button>
                    )}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        )}
      </Card>
    </>
  );
}

export default function AdminSettingsPage() {
  const { t } = useTranslation();

  return (
    <RequireAuth permission="BUSINESS_CALENDAR:READ">
      <AppShell>
        <PageHeader
          title={t("admin.settings.title")}
          description={t("admin.settings.description")}
        />

        <Tabs.Root defaultValue="tenant">
          <Tabs.List mb="4">
            <Tabs.Trigger value="tenant">{t("admin.settings.tabTenant")}</Tabs.Trigger>
            <Tabs.Trigger value="holidays">{t("admin.settings.tabHolidays")}</Tabs.Trigger>
            <Tabs.Trigger value="digest">{t("admin.settings.tabDigest")}</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="tenant">
            <TenantOrgTab />
          </Tabs.Content>

          <Tabs.Content value="holidays">
            <HolidaysTab />
          </Tabs.Content>

          <Tabs.Content value="digest">
            <DigestRolesTab />
          </Tabs.Content>
        </Tabs.Root>
      </AppShell>
    </RequireAuth>
  );
}
