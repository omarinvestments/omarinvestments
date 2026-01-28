import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { getTenant, updateTenant, deleteTenant } from '@/lib/services/tenant.service';
import { updateTenantSchema } from '@shared/types';

interface RouteContext {
  params: Promise<{ tenantId: string }>;
}

/**
 * GET /api/tenants/[tenantId]
 * Get a single tenant by ID
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const { tenantId } = await context.params;
    const tenant = await getTenant(tenantId);

    if (!tenant) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Tenant not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: tenant });
  } catch (error) {
    console.error('Error getting tenant:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get tenant' } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tenants/[tenantId]
 * Update a tenant
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const { tenantId } = await context.params;

    // Check tenant exists
    const existingTenant = await getTenant(tenantId);
    if (!existingTenant) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Tenant not found' } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = updateTenantSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid tenant data',
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const tenant = await updateTenant(tenantId, parsed.data, user.uid);

    return NextResponse.json({ ok: true, data: tenant });
  } catch (error) {
    console.error('Error updating tenant:', error);
    const message = error instanceof Error ? error.message : 'Failed to update tenant';
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tenants/[tenantId]
 * Delete a tenant (only if no active leases)
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const { tenantId } = await context.params;

    // Check tenant exists
    const existingTenant = await getTenant(tenantId);
    if (!existingTenant) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Tenant not found' } },
        { status: 404 }
      );
    }

    const result = await deleteTenant(tenantId, user.uid);

    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    console.error('Error deleting tenant:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete tenant';

    // Check if it's a "has active leases" error
    if (message.includes('active leases')) {
      return NextResponse.json(
        { ok: false, error: { code: 'HAS_ACTIVE_LEASES', message } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    );
  }
}
