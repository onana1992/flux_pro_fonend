"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Callout,
  Card,
  Flex,
  Heading,
  Text,
  TextField,
} from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/components/AuthProvider";
import { ApiError, changePassword } from "@/lib/api";
import { saveAuth, getRefreshToken, getAccessToken } from "@/lib/auth-storage";

export default function ChangePasswordPage() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!user.mustChangePassword) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  if (!user || !user.mustChangePassword) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError(t("changePassword.mismatch"));
      return;
    }
    setSubmitting(true);
    try {
      const profile = await changePassword(currentPassword, newPassword);
      const accessToken = getAccessToken();
      const refreshToken = getRefreshToken();
      if (accessToken && refreshToken) {
        saveAuth({ accessToken, refreshToken, user: profile });
      }
      await refreshUser();
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.connectionFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Flex align="center" justify="center" style={{ minHeight: "100vh", background: "var(--gray-2)" }} p="6">
      <Card size="4" style={{ width: "100%", maxWidth: 440 }}>
        <Heading size="6" mb="1">
          {t("changePassword.title")}
        </Heading>
        <Text size="2" color="gray" mb="5">
          {t("changePassword.subtitle")}
        </Text>
        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="4">
            <Box>
              <Text as="label" size="2" weight="medium" mb="1">
                {t("changePassword.current")}
              </Text>
              <TextField.Root
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </Box>
            <Box>
              <Text as="label" size="2" weight="medium" mb="1">
                {t("changePassword.new")}
              </Text>
              <TextField.Root
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </Box>
            <Box>
              <Text as="label" size="2" weight="medium" mb="1">
                {t("changePassword.confirm")}
              </Text>
              <TextField.Root
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </Box>
            {error && (
              <Callout.Root color="red">
                <Callout.Text>{error}</Callout.Text>
              </Callout.Root>
            )}
            <Button type="submit" disabled={submitting}>
              {submitting ? t("changePassword.submitting") : t("changePassword.submit")}
            </Button>
          </Flex>
        </form>
      </Card>
    </Flex>
  );
}
