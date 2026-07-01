"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { OrganisationGraph } from "@/components/OrganisationGraph";
import { RequireAuth } from "@/components/RequireAuth";
import { ApiError, getOrganizationTree, importOrganizations } from "@/lib/api";
import type { ImportResult, OrganisationTreeNode } from "@/lib/types";
import {
  EmptyBlock,
  FileImportButton,
  LoadingBlock,
  PageHeader,
  StatusAlert,
} from "@/components/ui/shared";

export default function AdminOrgPage() {
  const { t } = useTranslation();
  const [tree, setTree] = useState<OrganisationTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTree(await getOrganizationTree());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setImportResult(null);
    try {
      const result = await importOrganizations(file);
      setImportResult(result);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.importFailed"));
    }
    e.target.value = "";
  }

  return (
    <RequireAuth admin>
      <AppShell>
        <PageHeader
          title={t("admin.org.title")}
          description={t("admin.org.description")}
          actions={<FileImportButton label={t("common.importCsv")} onChange={handleImport} />}
        />

        {error && <StatusAlert message={error} variant="error" />}
        {importResult && (
          <StatusAlert
            message={t("common.importSuccess", {
              created: importResult.created,
              updated: importResult.updated,
            })}
            variant="success"
          />
        )}

        <Card size="3">
          {loading ? (
            <LoadingBlock message={t("admin.org.loading")} />
          ) : tree.length === 0 ? (
            <EmptyBlock
              title={t("admin.org.emptyTitle")}
              description={t("admin.org.emptyDescription")}
            />
          ) : (
            <OrganisationGraph nodes={tree} />
          )}
        </Card>
      </AppShell>
    </RequireAuth>
  );
}
