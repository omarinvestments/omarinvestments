import { adminDb } from '@/lib/firebase/admin';
import { requireUser, getAuthUser, AuthenticatedUser } from './requireUser';
import {
  PermissionContext,
  UserAssignment,
  EmployeeCapabilities,
  UserType,
  TenantLink,
} from '@shared/types';

/**
 * Build the full permission context for the authenticated user.
 * This fetches:
 * - User record (for userType, super-admin flag, tenant links)
 * - LLC memberships (admin roles)
 * - User assignments (manager/employee roles)
 */
export async function buildPermissionContext(
  user: AuthenticatedUser
): Promise<PermissionContext> {
  // Fetch user record, LLC memberships, and assignments in parallel
  const [userSnap, assignmentsSnap, llcMembershipsSnap] = await Promise.all([
    adminDb.collection('users').doc(user.uid).get(),
    adminDb.collection('userAssignments')
      .where('userId', '==', user.uid)
      .where('status', '==', 'active')
      .get(),
    adminDb.collectionGroup('members')
      .where('userId', '==', user.uid)
      .where('role', '==', 'admin')
      .where('status', '==', 'active')
      .get(),
  ]);

  // Get user data
  const userData = userSnap.exists ? userSnap.data() : null;
  const userType: UserType = userData?.userType || 'tenant';
  const isSuperAdmin = userData?.isSuperAdmin === true;
  const tenantLinks: TenantLink[] = userData?.tenantLinks || [];

  // Parse assignments
  const assignments: UserAssignment[] = assignmentsSnap.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as UserAssignment[];

  // Parse LLC admin memberships
  const adminOfLlcIds: string[] = [];
  for (const doc of llcMembershipsSnap.docs) {
    // Path is: llcs/{llcId}/members/{userId}
    const pathParts = doc.ref.path.split('/');
    const llcId = pathParts[1];
    if (llcId) {
      adminOfLlcIds.push(llcId);
    }
  }

  // Aggregate assigned LLC IDs and property IDs from assignments
  const assignedLlcIds = new Set<string>();
  const assignedPropertyIds = new Set<string>();
  let aggregatedCapabilities: EmployeeCapabilities = {
    workOrderAccess: false,
    taskAccess: false,
    paymentProcessing: false,
  };

  for (const assignment of assignments) {
    // Add LLC IDs
    for (const llcId of assignment.llcIds || []) {
      assignedLlcIds.add(llcId);
    }
    // Add property IDs
    for (const propertyId of assignment.propertyIds || []) {
      assignedPropertyIds.add(propertyId);
    }
    // Merge capabilities (any true value wins)
    if (assignment.capabilities) {
      aggregatedCapabilities = {
        workOrderAccess: aggregatedCapabilities.workOrderAccess || assignment.capabilities.workOrderAccess,
        taskAccess: aggregatedCapabilities.taskAccess || assignment.capabilities.taskAccess,
        paymentProcessing: aggregatedCapabilities.paymentProcessing || assignment.capabilities.paymentProcessing,
      };
    }
  }

  // Determine effective role (highest privilege wins)
  let effectiveRole: PermissionContext['effectiveRole'] = null;
  if (isSuperAdmin) {
    effectiveRole = 'superAdmin';
  } else if (adminOfLlcIds.length > 0) {
    effectiveRole = 'admin';
  } else if (assignments.some(a => a.role === 'manager')) {
    effectiveRole = 'manager';
  } else if (assignments.some(a => a.role === 'employee')) {
    effectiveRole = 'employee';
  } else if (userType === 'tenant') {
    effectiveRole = 'tenant';
  }

  return {
    userId: user.uid,
    email: user.email || '',
    displayName: userData?.displayName,
    userType,
    isSuperAdmin,
    effectiveRole,
    adminOfLlcIds,
    assignedLlcIds: Array.from(assignedLlcIds),
    assignedPropertyIds: Array.from(assignedPropertyIds),
    capabilities: aggregatedCapabilities,
    assignments,
    tenantLinks,
  };
}

/**
 * Get permission context for the current user.
 * Returns null if not authenticated.
 */
export async function getPermissionContext(): Promise<PermissionContext | null> {
  const user = await getAuthUser();
  if (!user) {
    return null;
  }
  return buildPermissionContext(user);
}

/**
 * Require permission context. Throws if not authenticated.
 */
export async function requirePermissionContext(): Promise<PermissionContext> {
  const user = await requireUser();
  return buildPermissionContext(user);
}

/**
 * Check if a user has access to a specific LLC.
 */
export function hasLlcAccess(context: PermissionContext, llcId: string): boolean {
  // Super-admin has access to all
  if (context.isSuperAdmin) {
    return true;
  }
  // Admin of the LLC
  if (context.adminOfLlcIds.includes(llcId)) {
    return true;
  }
  // Assigned to the LLC (manager/employee)
  if (context.assignedLlcIds.includes(llcId)) {
    return true;
  }
  return false;
}

/**
 * Check if a user has access to a specific property.
 */
export function hasPropertyAccess(
  context: PermissionContext,
  llcId: string,
  propertyId: string
): boolean {
  // Super-admin has access to all
  if (context.isSuperAdmin) {
    return true;
  }
  // Admin of the LLC has access to all properties
  if (context.adminOfLlcIds.includes(llcId)) {
    return true;
  }
  // Check if manager with access to this specific property
  if (context.effectiveRole === 'manager') {
    // If no property scopes defined, has access to all properties in assigned LLCs
    if (context.assignedPropertyIds.length === 0 && context.assignedLlcIds.includes(llcId)) {
      return true;
    }
    // Check specific property access
    if (context.assignedPropertyIds.includes(propertyId)) {
      return true;
    }
  }
  return false;
}

/**
 * Get all LLC IDs a user has any access to.
 */
export function getAccessibleLlcIds(context: PermissionContext): string[] {
  if (context.isSuperAdmin) {
    // Super-admin has access to all - return empty to indicate "fetch all"
    return [];
  }
  // Combine admin and assigned LLCs
  const llcIds = new Set<string>([
    ...context.adminOfLlcIds,
    ...context.assignedLlcIds,
  ]);
  return Array.from(llcIds);
}

/**
 * Check if user can manage other users in an LLC.
 */
export function canManageLlcMembers(context: PermissionContext, llcId: string): boolean {
  // Super-admin can manage all
  if (context.isSuperAdmin) {
    return true;
  }
  // Admin of the specific LLC can manage
  if (context.adminOfLlcIds.includes(llcId)) {
    return true;
  }
  return false;
}
