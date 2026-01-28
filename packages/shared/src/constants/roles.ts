/**
 * Member roles with their permissions
 */
export const MEMBER_ROLES = {
  admin: 'admin',
  manager: 'manager',
  accounting: 'accounting',
  maintenance: 'maintenance',
  legal: 'legal',
  tenant: 'tenant',
  readOnly: 'readOnly',
} as const;

export type MemberRole = (typeof MEMBER_ROLES)[keyof typeof MEMBER_ROLES];

export const MEMBER_STATUSES = {
  active: 'active',
  invited: 'invited',
  disabled: 'disabled',
} as const;

export type MemberStatus = (typeof MEMBER_STATUSES)[keyof typeof MEMBER_STATUSES];

/**
 * Role hierarchy for permission checks
 */
export const ROLE_HIERARCHY: Record<MemberRole, number> = {
  admin: 100,
  manager: 80,
  accounting: 60,
  legal: 60,
  maintenance: 40,
  tenant: 20,
  readOnly: 10,
};

/**
 * Permissions by role
 */
export const ROLE_PERMISSIONS: Record<MemberRole, string[]> = {
  admin: ['*'], // All permissions
  manager: [
    'properties:read',
    'properties:write',
    'units:read',
    'units:write',
    'tenants:read',
    'tenants:write',
    'leases:read',
    'leases:write',
    'charges:read',
    'payments:read',
    'bills:read',
    'cases:read',
    'work_orders:read',
    'work_orders:write',
  ],
  accounting: [
    'properties:read',
    'units:read',
    'tenants:read',
    'leases:read',
    'charges:read',
    'charges:write',
    'payments:read',
    'bills:read',
    'bills:write',
    'ledger:read',
    'ledger:write',
    'reports:read',
  ],
  legal: [
    'properties:read',
    'units:read',
    'tenants:read',
    'leases:read',
    'cases:read',
    'cases:write',
    'case_tasks:read',
    'case_tasks:write',
    'case_documents:read',
    'case_documents:write',
  ],
  maintenance: [
    'properties:read',
    'units:read',
    'work_orders:read',
    'work_orders:write',
  ],
  tenant: [
    'leases:read:own',
    'charges:read:own',
    'payments:read:own',
    'payments:create:own',
    'work_orders:create:own',
  ],
  readOnly: [
    'properties:read',
    'units:read',
    'tenants:read',
    'leases:read',
  ],
};
