"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Grid,
  Heading,
  Table,
  Text,
  TextArea,
} from "@radix-ui/themes";
import {
  ArrowLeftIcon,
  BellIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  DownloadIcon,
  FileTextIcon,
  Pencil1Icon,
  UploadIcon,
} from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { FilePriorityBadge } from "@/components/FilesTable";
import { PassageCircuit } from "@/components/PassageCircuit";
import { useAuth } from "@/components/AuthProvider";
import {
  ApiError,
  archiveFile,
  cancelFile,
  closeFile,
  downloadFileAttachment,
  getFile,
  listFileAlerts,
  submitFile,
  uploadFileAttachment,
} from "@/lib/api";
import { hasPermission } from "@/lib/auth-storage";
import type { AlertResponse, FileAttachment, FileDetail, FileStatus } from "@/lib/types";
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


function AttachmentCard({
  attachment,
  onDownload,
}: {
  attachment: FileAttachment;
  onDownload: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Flex
      gap="3"
      align="center"
      justify="between"
      p="3"
      style={{
        borderRadius: "var(--radius-2)",
        background: "var(--gray-a2)",
        border: "1px solid var(--gray-a4)",
      }}
    >
      <Flex gap="3" align="center" style={{ minWidth: 0, flex: 1 }}>
        <Flex
          align="center"
          justify="center"
          style={{
            width: 36,
            height: 36,
            borderRadius: "var(--radius-2)",
            background: "var(--accent-a3)",
            flexShrink: 0,
          }}
        >
          <FileTextIcon width={18} height={18} color="var(--accent-11)" />
        </Flex>
        <Flex direction="column" style={{ minWidth: 0 }}>
          <Text size="2" weight="medium" style={{ wordBreak: "break-word" }}>
            {attachment.originalFilename}
          </Text>
          <Text size="1" color="gray">
            {formatBytes(attachment.sizeBytes)}
            {attachment.uploadedByName ? ` · ${attachment.uploadedByName}` : ""}
          </Text>
          {attachment.responseDocument && (
            <Badge size="1" color="green" variant="soft" mt="1">
              {t("files.responseDocumentBadge")}
            </Badge>
          )}
        </Flex>
      </Flex>
      <Button size="1" variant="ghost" onClick={onDownload} style={{ flexShrink: 0 }}>
        <DownloadIcon />
      </Button>
    </Flex>
  );
}

function alertStatusColor(status: AlertResponse["status"]): "gray" | "blue" | "green" | "red" {
  switch (status) {
    case "SENT":
      return "blue";
    case "READ":
      return "green";
    case "FAILED":
      return "red";
    default:
      return "gray";
  }
}

