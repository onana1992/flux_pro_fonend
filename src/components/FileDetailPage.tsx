"use client";

import { FormEvent, ReactNode, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Grid,
  Heading,
  Separator,
  Table,
  Text,
  TextArea,
} from "@radix-ui/themes";
import {
  ArrowLeftIcon,
  DownloadIcon,
  FileTextIcon,
  LayersIcon,
} from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { FilePriorityBadge } from "@/components/FilesTable";
import { useAuth } from "@/components/AuthProvider";
import {
  ApiError,
  archiveFile,
  cancelFile,
  closeFile,
  downloadFileAttachment,
  getFile,
  submitFile,
  uploadFileAttachment,
} from "@/lib/api";
import { hasPermission } from "@/lib/auth-storage";
import type { FileAttachment, FileDetail, FileStatus } from "@/lib/types";
import { LoadingBlock, StatusAlert } from "@/components/ui/shared";

function statusColor(status: FileStatus): "gray" | "blue" | "green" | "orange" | "red" {
  switch (status) {
    case "DRAFT":
      return "gray";
    case "IN_PROGRESS":
      return "blue";
    case "CLOSED":
    case "ARCHIVED":
      return "green";
    case "ON_HOLD":
      return "orange";
    case "CANCELLED":
      return "red";
    default:
      return "gray";
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Table.Row>
      <Table.RowHeaderCell style={{ width: "11rem", verticalAlign: "top" }}>
        <Text size="2" color="gray">
          {label}
        </Text>
      </Table.RowHeaderCell>
      <Table.Cell>
        {typeof value === "string" ? <Text size="2">{value}</Text> : value}
      </Table.Cell>
    </Table.Row>
  );
}

function AttachmentCard({
  attachment,
  onDownload,
}: {
  attachment: FileAttachment;
  onDownload: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Card size="2" variant="surface">
      <Flex gap="3" align="start" justify="between">
        <Flex gap="3" align="start" style={{ minWidth: 0, flex: 1 }}>
          <Flex
            align="center"
            justify="center"
            style={{
              width: 40,
              height: 40,
              borderRadius: "var(--radius-2)",
              background: "var(--accent-3)",
              flexShrink: 0,
            }}
          >
            <FileTextIcon width={20} height={20} />
          </Flex>
          <Flex direction="column" gap="1" style={{ minWidth: 0 }}>
            <Text size="2" weight="medium" style={{ wordBreak: "break-word" }}>
              {attachment.originalFilename}
            </Text>
            <Text size="1" color="gray">
              {formatBytes(attachment.sizeBytes)}
              {attachment.uploadedByName ? ` · ${attachment.uploadedByName}` : ""}
            </Text>
            {attachment.responseDocument && (
              <Badge size="1" color="green" variant="soft">
                {t("files.responseDocumentBadge")}
              </Badge>
            )}
          </Flex>
        </Flex>
        <Button size="1" variant="soft" onClick={onDownload}>
          <DownloadIcon />
          {t("files.download")}
        </Button>
      </Flex>
    </Card>
  );
}

