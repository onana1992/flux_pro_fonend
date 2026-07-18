"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Avatar,
  Box,
  Flex,
  Grid,
  Text,
} from "@radix-ui/themes";
import {
  CalendarIcon,
  CheckCircledIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  FileTextIcon,
  HomeIcon,
  PersonIcon,
  Share1Icon,
  BarChartIcon,
  ReaderIcon,
} from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { RoleBadge } from "@/components/ui/shared";
import { hasPermission } from "@/lib/auth-storage";
import {
  ApiError,
  getDashboardComplianceRanking,
  getDashboardDelayByType,
  getDashboardMyActivity,
  getDashboardOverdueFiles,
  getDashboardSummary,
  getDashboardWorkload,
  getSystemClock,
} from "@/lib/api";
import type {
  DashboardDelayByType,
  DashboardMyActivity,
  DashboardOrganizationRanking,
  DashboardOverdueFile,
  DashboardSummary,
  DashboardWorkloadEntry,
  SystemClock,
} from "@/lib/types";
import { BUSINESS_ZONE } from "@/lib/datetime";
import {
  ComplianceRankingWidget,
  DelayByTypeWidget,
  MyActivityWidget,
  OverdueFilesWidget,
  WorkloadWidget,
} from "@/components/dashboard/DashboardWidgets";

