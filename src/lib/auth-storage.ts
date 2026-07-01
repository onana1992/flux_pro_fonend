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
    const user = JSON.parse(raw) as UserProfile;
    return {
      ...user,
      roles: user.roles ?? (user.role ? [user.role] : []),
      permissions: user.permissions ?? [],
    };
  } catch {
    return null;
  }
}

export function hasPermission(user: UserProfile | null | undefined, permission: string): boolean {
  return user?.permissions?.includes(permission) ?? false;
}

export function canAccessAdmin(user?: UserProfile | null): boolean {
  if (!user) return false;
  return (
    hasPermission(user, "ORGANIZATIONS:UPDATE") ||
    hasPermission(user, "USERS:UPDATE") ||
    user.role === "SUPER_ADMIN" ||
    user.role === "BUSINESS_ADMIN"
  );
}

export function canReadUsers(user?: UserProfile | null): boolean {
  if (!user) return false;
  return (
    hasPermission(user, "USERS:READ") ||
    user.role === "SUPER_ADMIN" ||
    user.role === "BUSINESS_ADMIN" ||
    user.role === "DIRECTOR" ||
    user.role === "SERVICE_HEAD" ||
    user.role === "REGIONAL_DIRECTOR"
  );
}

export function canWriteUsers(user?: UserProfile | null): boolean {
  if (!user) return false;
  return hasPermission(user, "USERS:CREATE") || hasPermission(user, "USERS:UPDATE") || canAccessAdmin(user);
}

export function isSuperAdmin(user?: UserProfile | null): boolean {
  if (!user) return false;
  return user.role === "SUPER_ADMIN" || hasPermission(user, "LOGIN_AUDIT:READ");
}

/** @deprecated use isSuperAdmin(user) */
export function isSuperAdminRole(role?: string): boolean {
  return role === "SUPER_ADMIN";
}

/** @deprecated use canReadUsers(user) */
export function canReadUsersRole(role?: string): boolean {
  return (
    role === "SUPER_ADMIN" ||
    role === "BUSINESS_ADMIN" ||
    role === "DIRECTOR" ||
    role === "SERVICE_HEAD" ||
    role === "REGIONAL_DIRECTOR"
  );
}

/** @deprecated use canAccessAdmin(user) */
export function canAccessAdminRole(role?: string): boolean {
  return role === "SUPER_ADMIN" || role === "BUSINESS_ADMIN";
}
