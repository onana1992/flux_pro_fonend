import type {
  ChainTemplateCreateRequest,
  ChainTemplateDetail,
  ChainTemplateSummary,
  ChainTemplateUpdateRequest,
  ChainStepTemplate,
  DelayUnit,
  FileType,
  FileTypeRequest,
  FileSummary,
  FileDetail,
  FileCreateRequest,
  FileUpdateRequest,
  FileCloseRequest,
  FileCancelRequest,
  FileAttachment,
  FilePriority,
  FileStatus,
  ImportResult,
  LoginAuditEntry,
  OrganizationDetail,
  OrganizationRequest,
  OrganizationSummary,
  OrganizationTreeNode,
  OrganizationType,
  OrganizationTypeRequest,
  PageResponse,
  TokenResponse,
  User,
  UserProfile,
  UserRole,
  Role,
  Permission,
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

export async function getOrganization(id: string): Promise<OrganizationDetail> {
  return apiFetch<OrganizationDetail>(`/api/organizations/${id}`);
}

export async function createOrganization(body: OrganizationRequest): Promise<OrganizationDetail> {
  return apiFetch<OrganizationDetail>("/api/organizations", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateOrganization(
  id: string,
  body: OrganizationRequest,
): Promise<OrganizationDetail> {
  return apiFetch<OrganizationDetail>(`/api/organizations/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deactivateOrganization(id: string): Promise<OrganizationDetail> {
  return apiFetch<OrganizationDetail>(`/api/organizations/${id}/deactivate`, {
    method: "PATCH",
  });
}

export async function deleteOrganization(id: string): Promise<void> {
  return apiFetch<void>(`/api/organizations/${id}`, {
    method: "DELETE",
  });
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
  temporaryPassword?: string;
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

export async function listRoles(): Promise<Role[]> {
  return apiFetch<Role[]>("/api/admin/roles");
}

export async function getRole(id: string): Promise<Role> {
  return apiFetch<Role>(`/api/admin/roles/${id}`);
}

export async function createRole(body: {
  name: string;
  description?: string;
  permissionIds?: string[];
}): Promise<Role> {
  return apiFetch<Role>("/api/admin/roles", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateRole(
  id: string,
  body: { name?: string; description?: string; permissionIds?: string[] },
): Promise<Role> {
  return apiFetch<Role>(`/api/admin/roles/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteRole(id: string): Promise<void> {
  return apiFetch<void>(`/api/admin/roles/${id}`, { method: "DELETE" });
}

export async function assignRolePermissions(
  roleId: string,
  permissionIds: string[],
): Promise<void> {
  return apiFetch<void>(`/api/admin/roles/${roleId}/permissions`, {
    method: "POST",
    body: JSON.stringify({ permissionIds }),
  });
}

export async function revokeRolePermission(roleId: string, permissionId: string): Promise<void> {
  return apiFetch<void>(`/api/admin/roles/${roleId}/permissions/${permissionId}`, {
    method: "DELETE",
  });
}

export async function assignUserRole(userId: string, roleId: string): Promise<void> {
  return apiFetch<void>(`/api/users/${userId}/roles`, {
    method: "POST",
    body: JSON.stringify({ roleId }),
  });
}

export async function revokeUserRole(userId: string, roleId: string): Promise<void> {
  return apiFetch<void>(`/api/users/${userId}/roles/${roleId}`, { method: "DELETE" });
}

export async function searchPermissions(params: {
  page?: number;
  size?: number;
  resource?: string;
}): Promise<PageResponse<Permission>> {
  const q = new URLSearchParams();
  q.set("page", String(params.page ?? 0));
  q.set("size", String(params.size ?? 50));
  if (params.resource) q.set("resource", params.resource);
  return apiFetch<PageResponse<Permission>>(`/api/admin/permissions?${q}`);
}

export async function createPermission(body: {
  name: string;
  resource: string;
  action: string;
  description?: string;
}): Promise<Permission> {
  return apiFetch<Permission>("/api/admin/permissions", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updatePermission(
  id: string,
  body: { name?: string; resource?: string; action?: string; description?: string },
): Promise<Permission> {
  return apiFetch<Permission>(`/api/admin/permissions/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deletePermission(id: string): Promise<void> {
  return apiFetch<void>(`/api/admin/permissions/${id}`, { method: "DELETE" });
}

export async function checkOrganizationAccess(id: string): Promise<OrganizationDetail> {
  return apiFetch<OrganizationDetail>(`/api/organizations/${id}`);
}

export async function searchChainTemplates(params: {
  page?: number;
  size?: number;
  active?: boolean;
  fileTypeCode?: string;
  search?: string;
}): Promise<PageResponse<ChainTemplateSummary>> {
  const q = new URLSearchParams();
  q.set("page", String(params.page ?? 0));
  q.set("size", String(params.size ?? 50));
  if (params.active !== undefined) q.set("active", String(params.active));
  if (params.fileTypeCode) q.set("fileTypeCode", params.fileTypeCode);
  if (params.search) q.set("search", params.search);
  return apiFetch<PageResponse<ChainTemplateSummary>>(`/api/admin/chain-templates?${q}`);
}

export async function getChainTemplate(id: string): Promise<ChainTemplateDetail> {
  return apiFetch<ChainTemplateDetail>(`/api/admin/chain-templates/${id}`);
}

export async function getChainTemplateByCode(code: string): Promise<ChainTemplateDetail> {
  return apiFetch<ChainTemplateDetail>(`/api/admin/chain-templates/by-code/${encodeURIComponent(code)}`);
}

export async function createChainTemplate(body: ChainTemplateCreateRequest): Promise<ChainTemplateDetail> {
  return apiFetch<ChainTemplateDetail>("/api/admin/chain-templates", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateChainTemplate(
  id: string,
  body: ChainTemplateUpdateRequest,
): Promise<ChainTemplateDetail> {
  return apiFetch<ChainTemplateDetail>(`/api/admin/chain-templates/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function replaceChainTemplateSteps(
  id: string,
  steps: ChainStepTemplate[],
): Promise<ChainTemplateDetail> {
  return apiFetch<ChainTemplateDetail>(`/api/admin/chain-templates/${id}/steps`, {
    method: "PUT",
    body: JSON.stringify(steps),
  });
}

export async function activateChainTemplate(id: string): Promise<ChainTemplateDetail> {
  return apiFetch<ChainTemplateDetail>(`/api/admin/chain-templates/${id}/activate`, {
    method: "PATCH",
  });
}

export async function deactivateChainTemplate(id: string): Promise<ChainTemplateDetail> {
  return apiFetch<ChainTemplateDetail>(`/api/admin/chain-templates/${id}/deactivate`, {
    method: "PATCH",
  });
}

export async function deleteChainTemplate(id: string): Promise<void> {
  return apiFetch<void>(`/api/admin/chain-templates/${id}`, { method: "DELETE" });
}

export async function duplicateChainTemplate(id: string): Promise<ChainTemplateDetail> {
  return apiFetch<ChainTemplateDetail>(`/api/admin/chain-templates/${id}/duplicate`, {
    method: "POST",
  });
}

export async function getFileTypes(): Promise<FileType[]> {
  return apiFetch<FileType[]>("/api/file-types");
}

export async function getAllFileTypes(): Promise<FileType[]> {
  return apiFetch<FileType[]>("/api/admin/file-types");
}

export async function createFileType(body: FileTypeRequest): Promise<FileType> {
  return apiFetch<FileType>("/api/admin/file-types", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateFileType(id: string, body: FileTypeRequest): Promise<FileType> {
  return apiFetch<FileType>(`/api/admin/file-types/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deactivateFileType(id: string): Promise<FileType> {
  return apiFetch<FileType>(`/api/admin/file-types/${id}/deactivate`, {
    method: "PATCH",
  });
}

export async function deleteFileType(id: string): Promise<void> {
  return apiFetch<void>(`/api/admin/file-types/${id}`, { method: "DELETE" });
}

export async function searchFiles(params: {
  page?: number;
  size?: number;
  search?: string;
  organizationId?: string;
  fileTypeCode?: string;
  status?: FileStatus;
  priority?: FilePriority;
  receivedFrom?: string;
  receivedTo?: string;
}): Promise<PageResponse<FileSummary>> {
  const q = new URLSearchParams();
  q.set("page", String(params.page ?? 0));
  q.set("size", String(params.size ?? 20));
  if (params.search) q.set("search", params.search);
  if (params.organizationId) q.set("organizationId", params.organizationId);
  if (params.fileTypeCode) q.set("fileTypeCode", params.fileTypeCode);
  if (params.status) q.set("status", params.status);
  if (params.priority) q.set("priority", params.priority);
  if (params.receivedFrom) q.set("receivedFrom", params.receivedFrom);
  if (params.receivedTo) q.set("receivedTo", params.receivedTo);
  return apiFetch<PageResponse<FileSummary>>(`/api/files?${q}`);
}

export async function getFile(id: string): Promise<FileDetail> {
  return apiFetch<FileDetail>(`/api/files/${id}`);
}

export async function createFile(body: FileCreateRequest): Promise<FileDetail> {
  return apiFetch<FileDetail>("/api/files", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateFile(id: string, body: FileUpdateRequest): Promise<FileDetail> {
  return apiFetch<FileDetail>(`/api/files/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function submitFile(id: string): Promise<FileDetail> {
  return apiFetch<FileDetail>(`/api/files/${id}/submit`, { method: "POST" });
}

export async function cancelFile(id: string, body: FileCancelRequest): Promise<FileDetail> {
  return apiFetch<FileDetail>(`/api/files/${id}/cancel`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function closeFile(id: string, body: FileCloseRequest): Promise<FileDetail> {
  return apiFetch<FileDetail>(`/api/files/${id}/close`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function archiveFile(id: string): Promise<FileDetail> {
  return apiFetch<FileDetail>(`/api/files/${id}/archive`, { method: "PATCH" });
}

export async function deleteFile(id: string): Promise<void> {
  return apiFetch<void>(`/api/files/${id}`, { method: "DELETE" });
}

export async function uploadFileAttachment(
  fileId: string,
  file: File,
  responseDocument = false,
): Promise<FileAttachment> {
  const form = new FormData();
  form.append("file", file);
  const q = responseDocument ? "?responseDocument=true" : "";
  return apiFetch<FileAttachment>(`/api/files/${fileId}/attachments${q}`, {
    method: "POST",
    body: form,
  });
}

export async function deleteFileAttachment(fileId: string, attachmentId: string): Promise<void> {
  return apiFetch<void>(`/api/files/${fileId}/attachments/${attachmentId}`, {
    method: "DELETE",
  });
}

export function fileAttachmentDownloadUrl(fileId: string, attachmentId: string): string {
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
  return `${API_URL}/api/files/${fileId}/attachments/${attachmentId}/download`;
}

export async function downloadFileAttachment(
  fileId: string,
  attachmentId: string,
  filename: string,
): Promise<void> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
  const token = getAccessToken();
  const res = await fetchWithTimeout(
    `${API_URL}/api/files/${fileId}/attachments/${attachmentId}/download`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  );
  if (!res.ok) {
    const detail = await parseError(res);
    throw new ApiError(detail, res.status, detail);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
