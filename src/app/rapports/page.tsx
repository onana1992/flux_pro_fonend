"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  Flex,
  Grid,
  Select,
  Text,
  TextField,
} from "@radix-ui/themes";
import { DownloadIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { ApiError, downloadDashboardExport, getOrganizationTypes } from "@/lib/api";
import type { OrganizationType } from "@/lib/types";
import { PageHeader, StatusAlert } from "@/components/ui/shared";

type Dataset = "overdue-files" | "workload" | "compliance-ranking" | "delay-by-type";

const DATASETS: Dataset[] = ["overdue-files", "workload", "delay-by-type", "compliance-ranking"];

export default function ReportsPage() {
  const { t } = useTranslation();
  const [dataset, setDataset] = useState<Dataset>("overdue-files");
  const [windowDays, setWindowDays] = useState(90);
  const [groupByTypeCode, setGroupByTypeCode] = useState("DIRECTORATE");
  const [orgTypes, setOrgTypes] = useState<OrganizationType[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    getOrganizationTypes()
      .then(setOrgTypes)
      .catch(() => setOrgTypes([]));
  }, []);

  const needsWindowDays = dataset === "delay-by-type" || dataset === "compliance-ranking";
  const needsGroupBy = dataset === "compliance-ranking";

  async function handleDownload() {
    setDownloading(true);
    setError(null);
    setSuccess(null);
    try {
      await downloadDashboardExport({
        dataset,
        windowDays: needsWindowDays ? windowDays : undefined,
        groupByTypeCode: needsGroupBy ? groupByTypeCode : undefined,
        filename: `dashboard-${dataset}-${new Date().toISOString().slice(0, 10)}.csv`,
      });
      setSuccess(t("reports.downloadSuccess"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("reports.downloadFailed"));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <RequireAuth permission="DASHBOARD:EXPORT">
      <AppShell>
        <PageHeader title={t("reports.title")} description={t("reports.description")} />

        {error && <StatusAlert message={error} variant="error" />}
        {success && <StatusAlert message={success} variant="success" />}

        <Card size="3">
          <Grid columns={{ initial: "1", sm: "2" }} gap="4" mb="4">
            <Box>
              <Text as="div" size="2" weight="medium" mb="1">
                {t("reports.datasetLabel")}
              </Text>
              <Select.Root value={dataset} onValueChange={(v) => setDataset(v as Dataset)}>
                <Select.Trigger style={{ width: "100%" }} />
                <Select.Content>
                  {DATASETS.map((d) => (
                    <Select.Item key={d} value={d}>
                      {t(`reports.dataset.${d}`)}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
              <Text as="p" size="1" color="gray" mt="1">
                {t(`reports.datasetHint.${dataset}`)}
              </Text>
            </Box>

            {needsWindowDays && (
              <Box>
                <Text as="div" size="2" weight="medium" mb="1">
                  {t("reports.windowDaysLabel")}
                </Text>
                <TextField.Root
                  type="number"
                  min={1}
                  max={365}
                  value={windowDays}
                  onChange={(e) => setWindowDays(Number(e.target.value) || 1)}
                />
              </Box>
            )}

            {needsGroupBy && (
              <Box>
                <Text as="div" size="2" weight="medium" mb="1">
                  {t("reports.groupByLabel")}
                </Text>
                <Select.Root value={groupByTypeCode} onValueChange={setGroupByTypeCode}>
                  <Select.Trigger style={{ width: "100%" }} />
                  <Select.Content>
                    {orgTypes.map((ot) => (
                      <Select.Item key={ot.code} value={ot.code}>
                        {ot.name}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </Box>
            )}
          </Grid>

          <Flex justify="end">
            <Button onClick={handleDownload} disabled={downloading}>
              <DownloadIcon />
              {downloading ? t("reports.downloading") : t("reports.download")}
            </Button>
          </Flex>
        </Card>
      </AppShell>
    </RequireAuth>
  );
}
