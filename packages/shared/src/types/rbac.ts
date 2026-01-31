import { Timestamp } from './common';
import {
  BusinessRole,
  AssignmentStatus,
} from '../constants/permissions';

/**
 * User Type - Determines portal access and permissions model
 */
export type UserType = 'staff' | 'tenant';

/**
 * User Status
 */
export type UserStatus = 'active' | 'pending' | 'disabled';

/**
 * User - Unified user record for all user types
 * Stored at: /users/{userId}
 *
 * - Staff users: Access determined by userAssignments + LLC memberships
 * - Tenant users: Access determined by linked tenant records (leases, charges)
 */
export interface User {
  id: string; // Firebase Auth UID
  email: string;
  displayName?: string;
  phoneNumber?: string;
  photoURL?: string;

  // User type determines portal access
  userType: UserType;

  // Staff-specific fields (when userType === 'staff')
  isSuperAdmin?: boolean;

  // Tenant-specific fields (when userType === 'tenant')
  // Links to tenant records: /llcs/{llcId}/tenants/{tenantId}
  tenantLinks?: TenantLink[];

  // Account status
  status: UserStatus;

  // Metadata
  lastLoginAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Link between a user and their tenant record(s)
 * A user can be a tenant in multiple LLCs
 */
export interface TenantLink {
  llcId: string;
  tenantId: string;
  // Denormalized for quick access
  llcName?: string;
}

/**
 * @deprecated Use User instead
 */
export type PlatformUser = User;

/**
 * User Assignment - Cross-LLC assignments for managers/employees
 * Stored at: /userAssignments/{assignmentId}
 *
 * This enables:
 * - Managers to access specific properties across multiple LLCs
 * - Employees to work on work orders/tasks across multiple LLCs
 */
export interface UserAssignment {
  id: string;
  userId: string;
  role: Exclude<BusinessRole, 'admin'>; // 'manager' | 'employee'
  llcIds: string[]; // LLCs this assignment grants access to
  propertyIds: string[]; // Specific properties (for managers)
  capabilities: EmployeeCapabilities;
  status: AssignmentStatus;
  assignedByUserId: string;
  notes?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Employee capabilities configuration
 */
export interface EmployeeCapabilities {
  workOrderAccess: boolean;
  taskAccess: boolean;
  paymentProcessing: boolean;
}

/**
 * Default capabilities by role
 */
export const DEFAULT_CAPABILITIES: Record<Exclude<BusinessRole, 'admin'>, EmployeeCapabilities> = {
  manager: {
    workOrderAccess: true,
    taskAccess: true,
    paymentProcessing: false,
  },
  employee: {
    workOrderAccess: true,
    taskAccess: true,
    paymentProcessing: true,
  },
};

/**
 * LLC Admin Member - Simplified to admin-only
 * Stored at: /llcs/{llcId}/members/{userId}
 *
 * After RBAC migration, this collection only contains admins.
 * Managers and employees are stored in /userAssignments
 */
export interface LLCAdminMember {
  userId: string;
  role: 'admin'; // Only admin stored here
  status: 'active' | 'invited' | 'disabled';
  invitedBy?: string;
  invitedAt?: Timestamp;
  joinedAt?: Timestamp;
  createdAt: Timestamp;
}

/**
 * Permission Context - Computed at runtime for authorization checks
 */
export interface PermissionContext {
  userId: string;
  email: string;
  displayName?: string;

  // User type
  userType: UserType;

  // Role determination (for staff users)
  isSuperAdmin: boolean;
  effectiveRole: 'superAdmin' | 'admin' | 'manager' | 'employee' | 'tenant' | null;

  // LLC access (for staff users)
  adminOfLlcIds: string[]; // LLCs where user is admin (from llcs/members)
  assignedLlcIds: string[]; // LLCs accessible via userAssignment

  // Property access (for managers)
  assignedPropertyIds: string[];

  // Capabilities (for employees/managers)
  capabilities: EmployeeCapabilities;

  // Raw assignments for reference (staff users)
  assignments: UserAssignment[];

  // Tenant links (for tenant users)
  tenantLinks: TenantLink[];
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  context?: PermissionContext;
}

/**
 * Scope for permission checks
 */
export interface PermissionScope {
  llcId?: string;
  propertyId?: string;
  unitId?: string;
  workOrderId?: string;
  taskId?: string;
}

/**
 * User with role context for display
 */
export interface UserWithRole {
  id: string;
  email: string;
  displayName?: string;
  phoneNumber?: string;
  photoURL?: string;
  userType: UserType;
  status: UserStatus;
  isSuperAdmin?: boolean;
  assignments: UserAssignment[];
  adminOfLlcs: {
    llcId: string;
    llcName: string;
  }[];
  tenantLinks?: TenantLink[];
}

/**
 * Invitation for LLC admin
 */
export interface LLCAdminInvitation {
  id: string;
  llcId: string;
  email: string;
  invitedByUserId: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expiresAt: Timestamp;
  createdAt: Timestamp;
  acceptedAt?: Timestamp;
}

/**
 * Create user assignment input
 */
export interface CreateUserAssignmentInput {
  userId: string;
  role: Exclude<BusinessRole, 'admin'>;
  llcIds: string[];
  propertyIds: string[];
  capabilities?: Partial<EmployeeCapabilities>;
  notes?: string;
}

/**
 * Update user assignment input
 */
export interface UpdateUserAssignmentInput {
  role?: Exclude<BusinessRole, 'admin'>;
  llcIds?: string[];
  propertyIds?: string[];
  capabilities?: Partial<EmployeeCapabilities>;
  status?: AssignmentStatus;
  notes?: string;
}
