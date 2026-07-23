"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getMe, login as apiLogin, logout as apiLogout } from "@/lib/api";
import {
  canAccessAdmin,
  clearAuth,
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  saveAuth,
} from "@/lib/auth-storage";
import { onSessionExpired } from "@/lib/session-events";
import type { UserProfile } from "@/lib/types";

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  /** Vrai juste après une expiration de session détectée (401 non récupérable). */
  sessionExpired: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  /** Met à jour le profil en mémoire après un changement de mot de passe (tokens déjà sauvegardés). */
  applySession: (profile: UserProfile) => void;
  /** À appeler une fois la notification de session expirée affichée à l'utilisateur. */
  clearSessionExpired: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  const refreshUser = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null);
      return;
    }
    try {
      const me = await getMe();
      setUser(me);
      const token = getAccessToken();
      const refresh = getRefreshToken();
      if (token && refresh) {
        saveAuth({ accessToken: token, refreshToken: refresh, user: me });
      }
    } catch {
      clearAuth();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const token = getAccessToken();
    const stored = getStoredUser();
    if (token && stored) {
      setUser(stored);
      void refreshUser();
    }
    setLoading(false);
  }, [refreshUser]);

  // Écoute les 401 non récupérables signalés par `apiFetch` (cf. src/lib/api.ts) :
  // la session est purgée côté client et une notification est affichée sur /login
  // (via `sessionExpired`), la redirection étant naturellement déclenchée par
  // `RequireAuth` dès que `user` devient `null`.
  useEffect(() => {
    return onSessionExpired(() => {
      setUser(null);
      setSessionExpired(true);
    });
  }, []);

  const login = useCallback(async (email: string, password: string, remember = false) => {
    const data = await apiLogin(email, password, remember);
    setUser(data.user);
    setSessionExpired(false);
    return data.user;
  }, []);

  const applySession = useCallback((profile: UserProfile) => {
    setUser(profile);
    setSessionExpired(false);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  const clearSessionExpired = useCallback(() => {
    setSessionExpired(false);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAdmin: canAccessAdmin(user),
      sessionExpired,
      login,
      logout,
      refreshUser,
      applySession,
      clearSessionExpired,
    }),
    [user, loading, sessionExpired, login, logout, refreshUser, applySession, clearSessionExpired],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
