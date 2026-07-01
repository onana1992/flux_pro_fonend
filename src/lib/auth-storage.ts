import type { UserProfile } from "./types";

const ACCESS_KEY = "fluxpro_access_token";
const REFRESH_KEY = "fluxpro_refresh_token";
const USER_KEY = "fluxpro_user";

export function saveAuth(data: {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}) {
  localStorage.setItem(ACCESS_KEY, data.accessToken);
  localStorage.setItem(REFRESH_KEY, data.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
}

export function clearAuth() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function getStoredUser(): UserProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function canAccessAdmin(role?: string): boolean {
  return role === "SUPER_ADMIN" || role === "BUSINESS_ADMIN";
}

export function canReadUsers(role?: string): boolean {
  return (
    canAccessAdmin(role) ||
    role === "DIRECTOR" ||
    role === "SERVICE_HEAD" ||
    role === "REGIONAL_DIRECTOR"
  );
}

export function canWriteUsers(role?: string): boolean {
  return canAccessAdmin(role);
}

export function isSuperAdmin(role?: string): boolean {
  return role === "SUPER_ADMIN";
}
