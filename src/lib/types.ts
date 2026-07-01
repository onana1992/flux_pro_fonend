export type UserRole =
  | "SUPER_ADMIN"
  | "BUSINESS_ADMIN"
  | "EXECUTIVE_OFFICE"
  | "SECRETARY_GENERAL"
  | "DIRECTOR"
  | "SERVICE_HEAD"
  | "AGENT"
  | "SUPPORT"
  | "READER"
  | "REGIONAL_DIRECTOR";

export type OrganizationType =
  | "MINISTRY"
  | "DIRECTORATE"
  | "DIVISION"
  | "SERVICE"
  | "REGIONAL_DIRECTORATE";

export interface OrganizationSummary {
  id: string;
  code: string;
  name: string;
}

export interface UserProfile {
  id: string;
  email: string;
  lastName: string;
  firstName: string;
  role: UserRole;
  organization: OrganizationSummary;
  mustChangePassword: boolean;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserProfile;
}

export interface OrganizationTreeNode {
  id: string;
  code: string;
  name: string;
  type: OrganizationType;
  active: boolean;
  children: OrganizationTreeNode[];
}

export interface User {
  id: string;
  staffNumber: string;
  email: string;
  lastName: string;
  firstName: string;
  phone?: string;
  role: UserRole;
  organization: OrganizationSummary;
  jobTitle?: string;
  active: boolean;
  mustChangePassword: boolean;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface ImportResult {
  created: number;
  updated: number;
  errors: string[];
}

export interface LoginAuditEntry {
  id: string;
  email: string;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  failureReason?: string;
  createdAt: string;
}

/** British spelling aliases used by some UI components */
export type OrganisationType = OrganizationType;
export type OrganisationTreeNode = OrganizationTreeNode;
