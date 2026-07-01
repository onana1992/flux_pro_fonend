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
import { FileTextIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/components/AuthProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const { t } = useTranslation();
  const { login, user } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("e.fotso@mintp.cm");
  const [password, setPassword] = useState("Mintp@2025");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  if (user) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.connectionFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Flex style={{ minHeight: "100vh" }}>
      <Flex
        direction="column"
        justify="between"
        p="9"
        display={{ initial: "none", lg: "flex" }}
        style={{
          width: "50%",
          background: "var(--accent-9)",
          color: "white",
        }}
      >
        <Flex align="center" gap="3">
          <Flex
            align="center"
            justify="center"
            style={{ width: 40, height: 40, borderRadius: 8, background: "rgba(255,255,255,0.2)" }}
          >
            <FileTextIcon width={22} height={22} />
          </Flex>
          <Heading size="6" style={{ color: "white" }}>
            FluxPro
          </Heading>
        </Flex>
        <Box>
          <Heading size="8" mb="4" style={{ color: "white", lineHeight: 1.2 }}>
            {t("login.heroTitle")}
          </Heading>
          <Text size="3" style={{ color: "rgba(255,255,255,0.85)", maxWidth: 420 }}>
            {t("login.heroSubtitle")}
          </Text>
        </Box>
        <Text size="2" style={{ color: "rgba(255,255,255,0.6)" }}>
          {t("login.copyright")}
        </Text>
      </Flex>

      <Flex align="center" justify="center" p="6" style={{ flex: 1, background: "var(--gray-2)", position: "relative" }}>
        <Box style={{ position: "absolute", top: "1.5rem", right: "1.5rem" }}>
          <LanguageSwitcher variant="standalone" />
        </Box>
        <Box style={{ width: "100%", maxWidth: 420 }}>
          <Flex align="center" gap="2" mb="6" display={{ lg: "none" }}>
            <Flex
              align="center"
              justify="center"
              style={{ width: 36, height: 36, borderRadius: 8, background: "var(--accent-9)", color: "white" }}
            >
              <FileTextIcon />
            </Flex>
            <Heading size="5">FluxPro</Heading>
          </Flex>

          <Card size="4">
            <Heading size="6" mb="1">
              {t("login.title")}
            </Heading>
            <Text size="2" color="gray" mb="5">
              {t("login.subtitle")}
            </Text>

            <form onSubmit={handleSubmit}>
              <Flex direction="column" gap="4">
                <Box>
                  <Text as="label" size="2" weight="medium" mb="1">
                    {t("login.email")} <Text color="red">*</Text>
                  </Text>
                  <TextField.Root
                    type="email"
                    required
                    placeholder={t("login.emailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    size="3"
                  />
                </Box>
                <Box>
                  <Text as="label" size="2" weight="medium" mb="1">
                    {t("login.password")} <Text color="red">*</Text>
                  </Text>
                  <TextField.Root
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    size="3"
                  />
                </Box>

                {error && (
                  <Callout.Root color="red">
                    <Callout.Text>{error}</Callout.Text>
                  </Callout.Root>
                )}

                <Button type="submit" size="3" disabled={submitting} style={{ width: "100%" }}>
                  {submitting ? t("login.submitting") : t("login.submit")}
                </Button>
              </Flex>
            </form>

            <Text size="1" color="gray" align="center" mt="5">
              {t("login.demo")}
            </Text>
          </Card>
        </Box>
      </Flex>
    </Flex>
  );
}
