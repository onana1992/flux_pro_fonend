"use client";

import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Grid,
  Heading,
  Select,
  Table,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import {
  ArrowLeftIcon,
  FileTextIcon,
  InfoCircledIcon,
  LayersIcon,
  TrashIcon,
  UploadIcon,
} from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  ApiError,
  createFile,
  deleteFileAttachment,
  getFile,
  getFileTypes,
  getOrganizationTree,
  submitFile,
  updateFile,
  uploadFileAttachment,
} from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { FilePriorityBadge } from "@/components/FilesTable";
import type {
  FileDetail,
  FilePriority,
  FileType,
  OrganizationTreeNode,
} from "@/lib/types";
import { LoadingBlock, StatusAlert } from "@/components/ui/shared";

const MAX_BYTES = 21_474_836;
const ACCEPTED_TYPES = ".pdf,.docx,.xlsx,.jpg,.jpeg,.png";

function flattenOrganizations(nodes: OrganizationTreeNode[]): OrganizationTreeNode[] {
  const result: OrganizationTreeNode[] = [];
  function walk(list: OrganizationTreeNode[]) {
    for (const node of list) {
      if (node.active) result.push(node);
      walk(node.children ?? []);
    }
  }
  walk(nodes);
  return result;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Table.Row>
      <Table.RowHeaderCell style={{ width: "38%", verticalAlign: "top", paddingRight: "var(--space-2)" }}>
        <Text size="1" color="gray">
          {label}
        </Text>
      </Table.RowHeaderCell>
      <Table.Cell style={{ verticalAlign: "top" }}>
        {typeof value === "string" ? (
          <Text size="2" weight="medium" style={{ wordBreak: "break-word" }}>
            {value}
          </Text>
        ) : (
          value
        )}
      </Table.Cell>
    </Table.Row>
  );
}

function FormField({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <Flex direction="column" gap="1">
      <Text as="label" size="2" weight="medium">
        {label}
        {required && (
          <Text as="span" color="red">
            {" "}
            *
          </Text>
        )}
      </Text>
      {children}
      {hint && (
        <Text size="1" color="gray">
          {hint}
        </Text>
      )}
    </Flex>
  );
}

function PendingFileRow({
  name,
  size,
  onRemove,
}: {
  name: string;
  size: number;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Card size="1" variant="surface">
      <Flex gap="3" align="center" justify="between">
        <Flex gap="3" align="center" style={{ minWidth: 0, flex: 1 }}>
          <Flex
            align="center"
            justify="center"
            style={{
              width: 36,
              height: 36,
              borderRadius: "var(--radius-2)",
              background: "var(--accent-3)",
              flexShrink: 0,
            }}
          >
            <FileTextIcon width={18} height={18} />
          </Flex>
          <Flex direction="column" gap="0" style={{ minWidth: 0 }}>
            <Text size="2" weight="medium" style={{ wordBreak: "break-word" }}>
              {name}
            </Text>
            <Text size="1" color="gray">
              {formatBytes(size)}
            </Text>
          </Flex>
        </Flex>
        <Button type="button" variant="ghost" color="red" size="1" onClick={onRemove}>
          <TrashIcon />
          {t("files.delete")}
        </Button>
      </Flex>
    </Card>
  );
}

interface FormState {
  fileTypeCode: string;
  organizationId: string;
  subject: string;
  senderOrBeneficiary: string;
  receivedAt: string;
  priority: FilePriority;
}

interface FileFormPageProps {
  mode: "create" | "edit";
  fileId?: string;
}

