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

export type OrganizationTypeCode =
  | "MINISTRY"
  | "DIRECTORATE"
  | "DIVISION"
  | "SERVICE"
  | "REGIONAL_DIRECTORATE";

export interface OrganizationType {
  id: string;
  code: OrganizationTypeCode | string;
  name: string;
  nameEn?: string;
  description?: string;
  color?: string;
  sortOrder: number;
  allowsRoot: boolean;
  isRegionalScope: boolean;
  active: boolean;
}

export interface OrganizationSummary {
  id: string;
  code: string;
  name: string;
}

export interface OrganizationDetail extends OrganizationSummary {
  typeId: string;
  typeCode: string;
  typeName: string;
  parentId?: string | null;
  parentCode?: string | null;
  active: boolean;
}

export interface OrganizationRequest {
  code: string;
  name: string;
  typeId: string;
  parentId?: string | null;
  active: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  lastName: string;
  firstName: string;
  role: UserRole;
  organization: OrganizationSummary;
  mustChangePassword: boolean;
  roles: string[];
  permissions: string[];
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
  roles?: RoleSummary[];
}

export interface RoleSummary {
  id: string;
  name: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  systemRole: boolean;
  createdAt: string;
  permissions: Permission[];
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
  createdAt: string;
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

export interface AdminAuditLogEntry {
  id: string;
  actorEmail: string;
  resourceType: string;
  action: string;
  resourceId?: string;
  resourceLabel?: string;
  success: boolean;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

/** British spelling aliases used by some UI components */
export type OrganisationType = OrganizationTypeCode;
export type OrganisationTreeNode = OrganizationTreeNode;

export interface OrganizationTypeRequest {
  code: string;
  name: string;
  nameEn?: string;
  description?: string;
  color?: string;
  sortOrder?: number;
  allowsRoot: boolean;
  isRegionalScope: boolean;
  active: boolean;
}

export type DelayUnit = "WORKING_DAYS" | "WORKING_HOURS";

export interface ChainStepTemplate {
  id?: string;
  stepOrder: number;
  label: string;
  responsibleRole: UserRole;
  delayValue: number;
  delayUnit: DelayUnit;
  expectedAction?: string;
  optional: boolean;
  closureStep: boolean;
}

export interface ChainTemplateSummary {
  id: string;
  code: string;
  name: string;
  fileTypeCode?: string | null;
  totalDelayDays: number;
  delayUnit: DelayUnit;
  active: boolean;
  systemTemplate: boolean;
  stepCount: number;
}

export interface ChainTemplateDetail extends ChainTemplateSummary {
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  steps: ChainStepTemplate[];
}

export interface ChainTemplateCreateRequest {
  code: string;
  name: string;
  description?: string;
  fileTypeCode?: string;
  totalDelayDays: number;
  delayUnit: DelayUnit;
  steps: ChainStepTemplate[];
}

export interface ChainTemplateUpdateRequest {
  name: string;
  description?: string;
  fileTypeCode?: string;
  totalDelayDays: number;
  delayUnit: DelayUnit;
}

export interface FileType {
  id: string;
  code: string;
  name: string;
  nameEn?: string;
  description?: string;
  directionCode?: string | null;
  sortOrder: number;
  active: boolean;
}

export interface FileTypeRequest {
  code: string;
  name: string;
  nameEn?: string;
  description?: string;
  directionCode?: string;
  sortOrder?: number;
  active: boolean;
}

export type FilePriority = "NORMAL" | "URGENT" | "VERY_URGENT";

export type FileStatus =
  | "DRAFT"
  | "IN_PROGRESS"
  | "ON_HOLD"
  | "CLOSED"
  | "ARCHIVED"
  | "CANCELLED";

export interface FileSummary {
  id: string;
  referenceNumber?: string | null;
  fileTypeCode: string;
  subject: string;
  priority: FilePriority;
  status: FileStatus;
  receivedAt: string;
  organizationCode: string;
  organizationName: string;
  chainTemplateCode?: string | null;
  createdAt: string;
}

export interface FileAttachment {
  id: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  responseDocument: boolean;
  uploadedById: string;
  uploadedByName?: string;
  createdAt: string;
}

export interface FileDetail extends FileSummary {
  senderOrBeneficiary: string;
  organizationId: string;
  chainTemplateId?: string | null;
  chainTemplateName?: string | null;
  createdByUserId: string;
  createdByName?: string;
  closureReason?: string | null;
  closedAt?: string | null;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  metadata?: Record<string, unknown> | null;
  attachments: FileAttachment[];
  updatedAt: string;
}

export interface FileCreateRequest {
  fileTypeCode: string;
  organizationId: string;
  subject: string;
  senderOrBeneficiary: string;
  receivedAt: string;
  priority: FilePriority;
  submit: boolean;
  metadata?: Record<string, unknown>;
}

export interface FileUpdateRequest {
  fileTypeCode: string;
  organizationId: string;
  subject: string;
  senderOrBeneficiary: string;
  receivedAt: string;
  priority: FilePriority;
  metadata?: Record<string, unknown>;
}

export interface FileCloseRequest {
  closureReason: string;
  responseAttachmentId: string;
}

export interface FileCancelRequest {
  reason: string;
}

export type PassageStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "RETURNED"
  | "SUSPENDED"
  | "SKIPPED";

export interface PassageStep {
  id: string;
  stepOrder: number;
  label: string;
  expectedAction?: string | null;
  optional?: boolean;
  closureStep: boolean;
  responsibleRole?: UserRole | null;
  delayValue?: number;
  delayUnit?: DelayUnit | null;
  status: PassageStatus;
  responsibleUserId?: string | null;
  responsibleName?: string | null;
  responsibleEmail?: string | null;
  responsiblePhone?: string | null;
  responsibleJobTitle?: string | null;
  responsibleOrganizationCode?: string | null;
  responsibleOrganizationName?: string | null;
  receivedAt?: string | null;
  transmittedAt?: string | null;
  dueAt?: string | null;
  consumedHours?: number | null;
  workingDaysHeld?: number | null;
  overdue: boolean;
  comment?: string | null;
  internalComment?: string | null;
  returnReason?: string | null;
  suspendedAt?: string | null;
  resumedAt?: string | null;
}

export interface CurrentHolder {
  userId: string;
  fullName: string;
  organizationCode: string;
  stepLabel: string;
  stepOrder: number;
  since: string;
  workingDaysHeld: number;
  overdue: boolean;
  dueAt?: string | null;
}

export interface FilePassageCircuit {
  templateCode?: string | null;
  templateName?: string | null;
  currentStepOrder?: number | null;
  currentHolder?: CurrentHolder | null;
  passages: PassageStep[];
}

export interface PassageCandidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  organizationCode: string;
  organizationName: string;
}

export interface ChainStepAssignmentRequest {
  chainStepTemplateId: string;
  responsibleUserId: string;
}

export interface ChainInitializeRequest {
  chainTemplateId: string;
  assignments: ChainStepAssignmentRequest[];
}

export interface PassageTransmitRequest {
  comment?: string;
  nextResponsibleUserId?: string;
}

export interface PassageReturnRequest {
  reason: string;
}

export interface PassageReasonRequest {
  reason: string;
}

export type AlertChannel = "IN_APP" | "EMAIL" | "SMS";

export type AlertStatus = "PENDING" | "SENT" | "FAILED" | "READ";

export type AlertTargetMode = "CURRENT_RESPONSIBLE" | "ROLE";

export interface AlertType {
  id: string;
  code: string;
  label: string;
  description?: string | null;
  emailTemplateCode?: string | null;
  systemDefined: boolean;
  active: boolean;
}

export interface AlertTypeRequest {
  code: string;
  label: string;
  description?: string;
  emailTemplateCode?: string;
  active: boolean;
}

export interface AlertRule {
  id: string;
  chainTemplateId: string;
  chainStepTemplateId?: string | null;
  chainStepTemplateLabel?: string | null;
  thresholdCode: string;
  offsetValue: number;
  offsetUnit: DelayUnit;
  alertTypeId: string;
  alertTypeCode: string;
  alertTypeLabel: string;
  escalationLevel?: number | null;
  targetMode: AlertTargetMode;
  targetRole?: UserRole | null;
  priorityScope?: string | null;
  active: boolean;
}

export interface AlertRuleRequest {
  chainStepTemplateId?: string;
  thresholdCode: string;
  offsetValue: number;
  offsetUnit: DelayUnit;
  alertTypeId: string;
  escalationLevel?: number;
  targetMode: AlertTargetMode;
  targetRole?: UserRole;
  priorityScope?: string;
  active: boolean;
}

export interface AlertResponse {
  id: string;
  fileId?: string | null;
  fileReferenceNumber?: string | null;
  filePassageId?: string | null;
  stepLabel?: string | null;
  alertTypeCode: string;
  alertTypeLabel: string;
  escalationLevel?: number | null;
  channel: AlertChannel;
  status: AlertStatus;
  sentAt?: string | null;
  readAt?: string | null;
  message: string;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

/** Largeur du périmètre organisationnel résolu par l'API (cf. SPEC-DSH.md §4.2) — jamais un nom de rôle. */
export type DashboardScopeWidth = "SELF" | "SUBTREE" | "REGIONAL" | "GLOBAL";

export interface DashboardSummary {
  organizationId?: string | null;
  organizationCode?: string | null;
  scopeWidth: DashboardScopeWidth;
  activeFiles: number;
  overdueFiles: number;
  closedThisMonth: number;
  createdThisMonth: number;
}

export interface DashboardActivityItem {
  passageId: string;
  fileId: string;
  fileReferenceNumber?: string | null;
  fileSubject?: string | null;
  stepLabel: string;
  receivedAt?: string | null;
  dueAt?: string | null;
  overdue: boolean;
}

export interface DashboardMyActivity {
  activeCount: number;
  overdueCount: number;
  transmittedRecentCount: number;
  items: DashboardActivityItem[];
}

export interface DashboardWorkloadEntry {
  userId: string;
  firstName: string;
  lastName: string;
  organizationCode?: string | null;
  activeCount: number;
  overdueCount: number;
}

export interface DashboardOverdueFile {
  fileId: string;
  referenceNumber?: string | null;
  subject: string;
  fileTypeCode?: string | null;
  organizationCode?: string | null;
  stepLabel: string;
  responsibleUserName?: string | null;
  dueAt: string;
  daysOverdue: number;
}

export interface DashboardDelayByType {
  fileTypeCode: string;
  fileTypeLabel: string;
  closedCount: number;
  averageDelayDays: number;
  targetDelayDays?: number | null;
}

export interface DashboardOrganizationRanking {
  organizationId: string;
  organizationCode: string;
  organizationName: string;
  closedCount: number;
  compliantCount: number;
  complianceRate: number;
}
