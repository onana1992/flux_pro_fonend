import type {
  ImportResult,
  LoginAuditEntry,
  OrganizationSummary,
  OrganizationTreeNode,
  OrganizationType,
  OrganizationTypeRequest,
  PageResponse,
  TokenResponse,
  User,
  UserProfile,
  UserRole,
} from "./types";
import {
  clearAuth,
  getAccessToken,
  getRefreshToken,
  saveAuth,
} from "./auth-storage";
import i18n from "@/i18n/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const REQUEST_TIMEOUT_MS = 8_000;

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  try {
    return await fetch(url, {
      ...options,
      signal: options.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new ApiError(i18n.t("api.timeout"), 408);
    }
    if (error instanceof TypeError) {
      throw new ApiError(i18n.t("api.networkError"), 0);
    }
    throw error;
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: string,
  ) {
    super(message);
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body.detail ?? body.title ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  const res = await fetchWithTimeout(`${API_URL}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    clearAuth();
    return null;
  }
  const data = (await res.json()) as TokenResponse;
  saveAuth(data);
  return data.accessToken;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetchWithTimeout(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401 && retry && getRefreshToken()) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return apiFetch<T>(path, options, false);
    }
  }

  if (!res.ok) {
    const detail = await parseError(res);
    throw new ApiError(detail, res.status, detail);
  }

  if (res.status === 204 || res.status === 205) {
    return undefined as T;
  }

  const text = await res.text();
  if (!text.trim()) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  const res = await fetchWithTimeout(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new ApiError(await parseError(res), res.status);
  }
  const data = (await res.json()) as TokenResponse;
  saveAuth(data);
  return data;
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken) {
      await apiFetch<void>("/api/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
    }
  } finally {
    clearAuth();
  }
}

export async function getMe(): Promise<UserProfile> {
  return apiFetch<UserProfile>("/api/users/me");
}

export async function getOrganizationTree(): Promise<OrganizationTreeNode[]> {
  return apiFetch<OrganizationTreeNode[]>("/api/organizations/tree");
}

export async function getOrganizationTypes(): Promise<OrganizationType[]> {
  return apiFetch<OrganizationType[]>("/api/organization-types");
}

export async function getAllOrganizationTypes(): Promise<OrganizationType[]> {
  return apiFetch<OrganizationType[]>("/api/organization-types/all");
}

export async function getOrganizationType(id: string): Promise<OrganizationType> {
  return apiFetch<OrganizationType>(`/api/organization-types/${id}`);
}

export async function createOrganizationType(
  body: OrganizationTypeRequest,
): Promise<OrganizationType> {
  return apiFetch<OrganizationType>("/api/organization-types", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateOrganizationType(
  id: string,
  body: OrganizationTypeRequest,
): Promise<OrganizationType> {
  return apiFetch<OrganizationType>(`/api/organization-types/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deactivateOrganizationType(id: string): Promise<OrganizationType> {
  return apiFetch<OrganizationType>(`/api/organization-types/${id}/deactivate`, {
    method: "PATCH",
  });
}

export async function deleteOrganizationType(id: string): Promise<void> {
  return apiFetch<void>(`/api/organization-types/${id}`, {
    method: "DELETE",
  });
}

export async function importOrganizations(file: File): Promise<ImportResult> {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<ImportResult>("/api/organizations/import", {
    method: "POST",
    body: form,
  });
}

export async function importUsers(file: File): Promise<ImportResult> {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<ImportResult>("/api/users/import", {
    method: "POST",
    body: form,
  });
}

export async function searchUsers(params: {
  page?: number;
  size?: number;
  search?: string;
  role?: UserRole;
  organizationId?: string;
}): Promise<PageResponse<User>> {
  const q = new URLSearchParams();
  q.set("page", String(params.page ?? 0));
  q.set("size", String(params.size ?? 20));
  if (params.search) q.set("search", params.search);
  if (params.role) q.set("role", params.role);
  if (params.organizationId) q.set("organizationId", params.organizationId);
  return apiFetch<PageResponse<User>>(`/api/users?${q}`);
}

export async function getUser(id: string): Promise<User> {
  return apiFetch<User>(`/api/users/${id}`);
}

export interface CreateUserResult {
  user: User;
  temporaryPassword: string;
}

export async function createUser(body: {
  staffNumber: string;
  email: string;
  lastName: string;
  firstName: string;
  phone?: string;
  role: UserRole;
  organizationId: string;
  jobTitle?: string;
  active: boolean;
}): Promise<CreateUserResult> {
  return apiFetch<CreateUserResult>("/api/users", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateUser(
  id: string,
  body: {
    staffNumber: string;
    email: string;
    lastName: string;
    firstName: string;
    phone?: string;
    role: UserRole;
    organizationId: string;
    jobTitle?: string;
    active: boolean;
  },
): Promise<User> {
  return apiFetch<User>(`/api/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function activateUser(id: string): Promise<User> {
  return apiFetch<User>(`/api/users/${id}/activate`, { method: "PATCH" });
}

export async function unlockUser(id: string): Promise<User> {
  return apiFetch<User>(`/api/users/${id}/unlock`, { method: "PATCH" });
}

export async function resetUserPassword(id: string): Promise<{ temporaryPassword: string }> {
  return apiFetch<{ temporaryPassword: string }>(`/api/users/${id}/reset-password`, {
    method: "POST",
  });
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<UserProfile> {
  return apiFetch<UserProfile>("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function getLoginAudit(params: {
  page?: number;
  email?: string;
  success?: boolean;
  from?: string;
  to?: string;
}): Promise<PageResponse<LoginAuditEntry>> {
  const q = new URLSearchParams();
  q.set("page", String(params.page ?? 0));
  q.set("size", "30");
  if (params.email) q.set("email", params.email);
  if (params.success !== undefined) q.set("success", String(params.success));
  if (params.from) q.set("from", params.from);
  if (params.to) q.set("to", params.to);
  return apiFetch<PageResponse<LoginAuditEntry>>(`/api/admin/login-audit?${q}`);
}

export async function deactivateUser(id: string): Promise<User> {
  return apiFetch<User>(`/api/users/${id}/deactivate`, {
    method: "PATCH",
  });
}

export async function checkOrganizationAccess(id: string): Promise<OrganizationSummary> {
  return apiFetch<OrganizationSummary>(`/api/organizations/${id}`);
}
