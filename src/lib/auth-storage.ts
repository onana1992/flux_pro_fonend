import type { UserProfile } from "./types";

const ACCESS_KEY = "fluxpro_access_token";
const REFRESH_KEY = "fluxpro_refresh_token";
const USER_KEY = "fluxpro_user";
/** Préférence « Remember me » (toujours en localStorage pour survivre aux rechargements). */
const PERSIST_KEY = "fluxpro_auth_persist";
const REMEMBERED_EMAIL_KEY = "fluxpro_remembered_email";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** True si la session courante (ou la dernière préférence) est persistante. */
export function isAuthPersistent(): boolean {
  if (!isBrowser()) return false;
  if (sessionStorage.getItem(ACCESS_KEY)) return false;
  if (localStorage.getItem(ACCESS_KEY)) return true;
  return localStorage.getItem(PERSIST_KEY) === "1";
}

function authStore(remember?: boolean): Storage {
  const persistent = remember ?? isAuthPersistent();
  return persistent ? localStorage : sessionStorage;
}

function clearStore(store: Storage) {
  store.removeItem(ACCESS_KEY);
  store.removeItem(REFRESH_KEY);
  store.removeItem(USER_KEY);
}

/**
 * Persiste la session.
 * - `remember: true` → localStorage (survit à la fermeture du navigateur)
 * - `remember: false` → sessionStorage (effacé à la fermeture de l’onglet)
 * - omis → conserve le mode de stockage actuel
 */
export function saveAuth(
  data: {
    accessToken: string;
    refreshToken: string;
    user: UserProfile;
  },
  options?: { remember?: boolean; email?: string },
) {
  const remember = options?.remember ?? isAuthPersistent();
  const store = authStore(remember);
  const other = remember ? sessionStorage : localStorage;

  clearStore(other);
  store.setItem(ACCESS_KEY, data.accessToken);
  store.setItem(REFRESH_KEY, data.refreshToken);
  store.setItem(USER_KEY, JSON.stringify(data.user));

  if (remember) {
    localStorage.setItem(PERSIST_KEY, "1");
    if (options?.email) {
      localStorage.setItem(REMEMBERED_EMAIL_KEY, options.email.trim().toLowerCase());
    }
  } else {
    localStorage.removeItem(PERSIST_KEY);
    localStorage.removeItem(REMEMBERED_EMAIL_KEY);
  }
}

export function clearAuth() {
  if (!isBrowser()) return;
  clearStore(localStorage);
  clearStore(sessionStorage);
  // Conserve l’email mémorisé si « Remember me » était actif (préremplissage login).
  // PERSIST_KEY / email sont nettoyés uniquement au login sans remember.
}

export function getAccessToken(): string | null {
  if (!isBrowser()) return null;
  return sessionStorage.getItem(ACCESS_KEY) ?? localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (!isBrowser()) return null;
  return sessionStorage.getItem(REFRESH_KEY) ?? localStorage.getItem(REFRESH_KEY);
}

export function getStoredUser(): UserProfile | null {
  if (!isBrowser()) return null;
  const raw = sessionStorage.getItem(USER_KEY) ?? localStorage.getItem(USER_KEY);
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

export function getRememberedEmail(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(REMEMBERED_EMAIL_KEY);
}

export function hasRememberedLogin(): boolean {
  if (!isBrowser()) return false;
  return localStorage.getItem(PERSIST_KEY) === "1" && Boolean(getRememberedEmail());
}

export function hasPermission(user: UserProfile | null | undefined, permission: string): boolean {
  return user?.permissions?.includes(permission) ?? false;
}

/** Visible dans la nav si permission JWT présente ou rôle enum connu (avant hydratation /me). */
export function canSeePermission(user: UserProfile | null | undefined, permission: string): boolean {
  if (!user) return false;
  if (hasPermission(user, permission)) return true;

  return switchPermissionByRole(user.role, permission);
}

function switchPermissionByRole(role: UserProfile["role"], permission: string): boolean {
  switch (permission) {
    case "ROLES:READ":
    case "PERMISSIONS:READ":
    case "ORGANIZATIONS:READ":
    case "ORGANIZATIONS:UPDATE":
    case "ORGANIZATION_TYPES:READ":
    case "ORGANIZATION_TYPES:UPDATE":
      return role === "SUPER_ADMIN" || role === "BUSINESS_ADMIN";
    case "USERS:READ":
      return (
        role === "SUPER_ADMIN" ||
        role === "BUSINESS_ADMIN" ||
        role === "DIRECTOR" ||
        role === "SERVICE_HEAD" ||
        role === "REGIONAL_DIRECTOR" ||
        role === "READER"
      );
    case "LOGIN_AUDIT:READ":
      return role === "SUPER_ADMIN";
    case "CHAIN_TEMPLATES:READ":
      return true;
    case "CHAIN_TEMPLATES:CREATE":
    case "CHAIN_TEMPLATES:UPDATE":
      return role === "SUPER_ADMIN" || role === "BUSINESS_ADMIN";
    case "CHAIN_TEMPLATES:DELETE":
      return role === "SUPER_ADMIN";
    case "FILE_TYPES:READ":
      return true;
    case "FILE_TYPES:CREATE":
    case "FILE_TYPES:UPDATE":
    case "FILE_TYPES:DELETE":
      return role === "SUPER_ADMIN" || role === "BUSINESS_ADMIN";
    case "FILES:READ":
      return true;
    case "FILES:CREATE":
    case "FILES:UPDATE":
    case "FILES:TRANSMIT":
      return (
        role === "SUPER_ADMIN" ||
        role === "BUSINESS_ADMIN" ||
        role === "DIRECTOR" ||
        role === "SERVICE_HEAD" ||
        role === "REGIONAL_DIRECTOR" ||
        role === "AGENT" ||
        role === "SUPPORT"
      );
    case "FILES:CLOSE":
      return (
        role === "SUPER_ADMIN" ||
        role === "BUSINESS_ADMIN" ||
        role === "DIRECTOR" ||
        role === "REGIONAL_DIRECTOR"
      );
    case "FILES:ARCHIVE":
      return role === "SUPER_ADMIN" || role === "BUSINESS_ADMIN" || role === "DIRECTOR";
    case "FILES:DELETE":
      return role === "SUPER_ADMIN";
    case "ALERT_TYPES:READ":
    case "ALERT_RULES:READ":
      return (
        role === "SUPER_ADMIN" ||
        role === "BUSINESS_ADMIN" ||
        role === "DIRECTOR" ||
        role === "SERVICE_HEAD" ||
        role === "REGIONAL_DIRECTOR" ||
        role === "SECRETARY_GENERAL" ||
        role === "EXECUTIVE_OFFICE"
      );
    case "ALERT_TYPES:CREATE":
    case "ALERT_TYPES:UPDATE":
    case "ALERT_TYPES:DELETE":
    case "ALERT_RULES:CREATE":
    case "ALERT_RULES:UPDATE":
    case "ALERT_RULES:DELETE":
      return role === "SUPER_ADMIN" || role === "BUSINESS_ADMIN";
    case "DASHBOARD:READ":
      return true;
    case "DASHBOARD:EXPORT":
      return (
        role === "SUPER_ADMIN" ||
        role === "BUSINESS_ADMIN" ||
        role === "DIRECTOR" ||
        role === "SERVICE_HEAD" ||
        role === "REGIONAL_DIRECTOR" ||
        role === "SECRETARY_GENERAL" ||
        role === "EXECUTIVE_OFFICE"
      );
    default:
      return false;
  }
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
