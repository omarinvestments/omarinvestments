/**
 * Role-Based Access Control (RBAC) Constants
 *
 * 4-role hierarchical permission model:
 * - Super-Admin: Platform-wide control
 * - Admin: LLC-scoped full CRUD
 * - Manager: Property-scoped access
 * - Employee: Work orders, tasks, payment processing
 */

/**
 * Platform-level roles (global scope)
 */
export const PLATFORM_ROLES = {
  superAdmin: 'superAdmin',
} as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[keyof typeof PLATFORM_ROLES];

/**
 * Business-side roles (scoped by assignment)
 */
export const BUSINESS_ROLES = {
  admin: 'admin',
  manager: 'manager',
  employee: 'employee',
} as const;

export type BusinessRole = (typeof BUSINESS_ROLES)[keyof typeof BUSINESS_ROLES];

/**
 * Tenant role (for tenant portal users)
 */
export const TENANT_ROLE = 'tenant' as const;
export type TenantRole = typeof TENANT_ROLE;

/**
 * Combined role type
 */
export type UserRole = PlatformRole | BusinessRole | TenantRole;

/**
 * All available permissions in the system
 */
export const PERMISSIONS = {
  // Platform-level permissions
  'platform:manage': 'platform:manage',
  'platform:users:read': 'platform:users:read',
  'platform:users:write': 'platform:users:write',
  'platform:llcs:read': 'platform:llcs:read',
  'platform:llcs:write': 'platform:llcs:write',

  // LLC-level permissions
  'llc:read': 'llc:read',
  'llc:write': 'llc:write',
  'llc:delete': 'llc:delete',
  'llc:members:read': 'llc:members:read',
  'llc:members:write': 'llc:members:write',
  'llc:settings:read': 'llc:settings:read',
  'llc:settings:write': 'llc:settings:write',

  // Property permissions
  'property:read': 'property:read',
  'property:write': 'property:write',
  'property:delete': 'property:delete',

  // Unit permissions
  'unit:read': 'unit:read',
  'unit:write': 'unit:write',
  'unit:delete': 'unit:delete',

  // Tenant permissions
  'tenant:read': 'tenant:read',
  'tenant:write': 'tenant:write',
  'tenant:delete': 'tenant:delete',

  // Lease permissions
  'lease:read': 'lease:read',
  'lease:write': 'lease:write',
  'lease:delete': 'lease:delete',

  // Billing/Charge permissions
  'charge:read': 'charge:read',
  'charge:write': 'charge:write',
  'charge:void': 'charge:void',

  // Payment permissions
  'payment:read': 'payment:read',
  'payment:write': 'payment:write',
  'payment:process': 'payment:process',
  'payment:refund': 'payment:refund',

  // Work Order permissions
  'workOrder:read': 'workOrder:read',
  'workOrder:write': 'workOrder:write',
  'workOrder:assign': 'workOrder:assign',
  'workOrder:complete': 'workOrder:complete',
  'workOrder:delete': 'workOrder:delete',

  // Task permissions
  'task:read': 'task:read',
  'task:write': 'task:write',
  'task:assign': 'task:assign',
  'task:complete': 'task:complete',
  'task:delete': 'task:delete',

  // Legal Case permissions
  'case:read': 'case:read',
  'case:write': 'case:write',
  'case:delete': 'case:delete',

  // Document permissions
  'document:read': 'document:read',
  'document:write': 'document:write',
  'document:delete': 'document:delete',

  // Accounting/Ledger permissions
  'ledger:read': 'ledger:read',
  'ledger:write': 'ledger:write',

  // Reports
  'reports:read': 'reports:read',
  'reports:export': 'reports:export',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Permissions granted to each role
 * - '*' means all permissions (super-admin)
 * - Specific permissions for other roles
 */
export const ROLE_PERMISSION_MAP: Record<UserRole, readonly string[]> = {
  // Super-Admin: Full platform control
  superAdmin: ['*'],

  // Admin: Full CRUD within assigned LLC(s)
  admin: [
    // LLC management
    'llc:read',
    'llc:write',
    'llc:members:read',
    'llc:members:write',
    'llc:settings:read',
    'llc:settings:write',
    // Properties
    'property:read',
    'property:write',
    'property:delete',
    // Units
    'unit:read',
    'unit:write',
    'unit:delete',
    // Tenants
    'tenant:read',
    'tenant:write',
    'tenant:delete',
    // Leases
    'lease:read',
    'lease:write',
    'lease:delete',
    // Billing
    'charge:read',
    'charge:write',
    'charge:void',
    // Payments
    'payment:read',
    'payment:write',
    'payment:process',
    'payment:refund',
    // Work Orders
    'workOrder:read',
    'workOrder:write',
    'workOrder:assign',
    'workOrder:complete',
    'workOrder:delete',
    // Tasks
    'task:read',
    'task:write',
    'task:assign',
    'task:complete',
    'task:delete',
    // Cases
    'case:read',
    'case:write',
    'case:delete',
    // Documents
    'document:read',
    'document:write',
    'document:delete',
    // Accounting
    'ledger:read',
    'ledger:write',
    // Reports
    'reports:read',
    'reports:export',
  ],

  // Manager: Property-scoped access
  manager: [
    // Properties (assigned only)
    'property:read',
    'property:write',
    // Units (on assigned properties)
    'unit:read',
    'unit:write',
    // Tenants (read-only)
    'tenant:read',
    // Leases (read-only)
    'lease:read',
    // Billing (read-only)
    'charge:read',
    // Work Orders (full access on assigned properties)
    'workOrder:read',
    'workOrder:write',
    'workOrder:assign',
    'workOrder:complete',
    // Tasks
    'task:read',
    'task:write',
    'task:complete',
    // Documents (on assigned properties)
    'document:read',
    'document:write',
  ],

  // Employee: Work orders, tasks, payment processing
  employee: [
    // Tenants (read-only for context)
    'tenant:read',
    // Work Orders (assigned only)
    'workOrder:read',
    'workOrder:write',
    'workOrder:complete',
    // Tasks (assigned only)
    'task:read',
    'task:write',
    'task:complete',
    // Payment processing
    'payment:read',
    'payment:process',
  ],

  // Tenant: Limited self-service access to own data
  tenant: [
    // Own lease info
    'lease:read',
    // Own charges/payments
    'charge:read',
    'payment:read',
    'payment:write', // Submit payments
    // Submit work order requests
    'workOrder:read',
    'workOrder:write', // Create requests only
    // Own documents
    'document:read',
  ],
} as const;

/**
 * Role hierarchy for UI display order (RBAC system)
 */
export const RBAC_ROLE_HIERARCHY: Record<UserRole, number> = {
  superAdmin: 100,
  admin: 80,
  manager: 60,
  employee: 40,
  tenant: 10,
};

/**
 * Role display names
 */
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  superAdmin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  employee: 'Employee',
  tenant: 'Tenant',
};

/**
 * Role descriptions for UI
 */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  superAdmin: 'Full platform control across all LLCs',
  admin: 'Full management within assigned LLC(s)',
  manager: 'Property-level management for assigned properties',
  employee: 'Work orders, tasks, and payment processing',
  tenant: 'Self-service access to own lease, payments, and work orders',
};

/**
 * Assignment statuses
 */
export const ASSIGNMENT_STATUSES = {
  active: 'active',
  disabled: 'disabled',
} as const;

export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[keyof typeof ASSIGNMENT_STATUSES];

/**
 * Employee capabilities (configurable per assignment)
 */
export const EMPLOYEE_CAPABILITIES = {
  workOrderAccess: 'workOrderAccess',
  taskAccess: 'taskAccess',
  paymentProcessing: 'paymentProcessing',
} as const;

export type EmployeeCapability = (typeof EMPLOYEE_CAPABILITIES)[keyof typeof EMPLOYEE_CAPABILITIES];