export function FileFormPage({ mode, fileId }: FileFormPageProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileTypes, setFileTypes] = useState<FileType[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationTreeNode[]>([]);
  const [existing, setExisting] = useState<FileDetail | null>(null);
  const [form, setForm] = useState<FormState>({
    fileTypeCode: "",
    organizationId: user?.organization.id ?? "",
    subject: "",
    senderOrBeneficiary: "",
    receivedAt: new Date().toISOString().slice(0, 10),
    priority: "NORMAL",
  });
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(mode === "edit");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const orgOptions = useMemo(() => flattenOrganizations(organizations), [organizations]);

  const selectedFileType = useMemo(
    () => fileTypes.find((ft) => ft.code === form.fileTypeCode),
    [fileTypes, form.fileTypeCode],
  );

  const selectedOrg = useMemo(
    () => orgOptions.find((org) => org.id === form.organizationId),
    [orgOptions, form.organizationId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [types, tree] = await Promise.all([getFileTypes(), getOrganizationTree()]);
      setFileTypes(types);
      setOrganizations(tree);
      if (mode === "edit" && fileId) {
        const detail = await getFile(fileId);
        if (detail.status !== "DRAFT") {
          router.replace(`/files/${fileId}`);
          return;
        }
        setExisting(detail);
        setForm({
          fileTypeCode: detail.fileTypeCode,
          organizationId: detail.organizationId,
          subject: detail.subject,
          senderOrBeneficiary: detail.senderOrBeneficiary,
          receivedAt: detail.receivedAt,
          priority: detail.priority,
        });
      } else if (!form.organizationId && user?.organization.id) {
        setForm((prev) => ({ ...prev, organizationId: user.organization.id }));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [fileId, form.organizationId, mode, router, t, user?.organization.id]);

  useEffect(() => {
    load();
  }, [load]);

  function onFilePick(files: FileList | null) {
    if (!files) return;
    const valid: File[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_BYTES) {
        setError(t("files.maxSize"));
        continue;
      }
      valid.push(file);
    }
    if (valid.length) setPendingFiles((prev) => [...prev, ...valid]);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    onFilePick(e.dataTransfer.files);
  }

  async function uploadPending(targetId: string) {
    for (const file of pendingFiles) {
      await uploadFileAttachment(targetId, file);
    }
  }

  async function save(submit: boolean) {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      if (mode === "create") {
        const created = await createFile({ ...form, submit: false, metadata: {} });
        if (pendingFiles.length) await uploadPending(created.id);
        if (submit) await submitFile(created.id);
        setSuccess(submit ? t("files.submitSuccess") : t("files.createSuccess"));
        router.push(`/files/${created.id}`);
      } else if (fileId) {
        await updateFile(fileId, { ...form, metadata: {} });
        if (pendingFiles.length) await uploadPending(fileId);
        if (submit) {
          await submitFile(fileId);
          setSuccess(t("files.submitSuccess"));
        } else {
          setSuccess(t("files.createSuccess"));
        }
        router.push(`/files/${fileId}`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("files.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: FormEvent, submit: boolean) {
    e.preventDefault();
    await save(submit);
  }

  async function removeExistingAttachment(attachmentId: string) {
    if (!fileId) return;
    try {
      await deleteFileAttachment(fileId, attachmentId);
      setExisting((prev) =>
        prev
          ? {
              ...prev,
              attachments: prev.attachments.filter((a) => a.id !== attachmentId),
            }
          : prev,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("files.uploadFailed"));
    }
  }

  const backHref =
    mode === "edit" && fileId ? `/files/${fileId}` : "/files";

  const attachmentCount = pendingFiles.length + (existing?.attachments.length ?? 0);

  if (loading) {
    return <LoadingBlock message={t("files.loading")} />;
  }

  return (
    <Flex direction="column" gap="5">
      <Flex justify="between" align="start" gap="4" wrap="wrap">
        <Flex direction="column" gap="3" style={{ flex: 1, minWidth: 280 }}>
          <Button variant="ghost" size="2" asChild style={{ alignSelf: "flex-start", marginLeft: -8 }}>
            <Link href={backHref}>
              <ArrowLeftIcon />
              {mode === "create" ? t("files.backToList") : t("files.backToDetail")}
            </Link>
          </Button>
          <Box>
            <Heading size="7" mb="1" style={{ letterSpacing: "-0.02em" }}>
              {mode === "create" ? t("files.createTitle") : t("files.editTitle")}
            </Heading>
            <Text size="3" color="gray" style={{ lineHeight: 1.5 }}>
              {mode === "create" ? t("files.createDescription") : t("files.editDescription")}
            </Text>
          </Box>
          <Flex gap="2" wrap="wrap" align="center">
            <Badge size="2" color="gray" variant="soft">
              {t("files.statusValues.DRAFT")}
            </Badge>
            {existing?.referenceNumber && (
              <Badge size="1" variant="outline" color="gray">
                {existing.referenceNumber}
              </Badge>
            )}
          </Flex>
        </Flex>

        <Flex gap="2" wrap="wrap" align="center">
          <Button variant="soft" color="gray" asChild disabled={submitting}>
            <Link href={backHref}>{t("common.cancel")}</Link>
          </Button>
          <Button
            type="submit"
            form="file-form"
            variant="soft"
            disabled={submitting}
          >
            {submitting ? t("files.saving") : t("files.saveDraft")}
          </Button>
          <Button
            type="button"
            disabled={submitting}
            onClick={(e) => handleSubmit(e as unknown as FormEvent, true)}
          >
            {submitting ? t("files.saving") : t("files.saveAndSubmit")}
          </Button>
        </Flex>
      </Flex>

      {error && <StatusAlert variant="error" message={error} />}
      {success && <StatusAlert variant="success" message={success} />}

      <form id="file-form" onSubmit={(e) => handleSubmit(e, false)}>
        <Grid columns={{ initial: "1", lg: "3" }} gap="4">
          <Box gridColumn={{ lg: "span 2" }}>
            <Flex direction="column" gap="4">
              <Card size="3">
                <Flex align="center" gap="2" mb="4">
                  <LayersIcon />
                  <Text weight="bold" size="3">
                    {t("files.classificationSection")}
                  </Text>
                </Flex>
                <Grid columns={{ initial: "1", sm: "2" }} gap="4">
                  <FormField label={t("files.fileType")} required>
                    <Select.Root
                      value={form.fileTypeCode || undefined}
                      onValueChange={(v) => setForm((p) => ({ ...p, fileTypeCode: v }))}
                      required
                    >
                      <Select.Trigger placeholder={t("files.selectFileType")} />
                      <Select.Content>
                        {fileTypes.map((ft) => (
                          <Select.Item key={ft.id} value={ft.code}>
                            {ft.code} — {ft.name}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </FormField>
                  <FormField label={t("files.organization")} required>
                    <Select.Root
                      value={form.organizationId || undefined}
                      onValueChange={(v) => setForm((p) => ({ ...p, organizationId: v }))}
                      required
                    >
                      <Select.Trigger placeholder={t("files.selectOrganization")} />
                      <Select.Content>
                        {orgOptions.map((org) => (
                          <Select.Item key={org.id} value={org.id}>
                            {org.code} — {org.name}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </FormField>
                  <FormField label={t("files.priority")} required>
                    <Select.Root
                      value={form.priority}
                      onValueChange={(v) => setForm((p) => ({ ...p, priority: v as FilePriority }))}
                    >
                      <Select.Trigger />
                      <Select.Content>
                        {(["NORMAL", "URGENT", "VERY_URGENT"] as FilePriority[]).map((p) => (
                          <Select.Item key={p} value={p}>
                            {t(`files.priorityValues.${p}`)}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </FormField>
                  <FormField label={t("files.receivedAt")} required>
                    <TextField.Root
                      type="date"
                      value={form.receivedAt}
                      onChange={(e) => setForm((p) => ({ ...p, receivedAt: e.target.value }))}
                      required
                    />
                  </FormField>
                </Grid>
              </Card>

              <Card size="3">
                <Flex align="center" gap="2" mb="4">
                  <FileTextIcon />
                  <Text weight="bold" size="3">
                    {t("files.identificationSection")}
                  </Text>
                </Flex>
                <Flex direction="column" gap="4">
                  <FormField label={t("files.subject")} required>
                    <TextArea
                      value={form.subject}
                      onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                      required
                      maxLength={500}
                      rows={3}
                      placeholder={t("files.subjectPlaceholder")}
                    />
                  </FormField>
                  <FormField label={t("files.senderOrBeneficiary")} required>
                    <TextField.Root
                      value={form.senderOrBeneficiary}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, senderOrBeneficiary: e.target.value }))
                      }
                      required
                      maxLength={255}
                      placeholder={t("files.beneficiaryPlaceholder")}
                    />
                  </FormField>
                </Flex>
              </Card>

              <Card size="3">
                <Flex align="center" justify="between" gap="2" mb="4" wrap="wrap">
                  <Flex align="center" gap="2">
                    <UploadIcon />
                    <Text weight="bold" size="3">
                      {t("files.attachmentsTab")}
                    </Text>
                    {attachmentCount > 0 && (
                      <Badge variant="soft" color="gray" size="1">
                        {attachmentCount}
                      </Badge>
                    )}
                  </Flex>
                  <Button
                    type="button"
                    variant="soft"
                    size="1"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <UploadIcon />
                    {t("files.upload")}
                  </Button>
                </Flex>

                <Box
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragOver ? "var(--accent-8)" : "var(--gray-a7)"}`,
                    borderRadius: "var(--radius-3)",
                    padding: "var(--space-5)",
                    textAlign: "center",
                    cursor: "pointer",
                    background: dragOver ? "var(--accent-a2)" : "var(--gray-a2)",
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                >
                  <Flex direction="column" align="center" gap="2">
                    <UploadIcon width={24} height={24} color="var(--gray-11)" />
                    <Text size="2" weight="medium">
                      {t("files.dropFilesHint")}
                    </Text>
                    <Text size="1" color="gray">
                      {t("files.maxSize")}
                    </Text>
                  </Flex>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={ACCEPTED_TYPES}
                    hidden
                    onChange={(e) => onFilePick(e.target.files)}
                  />
                </Box>

                {(pendingFiles.length > 0 || (existing?.attachments.length ?? 0) > 0) && (
                  <Flex direction="column" gap="2" mt="4">
                    {pendingFiles.map((f, i) => (
                      <PendingFileRow
                        key={`${f.name}-${i}`}
                        name={f.name}
                        size={f.size}
                        onRemove={() => setPendingFiles((p) => p.filter((_, idx) => idx !== i))}
                      />
                    ))}
                    {existing?.attachments.map((a) => (
                      <PendingFileRow
                        key={a.id}
                        name={a.originalFilename}
                        size={a.sizeBytes}
                        onRemove={() => removeExistingAttachment(a.id)}
                      />
                    ))}
                  </Flex>
                )}
              </Card>
            </Flex>
          </Box>

          <Flex
            direction="column"
            gap="4"
            style={{ alignSelf: "start", position: "sticky", top: "var(--space-4)" }}
          >
            <Card size="3">
              <Flex align="center" gap="2" mb="3">
                <InfoCircledIcon />
                <Text weight="bold" size="3">
                  {t("files.summarySection")}
                </Text>
              </Flex>
              <Table.Root variant="surface" size="1">
                <Table.Body>
                  <SummaryRow
                    label={t("files.fileType")}
                    value={
                      selectedFileType
                        ? `${selectedFileType.code} — ${selectedFileType.name}`
                        : "—"
                    }
                  />
                  <SummaryRow
                    label={t("files.organization")}
                    value={selectedOrg ? `${selectedOrg.code} — ${selectedOrg.name}` : "—"}
                  />
                  <SummaryRow
                    label={t("files.priority")}
                    value={<FilePriorityBadge priority={form.priority} />}
                  />
                  <SummaryRow
                    label={t("files.receivedAt")}
                    value={form.receivedAt || "—"}
                  />
                  <SummaryRow
                    label={t("files.subject")}
                    value={form.subject.trim() || "—"}
                  />
                  <SummaryRow
                    label={t("files.senderOrBeneficiary")}
                    value={form.senderOrBeneficiary.trim() || "—"}
                  />
                  <SummaryRow
                    label={t("files.attachmentsTab")}
                    value={attachmentCount > 0 ? String(attachmentCount) : "—"}
                  />
                </Table.Body>
              </Table.Root>
            </Card>

            <Card size="3" variant="surface">
              <Flex direction="column" gap="2">
                <Text weight="bold" size="2">
                  {t("files.createHintTitle")}
                </Text>
                <Text size="2" color="gray" style={{ lineHeight: 1.6 }}>
                  {t("files.createHint")}
                </Text>
              </Flex>
            </Card>
          </Flex>
        </Grid>
      </form>
    </Flex>
  );
}
