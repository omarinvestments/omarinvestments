import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { buildPermissionContext } from '@/lib/auth/permissionContext';

export interface UserRoleContext {
  isAuthenticated: boolean;
  hasStaffRole: boolean;
  hasTenantRole: boolean;
  effectiveRole: string | null;
  userType: 'staff' | 'tenant';
  displayName?: string;
  email: string;
}

export async function GET() {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({
        ok: true,
        data: {
          isAuthenticated: false,
          hasStaffRole: false,
          hasTenantRole: false,
          effectiveRole: null,
          userType: 'tenant',
          email: '',
        } as UserRoleContext,
      });
    }

    const context = await buildPermissionContext(user);

    // Determine if user has staff role
    // Staff role = superAdmin OR admin of any LLC OR has any assignments (manager/employee)
    const hasStaffRole =
      context.isSuperAdmin ||
      context.adminOfLlcIds.length > 0 ||
      context.assignments.length > 0;

    // Determine if user has tenant role
    // Tenant role = has tenant links
    const hasTenantRole = context.tenantLinks.length > 0;

    return NextResponse.json({
      ok: true,
      data: {
        isAuthenticated: true,
        hasStaffRole,
        hasTenantRole,
        effectiveRole: context.effectiveRole,
        userType: context.userType,
        displayName: context.displayName,
        email: context.email,
      } as UserRoleContext,
    });
  } catch (error) {
    console.error('Error fetching user context:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch user context' },
      { status: 500 }
    );
  }
}
