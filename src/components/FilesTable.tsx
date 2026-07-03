"use client";

import Link from "next/link";
import { Badge, Box, Button, Card, Flex, Table, Text } from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import { hasPermission } from "@/lib/auth-storage";
import type { FilePriority, FileStatus, FileSummary, UserProfile } from "@/lib/types";
import { PaginationBar } from "@/components/ui/shared";

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

function priorityColor(priority: FilePriority): "gray" | "orange" | "red" {
  switch (priority) {
    case "NORMAL":
      return "gray";
    case "URGENT":
      return "orange";
    case "VERY_URGENT":
      return "red";
    default:
      return "gray";
  }
}

export function FilePriorityBadge({ priority }: { priority: FilePriority }) {
  const { t } = useTranslation();
  return (
    <Badge color={priorityColor(priority)} variant="soft" size="1">
      {t(`files.priorityValues.${priority}`)}
    </Badge>
  );
}

export function FilesTable({
  files,
  user,
  page,
  totalPages,
  totalElements,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  files: FileSummary[];
  user: UserProfile | null;
  page: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const { t } = useTranslation();
  const canUpdate = hasPermission(user, "FILES:UPDATE");

  return (
    <Card size="2">
      <Box style={{ overflowX: "auto" }}>
        <Table.Root variant="surface">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>{t("files.referenceNumber")}</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell style={{ minWidth: 240 }}>
                {t("files.subject")}
              </Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>{t("files.fileType")}</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>{t("files.priority")}</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>{t("files.status")}</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>{t("files.receivedAt")}</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>{t("files.organization")}</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {files.map((file) => (
              <Table.Row key={file.id}>
                <Table.Cell>
                  {file.referenceNumber ? (
                    <Text size="2" weight="medium" style={{ whiteSpace: "nowrap" }}>
                      {file.referenceNumber}
                    </Text>
                  ) : (
                    <Text size="2" color="gray" style={{ fontStyle: "italic", whiteSpace: "nowrap" }}>
                      {t("files.draftReference")}
                    </Text>
                  )}
                </Table.Cell>
                <Table.Cell style={{ minWidth: 240, maxWidth: 320 }}>
                  <Text size="2" style={{ wordBreak: "break-word", whiteSpace: "normal" }}>
                    {file.subject}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="2" style={{ whiteSpace: "nowrap" }}>
                    {file.fileTypeCode}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <FilePriorityBadge priority={file.priority} />
                </Table.Cell>
                <Table.Cell>
                  <Badge color={statusColor(file.status)} variant="soft" size="1">
                    {t(`files.statusValues.${file.status}`)}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <Text size="2" style={{ whiteSpace: "nowrap" }}>
                    {file.receivedAt}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="2" style={{ whiteSpace: "nowrap" }}>
                    {file.organizationCode}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Flex gap="2" justify="end" wrap="nowrap">
                    <Button asChild variant="soft" size="1">
                      <Link href={`/files/${file.id}`}>{t("files.view")}</Link>
                    </Button>
                    {file.status === "DRAFT" && canUpdate && (
                      <Button asChild variant="outline" size="1">
                        <Link href={`/files/${file.id}/edit`}>{t("files.edit")}</Link>
                      </Button>
                    )}
                  </Flex>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>
      <PaginationBar
        page={page}
        totalPages={totalPages}
        totalElements={totalElements}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </Card>
  );
}
