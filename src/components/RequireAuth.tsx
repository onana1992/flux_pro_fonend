"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Flex, Spinner, Text } from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/components/AuthProvider";
import { canReadUsers } from "@/lib/auth-storage";

export function RequireAuth({
  children,
  admin = false,
  userRead = false,
  superAdmin = false,
}: {
  children: React.ReactNode;
  admin?: boolean;
  userRead?: boolean;
  superAdmin?: boolean;
}) {
  const { t } = useTranslation();
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.mustChangePassword && !window.location.pathname.startsWith("/change-password")) {
      router.replace("/change-password");
      return;
    }
    if (superAdmin && user.role !== "SUPER_ADMIN") {
      router.replace("/dashboard");
      return;
    }
    if (admin && !isAdmin) {
      router.replace("/dashboard");
      return;
    }
    if (userRead && !canReadUsers(user.role)) {
      router.replace("/dashboard");
    }
  }, [user, loading, admin, userRead, superAdmin, isAdmin, router]);

  if (loading && !user) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: "100vh", background: "var(--gray-2)" }}>
        <Flex direction="column" align="center" gap="3">
          <Spinner size="3" />
          <Text size="2" color="gray">
            {t("common.sessionCheck")}
          </Text>
        </Flex>
      </Flex>
    );
  }

  if (!user) return null;
  if (user.mustChangePassword && typeof window !== "undefined" && !window.location.pathname.startsWith("/change-password")) {
    return null;
  }
  if (superAdmin && user.role !== "SUPER_ADMIN") return null;
  if (admin && !isAdmin) return null;
  if (userRead && !canReadUsers(user.role)) return null;

  return <>{children}</>;
}
