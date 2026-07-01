export type UserRole =
  | "SUPER_ADMIN"
  | "ADMIN_METIER"
  | "CABINET"
  | "SG"
  | "DIRECTEUR"
  | "CHEF_SERVICE"
  | "AGENT"
  | "APPUI"
  | "LECTEUR"
  | "DRTP";

export type OrganisationType =
  | "MINISTERE"
  | "DIRECTION"
  | "DIVISION"
  | "SERVICE"
  | "DRTP";

export interface OrganisationSummary {
  id: string;
  code: string;
  nom: string;
}

export interface UserProfile {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: UserRole;
  organisation: OrganisationSummary;
  mustChangePassword: boolean;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserProfile;
}

export interface OrganisationTreeNode {
  id: string;
  code: string;
  nom: string;
  type: OrganisationType;
  actif: boolean;
  children: OrganisationTreeNode[];
}

export interface Utilisateur {
  id: string;
  matricule: string;
  email: string;
  nom: string;
  prenom: string;
  telephone?: string;
  role: UserRole;
  organisation: OrganisationSummary;
  fonction?: string;
  actif: boolean;
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
  succes: boolean;
  ipAddress?: string;
  userAgent?: string;
  motifEchec?: string;
  createdAt: string;
}
