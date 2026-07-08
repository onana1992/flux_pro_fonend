"use client";

import Link from "next/link";
import { Button, Card, Table, Text } from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import type { User } from "@/lib/types";
import { PaginationBar } from "@/components/ui/shared";

export function UsersTable({
  users,
  page,
  totalPages,
  totalElements,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  users: User[];
  page: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const { t } = useTranslation();

  return (
    <Card size="2">
      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>{t("admin.users.matricule")}</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>{t("admin.users.lastName")}</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>{t("admin.users.firstName")}</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>{t("admin.users.email")}</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>{t("admin.users.jobTitle")}</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>{t("admin.users.organisation")}</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>{t("admin.users.status")}</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {users.map((u) => (
            <Table.Row key={u.id}>
              <Table.Cell>
                <Text size="2">{u.staffNumber}</Text>
              </Table.Cell>
              <Table.Cell>
                <Text size="2">{u.lastName}</Text>
              </Table.Cell>
              <Table.Cell>
                <Text size="2">{u.firstName}</Text>
              </Table.Cell>
              <Table.Cell>
                <Text size="2">{u.email}</Text>
              </Table.Cell>
              <Table.Cell>
                <Text size="2">{u.jobTitle ?? "—"}</Text>
              </Table.Cell>
              <Table.Cell>
                <Text size="2">{u.organization.code}</Text>
              </Table.Cell>
              <Table.Cell>
                <Text size="2">{u.active ? t("common.active") : t("common.inactive")}</Text>
              </Table.Cell>
              <Table.Cell>
                <Button asChild variant="soft" size="1">
                  <Link href={`/admin/users/${u.id}`}>{t("admin.users.view")}</Link>
                </Button>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
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
