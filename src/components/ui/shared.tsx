"use client";

import {
  Badge,
  Box,
  Button,
  Callout,
  Flex,
  Heading,
  Spinner,
  Text,
} from "@radix-ui/themes";
import { ReactNode } from "react";
import { useTranslation } from "react-i18next";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <Flex justify="between" align="start" gap="4" mb="6" wrap="wrap">
      <Box>
        <Heading size="6">{title}</Heading>
        {description != null && (
          <Box mt="1">
            {typeof description === "string" ? (
              <Text size="2" color="gray">
                {description}
              </Text>
            ) : (
              description
            )}
          </Box>
        )}
      </Box>
      {actions && (
        <Flex gap="2" wrap="wrap">
          {actions}
        </Flex>
      )}
    </Flex>
  );
}

export function StatusAlert({
  message,
  variant = "error",
}: {
  message: string;
  variant?: "error" | "success" | "info";
}) {
  const color = variant === "error" ? "red" : variant === "success" ? "green" : "blue";
  return (
    <Callout.Root color={color} mb="4">
      <Callout.Text>{message}</Callout.Text>
    </Callout.Root>
  );
}

export function LoadingBlock({ message }: { message?: string }) {
  const { t } = useTranslation();
  const text = message ?? t("common.loading");
  return (
    <Flex direction="column" align="center" justify="center" py="9" gap="3">
      <Spinner size="3" />
      <Text size="2" color="gray">
        {text}
      </Text>
    </Flex>
  );
}

export function EmptyBlock({ title, description }: { title: string; description?: string }) {
  return (
    <Flex direction="column" align="center" py="9" gap="2">
      <Text size="3" weight="medium">
        {title}
      </Text>
      {description && (
        <Text size="2" color="gray" align="center">
          {description}
        </Text>
      )}
    </Flex>
  );
}

export function PaginationBar({
  page,
  totalPages,
  totalElements,
  pageSize = 20,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  totalPages: number;
  totalElements?: number;
  pageSize?: number;
  onPageChange: (p: number) => void;
  onPageSizeChange?: (size: number) => void;
}) {
  const { t } = useTranslation();
  const from = totalElements === 0 ? 0 : page * pageSize + 1;
  const to =
    totalElements != null
      ? Math.min((page + 1) * pageSize, totalElements)
      : (page + 1) * pageSize;

  return (
    <Flex
      justify="between"
      align="center"
      gap="3"
      wrap="wrap"
      pt="4"
      mt="4"
      style={{ borderTop: "1px solid var(--gray-a5)" }}
    >
      <Text size="2" color="gray">
        {totalElements != null
          ? t("pagination.range", { from, to, total: totalElements })
          : t("pagination.page", { current: page + 1, total: Math.max(totalPages, 1) })}
      </Text>
      <Flex gap="2" align="center">
        {onPageSizeChange && (
          <Flex gap="1">
            {[10, 20, 50].map((size) => (
              <Button
                key={size}
                size="1"
                variant={pageSize === size ? "solid" : "outline"}
                onClick={() => onPageSizeChange(size)}
              >
                {size}
              </Button>
            ))}
          </Flex>
        )}
        <Button variant="soft" size="1" disabled={page === 0} onClick={() => onPageChange(page - 1)}>
          {t("pagination.prev")}
        </Button>
        <Button
          variant="soft"
          size="1"
          disabled={page + 1 >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          {t("pagination.next")}
        </Button>
      </Flex>
    </Flex>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const superRoles = ["SUPER_ADMIN", "BUSINESS_ADMIN"];
  const directionRoles = ["DIRECTOR", "REGIONAL_DIRECTOR", "EXECUTIVE_OFFICE", "SECRETARY_GENERAL"];
  let color: "purple" | "blue" | "green" | "gray" = "gray";
  if (superRoles.includes(role)) color = "purple";
  else if (directionRoles.includes(role)) color = "blue";
  else if (role === "AGENT") color = "green";
  return (
    <Badge color={color} variant="soft" size="1">
      {role.replace(/_/g, " ")}
    </Badge>
  );
}

export function FileImportButton({
  label,
  onChange,
}: {
  label: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <Button asChild>
      <label style={{ cursor: "pointer" }}>
        {label}
        <input type="file" accept=".csv" hidden onChange={onChange} />
      </label>
    </Button>
  );
}
