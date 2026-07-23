"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ApiError, getPublicTenantConfig } from "@/lib/api";
import type { TenantConfig } from "@/lib/types";

const FALLBACK: TenantConfig = {
  tenantName: "MINTP Cameroun",
  productName: "FluxPro",
  timezone: "Africa/Douala",
  countryCode: "CM",
  referencePrefix: "MINTP",
  badge: "Déploiement pilote · MINTP Cameroun",
  fromAddress: "alertes@mintp.cm",
  emailRedirectTo: null,
};

type TenantContextValue = {
  config: TenantConfig;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const TenantContext = createContext<TenantContextValue>({
  config: FALLBACK,
  loading: true,
  error: null,
  refresh: async () => {},
});

export function TenantProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<TenantConfig>(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await getPublicTenantConfig();
      setConfig(next);
      setError(null);
      if (typeof document !== "undefined") {
        document.title = `${next.productName} — ${next.tenantName}`;
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tenant config unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ config, loading, error, refresh }),
    [config, loading, error, refresh],
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  return useContext(TenantContext);
}
