"use client";

import Link from "next/link";
import {
  Avatar,
  Box,
  Flex,
  Grid,
  Text,
} from "@radix-ui/themes";
import {
  ArrowUpIcon,
  ChevronRightIcon,
  CalendarIcon,
  FileTextIcon,
  HomeIcon,
  PersonIcon,
  Share1Icon,
  ReaderIcon,
} from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { RoleBadge } from "@/components/ui/shared";

const BAR_HEIGHTS = [65, 45, 80, 55, 90, 70, 40, 85, 60, 75, 50, 95];
const MONTH_KEYS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
] as const;

function Gauge({ value, label }: { value: number; label: string }) {
  const r = 58;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;

  return (
    <div className="dash-gauge">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="var(--gray-a4)" strokeWidth="12" />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="#465fff"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="dash-gauge__center">
        <span className="dash-gauge__value">{value}%</span>
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

  const locale = i18n.language?.startsWith("en") ? "en-GB" : "fr-FR";
  const today = new Date().toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const quickLinks = [
    { labelKey: "nav.orgChart", href: "/admin/org", icon: <Share1Icon />, bg: "#ecf3ff", color: "#465fff" },
    { labelKey: "nav.users", href: "/admin/users", icon: <PersonIcon />, bg: "#ecfdf3", color: "#12b76a" },
    { labelKey: "nav.loginAudit", href: "/admin/audit", icon: <ReaderIcon />, bg: "#f4f3ff", color: "#7c3aed", superAdmin: true },
  ].filter((l) => {
    if ("superAdmin" in l && l.superAdmin) return user?.role === "SUPER_ADMIN";
    if (l.href.startsWith("/admin")) return isAdmin;
    return true;
  });

  const chartSummary = [
    { key: "annualTotal", v: "—" },
    { key: "monthlyAvg", v: "—" },
    { key: "peakMay", v: "90" },
  ];

  const goalSummary = [
    { key: "target", v: "48h" },
    { key: "average", v: "—" },
    { key: "today", v: "—" },
  ];

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
            </div>
          </Flex>
        </div>

        <Grid columns={{ initial: "1", sm: "2", lg: "4" }} gap="4" mb="5" className="dash-stats-grid">
          <div className="dash-stat">
            <div className="dash-stat__icon dash-stat__icon--blue">
              <HomeIcon width={22} height={22} />
            </div>
            <p className="dash-stat__label">{t("dashboard.organisation")}</p>
            <p className="dash-stat__value">{user?.organization.code}</p>
            <div className="dash-stat__footer">
              <Text size="1" color="gray">{user?.organization.name}</Text>
              <span className="dash-trend dash-trend--up">{t("common.active")}</span>
            </div>
          </div>

          <div className="dash-stat">
            <div className="dash-stat__icon dash-stat__icon--green">
              <PersonIcon width={22} height={22} />
            </div>
            <p className="dash-stat__label">{t("dashboard.pilotAgents")}</p>
            <p className="dash-stat__value">85</p>
            <div className="dash-stat__footer">
              <Text size="1" color="gray">{t("dashboard.mintpRef")}</Text>
              <span className="dash-trend dash-trend--up">
                <ArrowUpIcon /> 11%
              </span>
            </div>
          </div>

          <div className="dash-stat">
            <div className="dash-stat__icon dash-stat__icon--orange">
              <FileTextIcon width={22} height={22} />
            </div>
            <p className="dash-stat__label">{t("dashboard.activeFiles")}</p>
            <p className="dash-stat__value">—</p>
            <div className="dash-stat__footer">
              <Text size="1" color="gray">{t("dashboard.passationChain")}</Text>
              <span className="dash-trend dash-trend--soon">{t("dashboard.sprint2")}</span>
            </div>
          </div>

          <div className="dash-stat">
            <div className="dash-stat__icon dash-stat__icon--purple">
              <ReaderIcon width={22} height={22} />
            </div>
            <p className="dash-stat__label">{t("dashboard.yourRole")}</p>
            <p className="dash-stat__value dash-stat__value--sm">
              {user?.role.replace(/_/g, " ")}
            </p>
            <div className="dash-stat__footer">
              <RoleBadge role={user?.role ?? ""} />
              <span className="dash-trend dash-trend--neutral">{t("dashboard.session8h")}</span>
            </div>
          </div>
        </Grid>

        <Grid columns={{ initial: "1", lg: "12" }} gap="4" mb="5">
          <Box gridColumn={{ lg: "span 8" }}>
            <div className="dash-card">
              <h2 className="dash-card__title">{t("dashboard.filesByMonth")}</h2>
              <p className="dash-card__sub">{t("dashboard.filesByMonthSub")}</p>
              <Flex align="end" gap="2" style={{ height: 200, marginBottom: "1rem" }}>
                {BAR_HEIGHTS.map((h, i) => (
                  <Flex key={MONTH_KEYS[i]} direction="column" align="center" gap="2" style={{ flex: 1 }}>
                    <div className="dash-bar" style={{ height: `${h}%` }} />
                    <Text size="1" color="gray">{t(`dashboard.months.${MONTH_KEYS[i]}`)}</Text>
                  </Flex>
                ))}
              </Flex>
              <Grid columns="3" gap="4" pt="4" className="dash-chart-summary">
                {chartSummary.map(({ key, v }) => (
                  <Box key={key} className="dash-chart-summary__item">
                    <Text as="p" size="1" color="gray" mb="1">
                      {t(`dashboard.${key}`)}
                    </Text>
                    <Text as="p" size="4" weight="bold" className="dash-chart-summary__value">
                      {v}
                    </Text>
                  </Box>
                ))}
              </Grid>
            </div>
          </Box>

          <Box gridColumn={{ lg: "span 4" }}>
            <div className="dash-card">
              <h2 className="dash-card__title">{t("dashboard.treatmentGoal")}</h2>
              <p className="dash-card__sub">{t("dashboard.treatmentGoalSub")}</p>
              <Gauge value={75} label={t("dashboard.goal")} />
              <Flex justify="center" mt="3" mb="4">
                <span className="dash-trend dash-trend--up">
                  <ArrowUpIcon /> {t("dashboard.trendVsLastMonth")}
                </span>
              </Flex>
              <Grid columns="3" gap="4" pt="4" className="dash-chart-summary">
                {goalSummary.map(({ key, v }) => (
                  <Box key={key} className="dash-chart-summary__item">
                    <Text as="p" size="1" color="gray" mb="1">
                      {t(`dashboard.${key}`)}
                    </Text>
                    <Text as="p" size="4" weight="bold" className="dash-chart-summary__value">
                      {v}
                    </Text>
                  </Box>
                ))}
              </Grid>
            </div>
          </Box>
        </Grid>

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
                  <Text color="gray">{t(`dashboard.${key}`)}</Text>
                  <Text weight="medium">{v}</Text>
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
