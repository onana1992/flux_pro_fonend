"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Flex, Spinner, Text } from "@radix-ui/themes";
import { getAccessToken } from "@/lib/auth-storage";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(getAccessToken() ? "/dashboard" : "/login");
  }, [router]);

  return (
    <Flex align="center" justify="center" style={{ minHeight: "100vh" }}>
      <Flex direction="column" align="center" gap="3">
        <Spinner size="3" />
        <Text size="2" color="gray">
          Redirection…
        </Text>
      </Flex>
    </Flex>
  );
}