function AlertHistoryCard({ fileId }: { fileId: string }) {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState<AlertResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listFileAlerts(fileId)
      .then((data) => {
        if (!cancelled) setAlerts(data);
      })
      .catch(() => {
        // historique non bloquant : une erreur ne doit pas casser la fiche dossier
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fileId]);

  return (
    <Card size="3">
      <Flex direction="column" gap="3">
        <Flex align="center" gap="2">
          <BellIcon width={16} height={16} color="var(--gray-11)" />
          <Text weight="bold" size="3">
            {t("files.alertHistory.title")}
          </Text>
          {alerts.length > 0 && (
            <Badge variant="soft" color="gray" size="1">
              {alerts.length}
            </Badge>
          )}
        </Flex>
        {loading ? (
          <Text size="2" color="gray">
            {t("files.alertHistory.loading")}
          </Text>
        ) : alerts.length === 0 ? (
          <Text size="2" color="gray">
            {t("files.alertHistory.empty")}
          </Text>
        ) : (
          <Flex direction="column" gap="2">
            {alerts.map((alert) => (
              <Flex
                key={alert.id}
                direction="column"
                gap="1"
                p="2"
                style={{
                  borderRadius: "var(--radius-2)",
                  background: "var(--gray-a2)",
                  border: "1px solid var(--gray-a4)",
                }}
              >
                <Flex justify="between" align="center" gap="2" wrap="wrap">
                  <Text size="2" weight="medium">
                    {alert.message}
                  </Text>
                  <Badge size="1" color={alertStatusColor(alert.status)} variant="soft">
                    {t(`notifications.statusValues.${alert.status}`)}
                  </Badge>
                </Flex>
                <Text size="1" color="gray">
                  {alert.channel} · {formatDateTime(alert.sentAt)}
                </Text>
              </Flex>
            ))}
          </Flex>
        )}
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
  const [responseFile, setResponseFile] = useState<File | null>(null);
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
    if (!responseFile && !responseAttachmentId) {
      setError(t("files.closureIncomplete"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      let attachmentId = responseAttachmentId;
      if (responseFile) {
        const uploaded = await uploadFileAttachment(fileId, responseFile, true);
        attachmentId = uploaded.id;
      }
      await closeFile(fileId, { closureReason, responseAttachmentId: attachmentId });
      setResponseFile(null);
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

  function handleResponseFilePick(files: FileList | null) {
    const picked = files?.[0] ?? null;
    setResponseFile(picked);
    setError(null);
  }

  if (loading || !file) {
    return <LoadingBlock message={t("files.loading")} />;
  }

  const showCancelForm =
    (file.status === "IN_PROGRESS" || file.status === "DRAFT") && canUpdate;
  const showCloseForm = file.status === "IN_PROGRESS" && canClose;
  const showSubmitSection = file.status === "DRAFT" && canUpdate;

  return (
    <Flex direction="column" gap="6" pb="6">
      {/* Header */}
      <Box
        p="5"
        style={{
          borderRadius: "var(--radius-3)",
          background: "var(--color-panel-solid)",
          border: "1px solid var(--gray-a4)",
        }}
      >
        <Flex direction="column" gap="4">
          <Button variant="ghost" size="1" asChild style={{ alignSelf: "flex-start", marginLeft: -4 }}>
            <Link href="/files">
              <ArrowLeftIcon />
              {t("files.backToList")}
            </Link>
          </Button>

          <Flex justify="between" align="start" gap="4" wrap="wrap">
            <Flex direction="column" gap="2" style={{ flex: 1, minWidth: 240 }}>
              <Heading size="6" style={{ letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                {file.referenceNumber ?? t("files.draftReferenceLong")}
              </Heading>
              <Text size="3" color="gray" style={{ lineHeight: 1.5 }}>
                {file.subject}
              </Text>
              <Flex gap="2" wrap="wrap" align="center" mt="1">
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

            <Flex gap="2" wrap="wrap" align="center" style={{ flexShrink: 0 }}>
              {file.status === "DRAFT" && canUpdate && (
                <Button variant="soft" size="2" asChild>
                  <Link href={`/files/${fileId}/edit`}>
                    <Pencil1Icon />
                    {t("files.edit")}
                  </Link>
                </Button>
              )}
              {file.status === "CLOSED" && canArchive && (
                <Button variant="soft" size="2" onClick={handleArchive} disabled={busy}>
                  {t("files.archive")}
                </Button>
              )}
            </Flex>
          </Flex>
        </Flex>
      </Box>

      {error && <StatusAlert variant="error" message={error} />}
      {success && <StatusAlert variant="success" message={success} />}

      {/* Main: circuit / submit | Secondary: info, attachments, final actions */}
      <Grid columns={{ initial: "1", md: "5" }} gap="5">
        {/* Primary column — operational follow-up */}
        <Box style={{ gridColumn: "span 3" }}>
          {showSubmitSection ? (
            <Card size="3">
              <Flex direction="column" gap="3">
                <Text weight="bold" size="3">
                  {t("files.submitSection")}
                </Text>
                <Text size="2" color="gray" as="p">
                  {t("files.submitHint")}
                </Text>
                <Flex gap="2" wrap="wrap">
                  <Button onClick={handleSubmit} disabled={busy}>
                    {t("files.submit")}
                  </Button>
                  <Button variant="soft" asChild>
                    <Link href={`/files/${fileId}/edit`}>{t("files.edit")}</Link>
                  </Button>
                </Flex>
              </Flex>
            </Card>
          ) : (
            <PassageCircuit fileId={fileId} fileStatus={file.status} onChanged={load} />
          )}
        </Box>

        {/* Secondary column — context + documents + final actions */}
        <Box style={{ gridColumn: "span 2" }}>
          <Flex direction="column" gap="4">
            <Card size="3">
              <Flex direction="column" gap="3">
                <Text weight="bold" size="3">
                  {t("files.metadata")}
                </Text>
                <Table.Root variant="surface" size="1">
                  <Table.Body>
                    <Table.Row>
                      <Table.RowHeaderCell style={{ width: "42%", verticalAlign: "middle" }}>
                        <Text size="1" color="gray">{t("files.senderOrBeneficiary")}</Text>
                      </Table.RowHeaderCell>
                      <Table.Cell>
                        <Text size="2" weight="medium">{file.senderOrBeneficiary}</Text>
                      </Table.Cell>
                    </Table.Row>
                    <Table.Row>
                      <Table.RowHeaderCell>
                        <Text size="1" color="gray">{t("files.receivedAt")}</Text>
                      </Table.RowHeaderCell>
                      <Table.Cell>
                        <Text size="2" weight="medium">{file.receivedAt}</Text>
                      </Table.Cell>
                    </Table.Row>
                    <Table.Row>
                      <Table.RowHeaderCell>
                        <Text size="1" color="gray">{t("files.organization")}</Text>
                      </Table.RowHeaderCell>
                      <Table.Cell>
                        <Text size="2" weight="medium">
                          {file.organizationCode} — {file.organizationName}
                        </Text>
                      </Table.Cell>
                    </Table.Row>
                    <Table.Row>
                      <Table.RowHeaderCell>
                        <Text size="1" color="gray">{t("files.createdBy")}</Text>
                      </Table.RowHeaderCell>
                      <Table.Cell>
                        <Text size="2" weight="medium">{file.createdByName ?? "—"}</Text>
                      </Table.Cell>
                    </Table.Row>
                    <Table.Row>
                      <Table.RowHeaderCell>
                        <Text size="1" color="gray">{t("files.createdAt")}</Text>
                      </Table.RowHeaderCell>
                      <Table.Cell>
                        <Text size="2">{formatDateTime(file.createdAt)}</Text>
                      </Table.Cell>
                    </Table.Row>
                    <Table.Row>
                      <Table.RowHeaderCell>
                        <Text size="1" color="gray">{t("files.updatedAt")}</Text>
                      </Table.RowHeaderCell>
                      <Table.Cell>
                        <Text size="2">{formatDateTime(file.updatedAt)}</Text>
                      </Table.Cell>
                    </Table.Row>
                    {file.closedAt && (
                      <Table.Row>
                        <Table.RowHeaderCell>
                          <Text size="1" color="gray">{t("files.closedAt")}</Text>
                        </Table.RowHeaderCell>
                        <Table.Cell>
                          <Text size="2">{formatDateTime(file.closedAt)}</Text>
                        </Table.Cell>
                      </Table.Row>
                    )}
                    {file.cancelledAt && (
                      <Table.Row>
                        <Table.RowHeaderCell>
                          <Text size="1" color="gray">{t("files.cancelledAt")}</Text>
                        </Table.RowHeaderCell>
                        <Table.Cell>
                          <Text size="2">{formatDateTime(file.cancelledAt)}</Text>
                        </Table.Cell>
                      </Table.Row>
                    )}
                    {file.closureReason && (
                      <Table.Row>
                        <Table.RowHeaderCell>
                          <Text size="1" color="gray">{t("files.closureReason")}</Text>
                        </Table.RowHeaderCell>
                        <Table.Cell>
                          <Text size="2">{file.closureReason}</Text>
                        </Table.Cell>
                      </Table.Row>
                    )}
                    {file.cancellationReason && (
                      <Table.Row>
                        <Table.RowHeaderCell>
                          <Text size="1" color="gray">{t("files.cancellationReason")}</Text>
                        </Table.RowHeaderCell>
                        <Table.Cell>
                          <Text size="2">{file.cancellationReason}</Text>
                        </Table.Cell>
                      </Table.Row>
                    )}
                  </Table.Body>
                </Table.Root>
              </Flex>
            </Card>

            <Card size="3">
              <Flex direction="column" gap="3">
                <Flex align="center" gap="2">
                  <FileTextIcon width={16} height={16} color="var(--gray-11)" />
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
              </Flex>
            </Card>

            <AlertHistoryCard fileId={fileId} />

            {(showCancelForm || showCloseForm) && (
              <Card size="3" style={{ padding: 0, overflow: "hidden" }}>
                <Flex
                  direction="column"
                  gap="1"
                  px="4"
                  pt="4"
                  pb="3"
                  style={{
                    background:
                      "linear-gradient(145deg, var(--gray-a3), var(--gray-a2) 55%, transparent)",
                    borderBottom: "1px solid var(--gray-a4)",
                  }}
                >
                  <Text weight="bold" size="3">
                    {t("files.workflow")}
                  </Text>
                  <Text size="2" color="gray">
                    {t("files.workflowHint")}
                  </Text>
                </Flex>

                <Flex direction="column" gap="3" p="4">
                  {showCloseForm && (
                    <Box
                      p="3"
                      style={{
                        borderRadius: "var(--radius-3)",
                        background: "var(--green-a2)",
                        border: "1px solid var(--green-a5)",
                      }}
                    >
                      <form onSubmit={handleClose}>
                        <Flex direction="column" gap="3">
                          <Flex align="center" gap="2">
                            <Flex
                              align="center"
                              justify="center"
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: "var(--radius-2)",
                                background: "var(--green-a4)",
                                flexShrink: 0,
                              }}
                            >
                              <CheckCircledIcon width={18} height={18} color="var(--green-11)" />
                            </Flex>
                            <Flex direction="column" gap="0">
                              <Text size="2" weight="bold">
                                {t("files.closureSection")}
                              </Text>
                              <Text size="1" color="gray">
                                {t("files.closureHint")}
                              </Text>
                            </Flex>
                          </Flex>

                          <Flex direction="column" gap="1">
                            <Text size="1" color="gray" weight="medium" style={{ textTransform: "uppercase" }}>
                              {t("files.closureReason")}
                            </Text>
                            <TextArea
                              value={closureReason}
                              onChange={(e) => setClosureReason(e.target.value)}
                              minLength={10}
                              required
                              placeholder={t("files.closureReason")}
                              rows={3}
                            />
                          </Flex>

                          <Flex direction="column" gap="1">
                            <Text size="1" color="gray" weight="medium" style={{ textTransform: "uppercase" }}>
                              {t("files.uploadResponse")}
                            </Text>
                            <Flex
                              align="center"
                              gap="2"
                              p="2"
                              style={{
                                borderRadius: "var(--radius-2)",
                                background: "var(--color-panel-solid)",
                                border: "1px dashed var(--gray-a6)",
                              }}
                            >
                              <UploadIcon width={16} height={16} color="var(--gray-9)" />
                              <input
                                type="file"
                                accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
                                onChange={(e) => handleResponseFilePick(e.target.files)}
                                style={{ flex: 1, minWidth: 0, fontSize: 12 }}
                              />
                            </Flex>
                            {responseFile ? (
                              <Text size="1" color="green" weight="medium">
                                {t("files.responseSelected", { name: responseFile.name })}
                              </Text>
                            ) : responseAttachmentId ? (
                              <Text size="1" color="green" weight="medium">
                                {t("files.responseReady")}
                              </Text>
                            ) : (
                              <Text size="1" color="gray">
                                {t("files.responseRequired")}
                              </Text>
                            )}
                          </Flex>

                          <Button
                            type="submit"
                            color="green"
                            disabled={busy || (!responseFile && !responseAttachmentId)}
                            size="2"
                          >
                            <CheckCircledIcon />
                            {t("files.close")}
                          </Button>
                        </Flex>
                      </form>
                    </Box>
                  )}

                  {showCancelForm && (
                    <Box
                      p="3"
                      style={{
                        borderRadius: "var(--radius-3)",
                        background: "var(--red-a2)",
                        border: "1px solid var(--red-a5)",
                      }}
                    >
                      <form onSubmit={handleCancel}>
                        <Flex direction="column" gap="3">
                          <Flex align="center" gap="2">
                            <Flex
                              align="center"
                              justify="center"
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: "var(--radius-2)",
                                background: "var(--red-a4)",
                                flexShrink: 0,
                              }}
                            >
                              <CrossCircledIcon width={18} height={18} color="var(--red-11)" />
                            </Flex>
                            <Flex direction="column" gap="0">
                              <Text size="2" weight="bold" color="red">
                                {t("files.cancelSection")}
                              </Text>
                              <Text size="1" color="gray">
                                {t("files.cancelHint")}
                              </Text>
                            </Flex>
                          </Flex>

                          <Flex direction="column" gap="1">
                            <Text size="1" color="gray" weight="medium" style={{ textTransform: "uppercase" }}>
                              {t("files.cancellationReason")}
                            </Text>
                            <TextArea
                              value={cancelReason}
                              onChange={(e) => setCancelReason(e.target.value)}
                              minLength={10}
                              required
                              placeholder={t("files.cancellationReason")}
                              rows={3}
                            />
                          </Flex>

                          <Button type="submit" color="red" variant="soft" disabled={busy} size="2">
                            <CrossCircledIcon />
                            {t("files.cancel")}
                          </Button>
                        </Flex>
                      </form>
                    </Box>
                  )}
                </Flex>
              </Card>
            )}
          </Flex>
        </Box>
      </Grid>
    </Flex>
  );
}