export function FileDetailPage({ fileId }: { fileId: string }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [file, setFile] = useState<FileDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [closureReason, setClosureReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [responseAttachmentId, setResponseAttachmentId] = useState("");
  const [busy, setBusy] = useState(false);

  const canUpdate = hasPermission(user, "FILES:UPDATE");
  const canClose = hasPermission(user, "FILES:CLOSE");
  const canArchive = hasPermission(user, "FILES:ARCHIVE");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const detail = await getFile(fileId);
      setFile(detail);
      const response = detail.attachments.find((a) => a.responseDocument);
      if (response) setResponseAttachmentId(response.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [fileId, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit() {
    setBusy(true);
    setError(null);
    try {
      await submitFile(fileId);
      setSuccess(t("files.submitSuccess"));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("files.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleClose(e: FormEvent) {
    e.preventDefault();
    if (!responseAttachmentId) {
      setError(t("files.closureIncomplete"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await closeFile(fileId, { closureReason, responseAttachmentId });
      setSuccess(t("files.closeSuccess"));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("files.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await cancelFile(fileId, { reason: cancelReason });
      setSuccess(t("files.cancelSuccess"));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("files.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleArchive() {
    setBusy(true);
    try {
      await archiveFile(fileId);
      setSuccess(t("files.archiveSuccess"));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("files.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleResponseUpload(files: FileList | null) {
    const picked = files?.[0];
    if (!picked) return;
    setBusy(true);
    setError(null);
    try {
      const uploaded = await uploadFileAttachment(fileId, picked, true);
      setResponseAttachmentId(uploaded.id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("files.uploadFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (loading || !file) {
    return <LoadingBlock message={t("files.loading")} />;
  }

  const showCancelForm =
    (file.status === "IN_PROGRESS" || file.status === "DRAFT") && canUpdate;
  const showCloseForm = file.status === "IN_PROGRESS" && canClose;

  return (
    <Flex direction="column" gap="5">
      <Flex justify="between" align="start" gap="4" wrap="wrap">
        <Flex direction="column" gap="3" style={{ flex: 1, minWidth: 280 }}>
          <Button variant="ghost" size="2" asChild style={{ alignSelf: "flex-start", marginLeft: -8 }}>
            <Link href="/files">
              <ArrowLeftIcon />
              {t("files.backToList")}
            </Link>
          </Button>
          <Box>
            <Heading size="7" mb="1" style={{ letterSpacing: "-0.02em" }}>
              {file.referenceNumber ?? t("files.draftReferenceLong")}
            </Heading>
            <Text size="3" color="gray" style={{ lineHeight: 1.5 }}>
              {file.subject}
            </Text>
          </Box>
          <Flex gap="2" wrap="wrap" align="center">
            <Badge size="2" color={statusColor(file.status)} variant="soft">
              {t(`files.statusValues.${file.status}`)}
            </Badge>
            <FilePriorityBadge priority={file.priority} />
            <Badge size="1" variant="outline" color="gray">
              {file.fileTypeCode}
            </Badge>
            <Badge size="1" variant="outline" color="gray">
              {file.organizationCode}
            </Badge>
          </Flex>
        </Flex>

        <Flex gap="2" wrap="wrap" align="center">
          {file.status === "DRAFT" && canUpdate && (
            <>
              <Button variant="soft" asChild>
                <Link href={`/files/${fileId}/edit`}>{t("files.edit")}</Link>
              </Button>
              <Button onClick={handleSubmit} disabled={busy}>
                {t("files.submit")}
              </Button>
            </>
          )}
          {file.status === "CLOSED" && canArchive && (
            <Button variant="soft" onClick={handleArchive} disabled={busy}>
              {t("files.archive")}
            </Button>
          )}
        </Flex>
      </Flex>

      {error && <StatusAlert variant="error" message={error} />}
      {success && <StatusAlert variant="success" message={success} />}

      <Grid columns={{ initial: "1", lg: "3" }} gap="4">
        <Box style={{ gridColumn: "span 2" }}>
          <Flex direction="column" gap="4">
            <Card size="3">
              <Text weight="bold" size="3" mb="3">
                {t("files.metadata")}
              </Text>
              <Table.Root variant="surface">
                <Table.Body>
                  <DetailRow label={t("files.senderOrBeneficiary")} value={file.senderOrBeneficiary} />
                  <DetailRow label={t("files.receivedAt")} value={file.receivedAt} />
                  <DetailRow
                    label={t("files.organization")}
                    value={`${file.organizationCode} — ${file.organizationName}`}
                  />
                  <DetailRow
                    label={t("files.createdBy")}
                    value={file.createdByName ?? "—"}
                  />
                  <DetailRow label={t("files.createdAt")} value={formatDateTime(file.createdAt)} />
                  <DetailRow label={t("files.updatedAt")} value={formatDateTime(file.updatedAt)} />
                  {file.closureReason && (
                    <DetailRow label={t("files.closureReason")} value={file.closureReason} />
                  )}
                  {file.closedAt && (
                    <DetailRow label={t("files.closedAt")} value={formatDateTime(file.closedAt)} />
                  )}
                  {file.cancellationReason && (
                    <DetailRow label={t("files.cancellationReason")} value={file.cancellationReason} />
                  )}
                  {file.cancelledAt && (
                    <DetailRow label={t("files.cancelledAt")} value={formatDateTime(file.cancelledAt)} />
                  )}
                </Table.Body>
              </Table.Root>
            </Card>

            <Card size="3">
              <Flex align="center" gap="2" mb="3">
                <FileTextIcon />
                <Text weight="bold" size="3">
                  {t("files.attachmentsTab")}
                </Text>
                <Badge variant="soft" color="gray" size="1">
                  {file.attachments.length}
                </Badge>
              </Flex>
              {file.attachments.length === 0 ? (
                <Text size="2" color="gray">
                  {t("files.noAttachments")}
                </Text>
              ) : (
                <Flex direction="column" gap="2">
                  {file.attachments.map((a) => (
                    <AttachmentCard
                      key={a.id}
                      attachment={a}
                      onDownload={() => downloadFileAttachment(fileId, a.id, a.originalFilename)}
                    />
                  ))}
                </Flex>
              )}
            </Card>
          </Flex>
        </Box>

        <Flex direction="column" gap="4">
          {file.chainTemplateCode && (
            <Card size="3">
              <Flex align="center" gap="2" mb="3">
                <LayersIcon />
                <Text weight="bold" size="3">
                  {t("files.chainTemplate")}
                </Text>
              </Flex>
              <Flex direction="column" gap="2">
                <Badge size="2" color="blue" variant="soft" style={{ alignSelf: "flex-start" }}>
                  {file.chainTemplateCode}
                </Badge>
                <Text size="2" weight="medium">
                  {file.chainTemplateName}
                </Text>
                <Text size="1" color="gray">
                  {t("files.circuitComingSoon")}
                </Text>
              </Flex>
            </Card>
          )}

          {(showCancelForm || showCloseForm) && (
            <Card size="3">
              <Text weight="bold" size="3" mb="3">
                {t("files.workflow")}
              </Text>
              <Flex direction="column" gap="4">
                {showCancelForm && (
                  <form onSubmit={handleCancel}>
                    <Flex direction="column" gap="2">
                      <Text size="2" weight="medium" color="red">
                        {t("files.cancelSection")}
                      </Text>
                      <TextArea
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        minLength={10}
                        required
                        placeholder={t("files.cancellationReason")}
                        rows={3}
                      />
                      <Button type="submit" color="red" variant="soft" disabled={busy}>
                        {t("files.cancel")}
                      </Button>
                    </Flex>
                  </form>
                )}

                {showCancelForm && showCloseForm && <Separator size="4" />}

                {showCloseForm && (
                  <form onSubmit={handleClose}>
                    <Flex direction="column" gap="3">
                      <Text size="2" weight="medium">
                        {t("files.closureSection")}
                      </Text>
                      <TextArea
                        value={closureReason}
                        onChange={(e) => setClosureReason(e.target.value)}
                        minLength={10}
                        required
                        placeholder={t("files.closureReason")}
                        rows={3}
                      />
                      <Flex direction="column" gap="2">
                        <Text size="2">{t("files.uploadResponse")}</Text>
                        <input
                          type="file"
                          accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
                          onChange={(e) => handleResponseUpload(e.target.files)}
                        />
                        {responseAttachmentId && (
                          <Text size="1" color="green">
                            {t("files.responseReady")}
                          </Text>
                        )}
                      </Flex>
                      <Button type="submit" disabled={busy || !responseAttachmentId}>
                        {t("files.close")}
                      </Button>
                    </Flex>
                  </form>
                )}
              </Flex>
            </Card>
          )}
        </Flex>
      </Grid>
    </Flex>
  );
}
