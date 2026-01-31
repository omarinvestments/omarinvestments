import {
  requirePermissionContext,
  hasLlcAccess,
  hasPropertyAccess,
  canManageLlcMembers,
} from './permissionContext';
import {
  Permission,
  ROLE_PERMISSION_MAP,
  PermissionContext,
  PermissionScope,
} from '@shared/types';

/**
 * Error thrown when permission is denied.
 */
export class PermissionDeniedError extends Error {
  constructor(
    message: string,
    public readonly permission?: Permission,
    public readonly scope?: PermissionScope
  ) {
    super(`PERMISSION_DENIED: ${message}`);
    this.name = 'PermissionDeniedError';
  }
}

/**
 * Check if a permission is granted based on role permissions.
 */
function hasRolePermission(context: PermissionContext, permission: Permission): boolean {
  if (!context.effectiveRole) {
    return false;
  }

  const rolePermissions = ROLE_PERMISSION_MAP[context.effectiveRole];
  if (!rolePermissions) {
    return false;
  }

  // Check for wildcard (super-admin)
  if (rolePermissions.includes('*')) {
    return true;
  }

  // Check for exact match
  if (rolePermissions.includes(permission)) {
    return true;
  }

  // Check for category wildcard (e.g., 'workOrder:*' matches 'workOrder:read')
  const [category] = permission.split(':');
  if (category && rolePermissions.includes(`${category}:*`)) {
    return true;
  }

  return false;
}

/**
 * Check if user has a specific permission within a scope.
 * Does not throw - returns boolean.
 */
export function checkPermission(
  context: PermissionContext,
  permission: Permission,
  scope?: PermissionScope
): boolean {
  // First check if role grants the permission
  if (!hasRolePermission(context, permission)) {
    return false;
  }

  // If no scope specified, permission is granted
  if (!scope) {
    return true;
  }

  // Check LLC scope
  if (scope.llcId && !hasLlcAccess(context, scope.llcId)) {
    return false;
  }

  // Check property scope
  if (scope.propertyId && scope.llcId) {
    if (!hasPropertyAccess(context, scope.llcId, scope.propertyId)) {
      return false;
    }
  }

  return true;
}

/**
 * Require a specific permission. Throws PermissionDeniedError if not granted.
 */
export async function requirePermission(
  permission: Permission,
  scope?: PermissionScope
): Promise<PermissionContext> {
  const context = await requirePermissionContext();

  if (!checkPermission(context, permission, scope)) {
    throw new PermissionDeniedError(
      `Missing permission '${permission}'${scope?.llcId ? ` for LLC ${scope.llcId}` : ''}`,
      permission,
      scope
    );
  }

  return context;
}

/**
 * Require super-admin access. Throws if not super-admin.
 */
export async function requireSuperAdmin(): Promise<PermissionContext> {
  const context = await requirePermissionContext();

  if (!context.isSuperAdmin) {
    throw new PermissionDeniedError('Super-admin access required');
  }

  return context;
}

/**
 * Require admin access to a specific LLC.
 */
export async function requireLlcAdmin(llcId: string): Promise<PermissionContext> {
  const context = await requirePermissionContext();

  if (!context.isSuperAdmin && !context.adminOfLlcIds.includes(llcId)) {
    throw new PermissionDeniedError(`Admin access required for LLC ${llcId}`);
  }

  return context;
}

/**
 * Require any access to a specific LLC (admin, manager, or employee).
 */
export async function requireLlcAccess(llcId: string): Promise<PermissionContext> {
  const context = await requirePermissionContext();

  if (!hasLlcAccess(context, llcId)) {
    throw new PermissionDeniedError(`No access to LLC ${llcId}`);
  }

  return context;
}

/**
 * Require access to a specific property.
 */
export async function requirePropertyAccess(
  llcId: string,
  propertyId: string
): Promise<PermissionContext> {
  const context = await requirePermissionContext();

  if (!hasPropertyAccess(context, llcId, propertyId)) {
    throw new PermissionDeniedError(`No access to property ${propertyId}`);
  }

  return context;
}

/**
 * Require ability to manage LLC members.
 */
export async function requireMemberManagement(llcId: string): Promise<PermissionContext> {
  const context = await requirePermissionContext();

  if (!canManageLlcMembers(context, llcId)) {
    throw new PermissionDeniedError(`Cannot manage members for LLC ${llcId}`);
  }

  return context;
}

/**
 * Require work order access capability.
 */
export async function requireWorkOrderAccess(): Promise<PermissionContext> {
  const context = await requirePermissionContext();

  // Super-admin and admin always have work order access
  if (context.isSuperAdmin || context.effectiveRole === 'admin') {
    return context;
  }

  // Check capability for manager/employee
  if (!context.capabilities.workOrderAccess) {
    throw new PermissionDeniedError('Work order access not granted');
  }

  return context;
}

/**
 * Require task access capability.
 */
export async function requireTaskAccess(): Promise<PermissionContext> {
  const context = await requirePermissionContext();

  // Super-admin and admin always have task access
  if (context.isSuperAdmin || context.effectiveRole === 'admin') {
    return context;
  }

  // Check capability for manager/employee
  if (!context.capabilities.taskAccess) {
    throw new PermissionDeniedError('Task access not granted');
  }

  return context;
}

/**
 * Require payment processing capability.
 */
export async function requirePaymentProcessing(): Promise<PermissionContext> {
  const context = await requirePermissionContext();

  // Super-admin and admin always have payment processing
  if (context.isSuperAdmin || context.effectiveRole === 'admin') {
    return context;
  }

  // Check capability for employee
  if (!context.capabilities.paymentProcessing) {
    throw new PermissionDeniedError('Payment processing not granted');
  }

  return context;
}

/**
 * Filter a list of LLC IDs to only those the user has access to.
 */
export function filterAccessibleLlcs(
  context: PermissionContext,
  llcIds: string[]
): string[] {
  if (context.isSuperAdmin) {
    return llcIds;
  }
  return llcIds.filter(id => hasLlcAccess(context, id));
}

/**
 * Filter a list of property IDs to only those the user has access to.
 */
export function filterAccessibleProperties(
  context: PermissionContext,
  llcId: string,
  propertyIds: string[]
): string[] {
  if (context.isSuperAdmin || context.adminOfLlcIds.includes(llcId)) {
    return propertyIds;
  }
  return propertyIds.filter(id => hasPropertyAccess(context, llcId, id));
}