function Gauge({ value, label }: { value: number; label: string }) {
  const r = 58;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = c - (clamped / 100) * c;
  const strokeColor = clamped >= 80 ? "#12b76a" : clamped >= 50 ? "#f97316" : "#ef4444";

  return (
    <div className="dash-gauge">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="var(--gray-a4)" strokeWidth="12" />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke={strokeColor}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="dash-gauge__center">
        <span className="dash-gauge__value">{clamped}%</span>
        <Text size="1" color="gray" mt="1">
          {label}
        </Text>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { user, isAdmin } = useAuth();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [myActivity, setMyActivity] = useState<DashboardMyActivity | null>(null);
  const [workload, setWorkload] = useState<DashboardWorkloadEntry[] | null>(null);
  const [overdueFiles, setOverdueFiles] = useState<DashboardOverdueFile[] | null>(null);
  const [delayByType, setDelayByType] = useState<DashboardDelayByType[] | null>(null);
  const [ranking, setRanking] = useState<DashboardOrganizationRanking[] | null>(null);
  const [dashError, setDashError] = useState<string | null>(null);
  const [clock, setClock] = useState<SystemClock | null>(null);
  const [clockSyncedAt, setClockSyncedAt] = useState(0);
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setDashError(null);
      try {
        const s = await getDashboardSummary();
        if (cancelled) return;
        setSummary(s);

        const isWide = s.scopeWidth !== "SELF";
        const isTopLevel = s.scopeWidth === "GLOBAL" || s.scopeWidth === "REGIONAL";

        const [activity, delay, workloadData, overdueData, rankingData] = await Promise.all([
          getDashboardMyActivity(),
          getDashboardDelayByType({ windowDays: 30 }),
          isWide ? getDashboardWorkload() : Promise.resolve(null),
          isWide ? getDashboardOverdueFiles({ limit: 6 }) : Promise.resolve(null),
          isTopLevel ? getDashboardComplianceRanking() : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setMyActivity(activity);
        setDelayByType(delay);
        setWorkload(workloadData);
        setOverdueFiles(overdueData);
        setRanking(rankingData);
      } catch (err) {
        if (!cancelled) {
          setDashError(err instanceof ApiError ? err.message : t("common.errorLoad"));
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;

    function applyClock(next: SystemClock) {
      if (cancelled) return;
      setClock(next);
      setClockSyncedAt(Date.now());
      setNowMs(Date.now());
    }

    async function loadClock() {
      try {
        applyClock(await getSystemClock());
      } catch {
        // La date locale reste disponible si l'horloge serveur est momentanément inaccessible.
      }
    }

    function handleClockUpdate(event: Event) {
      applyClock((event as CustomEvent<SystemClock>).detail);
    }

    loadClock();
    const pollId = window.setInterval(loadClock, 30_000);
    const tickId = window.setInterval(() => setNowMs(Date.now()), 1_000);
    window.addEventListener("fluxpro:system-clock-updated", handleClockUpdate);

    return () => {
      cancelled = true;
      window.clearInterval(pollId);
      window.clearInterval(tickId);
      window.removeEventListener("fluxpro:system-clock-updated", handleClockUpdate);
    };
  }, []);

  const locale = i18n.language?.startsWith("en") ? "en-GB" : "fr-FR";
  const clockNowMs = nowMs !== null && clock?.mode === "TEST"
    ? new Date(clock.now).getTime() + (nowMs - clockSyncedAt)
    : nowMs;
  const today = clockNowMs === null
    ? "—"
    : new Date(clockNowMs).toLocaleDateString(locale, {
        timeZone: clock?.zoneId || BUSINESS_ZONE,
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });

  const isWide = summary ? summary.scopeWidth !== "SELF" : false;
  const isTopLevel = summary ? summary.scopeWidth === "GLOBAL" || summary.scopeWidth === "REGIONAL" : false;
  const canExport = hasPermission(user, "DASHBOARD:EXPORT");

  const complianceRate = ranking && ranking.length > 0
    ? Math.round(
        (ranking.reduce((sum, r) => sum + r.compliantCount, 0) /
          Math.max(1, ranking.reduce((sum, r) => sum + r.closedCount, 0))) *
          100,
      )
    : summary && summary.activeFiles > 0
      ? Math.round(100 - (summary.overdueFiles / summary.activeFiles) * 100)
      : 100;

  const quickLinks = [
    { labelKey: "nav.reports", href: "/rapports", icon: <BarChartIcon />, bg: "#fff6ed", color: "#f97316", exportOnly: true },
    { labelKey: "nav.orgChart", href: "/admin/org", icon: <Share1Icon />, bg: "#ecf3ff", color: "#465fff" },
    { labelKey: "nav.users", href: "/admin/users", icon: <PersonIcon />, bg: "#ecfdf3", color: "#12b76a" },
    { labelKey: "nav.loginAudit", href: "/admin/audit", icon: <ReaderIcon />, bg: "#f4f3ff", color: "#7c3aed", superAdmin: true },
  ].filter((l) => {
    if ("exportOnly" in l && l.exportOnly) return canExport;
    if ("superAdmin" in l && l.superAdmin) return user?.role === "SUPER_ADMIN";
    if (l.href.startsWith("/admin")) return isAdmin;
    return true;
  });

  const profileRows = [
    { key: "direction", v: user?.organization.name },
    { key: "orgCode", v: user?.organization.code },
    {
      key: "password",
      v: user?.mustChangePassword ? t("common.passwordChangeRequired") : t("common.passwordUpToDate"),
    },
    { key: "jwtSession", v: t("common.sessionActive") },
  ];

  return (
    <RequireAuth>
      <AppShell>
        <div className="dash-welcome">
          <Flex justify="between" align="center" wrap="wrap" gap="3">
            <Box>
              <h1 className="dash-welcome__title">{t("dashboard.hello", { name: user?.firstName })}</h1>
              <p className="dash-welcome__sub">{t("dashboard.overview")}</p>
            </Box>
            <div className="dash-welcome__meta">
              <span className="dash-welcome__pill">
                <CalendarIcon width={14} height={14} />
                {today}
              </span>
              <span className="dash-welcome__pill">
                <HomeIcon width={14} height={14} />
                {user?.organization.code}
              </span>
              {summary && (
                <span className="dash-welcome__pill">
                  {t(`dashboard.scope.${summary.scopeWidth}`)}
                </span>
              )}
            </div>
          </Flex>
        </div>

        {dashError && (
          <Text as="p" size="2" color="red" mb="4">
            {dashError}
          </Text>
        )}

        <Grid columns={{ initial: "1", sm: "2", lg: "4" }} gap="4" mb="5" className="dash-stats-grid">
          <div className="dash-stat">
            <div className="dash-stat__icon dash-stat__icon--blue">
              <HomeIcon width={22} height={22} />
            </div>
            <p className="dash-stat__label">{t("dashboard.organisation")}</p>
            <p className="dash-stat__value">{summary?.organizationCode ?? user?.organization.code}</p>
            <div className="dash-stat__footer">
              <Text size="1" color="gray">{user?.organization.name}</Text>
              <span className="dash-trend dash-trend--up">{t("common.active")}</span>
            </div>
          </div>

          <div className="dash-stat">
            <div className="dash-stat__icon dash-stat__icon--green">
              <FileTextIcon width={22} height={22} />
            </div>
            <p className="dash-stat__label">{t("dashboard.stats.active")}</p>
            <p className="dash-stat__value">{summary?.activeFiles ?? "—"}</p>
            <div className="dash-stat__footer">
              <Text size="1" color="gray">{t("dashboard.stats.activeSub")}</Text>
              <span className="dash-trend dash-trend--neutral">
                {summary ? t("dashboard.stats.newThisMonth", { count: summary.createdThisMonth }) : "—"}
              </span>
            </div>
          </div>

          <div className="dash-stat">
            <div className="dash-stat__icon dash-stat__icon--orange">
              <ExclamationTriangleIcon width={22} height={22} />
            </div>
            <p className="dash-stat__label">{t("dashboard.stats.overdue")}</p>
            <p className="dash-stat__value" style={{ color: summary && summary.overdueFiles > 0 ? "var(--red-9)" : undefined }}>
              {summary?.overdueFiles ?? "—"}
            </p>
            <div className="dash-stat__footer">
              <Text size="1" color="gray">{t("dashboard.stats.overdueSub")}</Text>
              {summary && (
                <span className={`dash-trend ${summary.overdueFiles > 0 ? "dash-trend--soon" : "dash-trend--up"}`}>
                  {summary.overdueFiles > 0 ? t("dashboard.stats.attention") : t("dashboard.stats.onTrack")}
                </span>
              )}
            </div>
          </div>

          <div className="dash-stat">
            <div className="dash-stat__icon dash-stat__icon--purple">
              <CheckCircledIcon width={22} height={22} />
            </div>
            <p className="dash-stat__label">{t("dashboard.stats.closedThisMonth")}</p>
            <p className="dash-stat__value">{summary?.closedThisMonth ?? "—"}</p>
            <div className="dash-stat__footer">
              <Text size="1" color="gray">{t("dashboard.stats.closedThisMonthSub")}</Text>
              <RoleBadge role={user?.role ?? ""} />
            </div>
          </div>
        </Grid>

        <Grid columns={{ initial: "1", lg: "12" }} gap="4" mb="5">
          <Box gridColumn={{ lg: "span 7" }}>
            <MyActivityWidget data={myActivity} />
          </Box>
          <Box gridColumn={{ lg: "span 5" }}>
            <div className="dash-card">
              <h2 className="dash-card__title">{t("dashboard.complianceGauge.title")}</h2>
              <p className="dash-card__sub">{t("dashboard.complianceGauge.sub")}</p>
              <Gauge value={complianceRate} label={t("dashboard.complianceGauge.label")} />
            </div>
          </Box>
        </Grid>

        <Grid columns={{ initial: "1", lg: "12" }} gap="4" mb="5">
          <Box gridColumn={{ lg: "span 12" }}>
            <DelayByTypeWidget data={delayByType} />
          </Box>
        </Grid>

        {isWide && (
          <Grid columns={{ initial: "1", lg: "12" }} gap="4" mb="5">
            <Box gridColumn={{ lg: "span 6" }}>
              <WorkloadWidget data={workload} />
            </Box>
            <Box gridColumn={{ lg: "span 6" }}>
              <OverdueFilesWidget data={overdueFiles} />
            </Box>
          </Grid>
        )}

        {isTopLevel && (
          <Grid columns={{ initial: "1", lg: "12" }} gap="4" mb="5">
            <Box gridColumn={{ lg: "span 12" }}>
              <ComplianceRankingWidget data={ranking} />
            </Box>
          </Grid>
        )}

        <Grid columns={{ initial: "1", lg: "12" }} gap="4" mb="4">
          <Box gridColumn={{ lg: "span 4" }}>
            <div className="dash-card">
              <h2 className="dash-card__title">{t("dashboard.myProfile")}</h2>
              <p className="dash-card__sub">{t("dashboard.sessionInfo")}</p>
              <Flex align="center" gap="4" mb="4">
                <Avatar
                  size="5"
                  fallback={`${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`}
                  radius="full"
                  color="indigo"
                />
                <Box>
                  <Text size="3" weight="bold">{user?.firstName} {user?.lastName}</Text>
                  <Text size="2" color="gray" as="p" mt="1">{user?.email}</Text>
                  <Box mt="2"><RoleBadge role={user?.role ?? ""} /></Box>
                </Box>
              </Flex>
              {profileRows.map(({ key, v }) => (
                <div key={key} className="dash-profile-row">
                  <span className="dash-profile-row__label">{t(`dashboard.${key}`)}</span>
                  <span className="dash-profile-row__value">{v}</span>
                </div>
              ))}
            </div>
          </Box>

          {quickLinks.length > 0 && (
            <Box gridColumn={{ lg: "span 8" }}>
              <div className="dash-card">
                <h2 className="dash-card__title">{t("dashboard.quickAccess")}</h2>
                <p className="dash-card__sub">{t("dashboard.quickAccessSub")}</p>
                <Flex direction="column" gap="2">
                  {quickLinks.map((l) => (
                    <Link key={l.href} href={l.href} className="dash-quick">
                      <div className="dash-quick__icon" style={{ background: l.bg, color: l.color }}>
                        {l.icon}
                      </div>
                      <Text size="2" weight="bold" style={{ flex: 1 }}>
                        {t(l.labelKey)}
                      </Text>
                      <ChevronRightIcon className="dash-quick__chevron" width={18} height={18} />
                    </Link>
                  ))}
                </Flex>
              </div>
            </Box>
          )}
        </Grid>
      </AppShell>
    </RequireAuth>
  );
}
