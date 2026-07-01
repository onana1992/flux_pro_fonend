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
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <Flex justify="between" align="start" gap="4" mb="6" wrap="wrap">
      <Box>
        <Heading size="6">{title}</Heading>
        {description && (
          <Text size="2" color="gray" mt="1">
            {description}
          </Text>
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
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  const { t } = useTranslation();
  const total = Math.max(totalPages, 1);
  return (
    <Flex justify="between" align="center" pt="4" mt="4" style={{ borderTop: "1px solid var(--gray-a5)" }}>
      <Text size="2" color="gray">
        {t("pagination.page", { current: page + 1, total })}
      </Text>
      <Flex gap="2">
        <Button variant="soft" disabled={page === 0} onClick={() => onPageChange(page - 1)}>
          {t("pagination.prev")}
        </Button>
        <Button
          variant="soft"
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
