"use client";

import Link from "next/link";
import { Badge, Box, Flex, Grid, Table, Text } from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import type {
  DashboardDelayByType,
  DashboardMyActivity,
  DashboardOrganizationRanking,
  DashboardOverdueFile,
  DashboardWorkloadEntry,
} from "@/lib/types";
import { EmptyBlock } from "@/components/ui/shared";
import { formatBusinessDate } from "@/lib/datetime";

function useLocale() {
  const { i18n } = useTranslation();
  return i18n.language?.startsWith("en") ? "en-GB" : "fr-FR";
}

function formatDate(locale: string, value?: string | null): string {
  return formatBusinessDate(value, locale);
}

/** DSH-01 — jamais filtré par périmètre organisationnel : toujours l'activité de l'appelant. */
export function MyActivityWidget({ data }: { data: DashboardMyActivity | null }) {
  const { t } = useTranslation();
  const locale = useLocale();

  return (
    <div className="dash-card">
      <h2 className="dash-card__title">{t("dashboard.myActivity.title")}</h2>
      <p className="dash-card__sub">{t("dashboard.myActivity.sub")}</p>

      <Grid columns="3" gap="3" pb="4" mb="4" className="dash-chart-summary">
        <Box className="dash-chart-summary__item">
          <Text as="p" size="1" color="gray" mb="1">{t("dashboard.myActivity.active")}</Text>
          <Text as="p" size="5" weight="bold" className="dash-chart-summary__value">{data?.activeCount ?? "—"}</Text>
        </Box>
        <Box className="dash-chart-summary__item">
          <Text as="p" size="1" color="gray" mb="1">{t("dashboard.myActivity.overdue")}</Text>
          <Text
            as="p"
            size="5"
            weight="bold"
            className="dash-chart-summary__value"
            style={{ color: (data?.overdueCount ?? 0) > 0 ? "var(--red-9)" : undefined }}
          >
            {data?.overdueCount ?? "—"}
          </Text>
        </Box>
        <Box className="dash-chart-summary__item">
          <Text as="p" size="1" color="gray" mb="1">{t("dashboard.myActivity.transmitted")}</Text>
          <Text as="p" size="5" weight="bold" className="dash-chart-summary__value">
            {data?.transmittedRecentCount ?? "—"}
          </Text>
        </Box>
      </Grid>

      {!data || data.items.length === 0 ? (
        <EmptyBlock title={t("dashboard.myActivity.empty")} />
      ) : (
        <div>
          {data.items.slice(0, 8).map((item) => (
            <Link key={item.passageId} href={`/files/${item.fileId}`} className="dash-activity" style={{ textDecoration: "none", color: "inherit" }}>
              <span
                className="dash-activity__dot"
                style={{ background: item.overdue ? "#f97316" : "#12b76a" }}
              />
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Flex justify="between" align="start" gap="2">
                  <Text size="2" weight="medium" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.fileReferenceNumber ?? item.fileSubject}
                  </Text>
                  <span className={`dash-status ${item.overdue ? "dash-status--pending" : "dash-status--ok"}`}>
                    {item.overdue ? t("dashboard.myActivity.late") : t("dashboard.myActivity.onTime")}
                  </span>
                </Flex>
                <Text size="1" color="gray">
                  {item.stepLabel} · {t("dashboard.myActivity.dueOn", { date: formatDate(locale, item.dueAt) })}
                </Text>
              </Box>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/** DSH-02 — charge par agent, uniquement visible si le périmètre contient des subordonnés. */
export function WorkloadWidget({ data }: { data: DashboardWorkloadEntry[] | null }) {
  const { t } = useTranslation();
  return (
    <div className="dash-card">
      <h2 className="dash-card__title">{t("dashboard.workload.title")}</h2>
      <p className="dash-card__sub">{t("dashboard.workload.sub")}</p>
      {!data || data.length === 0 ? (
        <EmptyBlock title={t("dashboard.workload.empty")} />
      ) : (
        <Table.Root variant="surface" size="1">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>{t("dashboard.workload.agent")}</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>{t("dashboard.workload.organization")}</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell align="right">{t("dashboard.workload.active")}</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell align="right">{t("dashboard.workload.overdue")}</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {data.slice(0, 10).map((entry) => (
              <Table.Row key={entry.userId}>
                <Table.Cell>{entry.firstName} {entry.lastName}</Table.Cell>
                <Table.Cell>
                  <Text size="1" color="gray">{entry.organizationCode ?? "—"}</Text>
                </Table.Cell>
                <Table.Cell align="right">{entry.activeCount}</Table.Cell>
                <Table.Cell align="right">
                  {entry.overdueCount > 0 ? (
                    <Badge color="red" variant="soft">{entry.overdueCount}</Badge>
                  ) : (
                    <Text color="gray">0</Text>
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}
    </div>
  );
}

/** DSH-01/02/03 — top des dossiers les plus en retard. */
export function OverdueFilesWidget({ data }: { data: DashboardOverdueFile[] | null }) {
  const { t } = useTranslation();
  const locale = useLocale();
  return (
    <div className="dash-card">
      <h2 className="dash-card__title">{t("dashboard.overdueFiles.title")}</h2>
      <p className="dash-card__sub">{t("dashboard.overdueFiles.sub")}</p>
      {!data || data.length === 0 ? (
        <EmptyBlock title={t("dashboard.overdueFiles.empty")} />
      ) : (
        <Table.Root variant="surface" size="1">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>{t("dashboard.overdueFiles.reference")}</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>{t("dashboard.overdueFiles.step")}</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>{t("dashboard.overdueFiles.responsible")}</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>{t("dashboard.overdueFiles.dueAt")}</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell align="right">{t("dashboard.overdueFiles.daysLate")}</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {data.map((file) => (
              <Table.Row key={file.fileId}>
                <Table.Cell>
                  <Link href={`/files/${file.fileId}`} style={{ fontFamily: "var(--font-geist-mono)" }}>
                    {file.referenceNumber ?? "—"}
                  </Link>
                  <Text as="p" size="1" color="gray" style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {file.subject}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="1" color="gray">{file.stepLabel}</Text>
                </Table.Cell>
                <Table.Cell>{file.responsibleUserName ?? "—"}</Table.Cell>
                <Table.Cell>
                  <Text size="1" color="gray">{formatDate(locale, file.dueAt)}</Text>
                </Table.Cell>
                <Table.Cell align="right">
                  <Badge color="red" variant="soft">{file.daysOverdue} j</Badge>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}
    </div>
  );
}

/** DSH-06 — délai moyen réel vs cible, par type de dossier. */
export function DelayByTypeWidget({ data }: { data: DashboardDelayByType[] | null }) {
  const { t } = useTranslation();
  const maxValue = Math.max(1, ...(data ?? []).map((d) => Math.max(d.averageDelayDays, d.targetDelayDays ?? 0)));

  return (
    <div className="dash-card">
      <h2 className="dash-card__title">{t("dashboard.delayByType.title")}</h2>
      <p className="dash-card__sub">{t("dashboard.delayByType.sub")}</p>
      {!data || data.length === 0 ? (
        <EmptyBlock title={t("dashboard.delayByType.empty")} />
      ) : (
        <Flex direction="column" gap="4">
          {data.map((entry) => {
            const overTarget = entry.targetDelayDays != null && entry.averageDelayDays > entry.targetDelayDays;
            return (
              <Box key={entry.fileTypeCode}>
                <Flex justify="between" align="center" mb="1">
                  <Text size="2" weight="medium">{entry.fileTypeLabel}</Text>
                  <Text size="2" color={overTarget ? "red" : "gray"} weight={overTarget ? "bold" : "regular"}>
                    {entry.averageDelayDays.toFixed(1)} {t("dashboard.delayByType.days")}
                    {entry.targetDelayDays != null && ` / ${entry.targetDelayDays} j`}
                  </Text>
                </Flex>
                <div style={{ height: 8, borderRadius: 9999, background: "var(--gray-a4)", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(100, (entry.averageDelayDays / maxValue) * 100)}%`,
                      background: overTarget
                        ? "linear-gradient(90deg,#f97316,#ef4444)"
                        : "linear-gradient(90deg,#818cf8,#465fff)",
                      borderRadius: 9999,
                    }}
                  />
                </div>
                <Text size="1" color="gray">
                  {t("dashboard.delayByType.closedCount", { count: entry.closedCount })}
                </Text>
              </Box>
            );
          })}
        </Flex>
      )}
    </div>
  );
}

/** DSH-07 (et heatmap DSH-04) — classement par taux de respect des délais, regroupé de façon paramétrable. */
export function ComplianceRankingWidget({ data }: { data: DashboardOrganizationRanking[] | null }) {
  const { t } = useTranslation();
  return (
    <div className="dash-card">
      <h2 className="dash-card__title">{t("dashboard.complianceRanking.title")}</h2>
      <p className="dash-card__sub">{t("dashboard.complianceRanking.sub")}</p>
      {!data || data.length === 0 ? (
        <EmptyBlock title={t("dashboard.complianceRanking.empty")} />
      ) : (
        <Table.Root variant="surface" size="1">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>#</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>{t("dashboard.complianceRanking.organization")}</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell align="right">{t("dashboard.complianceRanking.closed")}</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell align="right">{t("dashboard.complianceRanking.compliant")}</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell align="right">{t("dashboard.complianceRanking.rate")}</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {data.map((entry, index) => (
              <Table.Row key={entry.organizationId}>
                <Table.Cell>
                  <Text color="gray">{index + 1}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text weight="medium">{entry.organizationName}</Text>{" "}
                  <Text size="1" color="gray">({entry.organizationCode})</Text>
                </Table.Cell>
                <Table.Cell align="right">{entry.closedCount}</Table.Cell>
                <Table.Cell align="right">{entry.compliantCount}</Table.Cell>
                <Table.Cell align="right">
                  <Badge color={entry.complianceRate >= 80 ? "green" : entry.complianceRate >= 50 ? "orange" : "red"} variant="soft">
                    {entry.complianceRate.toFixed(0)}%
                  </Badge>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}
    </div>
  );
}
