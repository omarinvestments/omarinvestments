import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { requireLlcRole } from '@/lib/auth/requireLlcMember';
import { getTenant, updateTenant, deleteTenant } from '@/lib/services/tenant.service';
import { updateTenantSchema } from '@shared/types';

interface RouteParams {
  params: Promise<{ llcId: string; tenantId: string }>;
}

/**
 * GET /api/llcs/[llcId]/tenants/[tenantId]
 * Get a single tenant
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { llcId, tenantId } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
      { status: 401 }
    );
  }

  try {
    await requireLlcRole(llcId, ['admin', 'manager', 'accounting', 'maintenance', 'legal', 'readOnly']);

    const tenant = await getTenant(tenantId);
    if (!tenant) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Tenant not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: tenant });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'No access to this LLC' } },
        { status: 403 }
      );
    }
    console.error('Error fetching tenant:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch tenant' } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/llcs/[llcId]/tenants/[tenantId]
 * Update a tenant
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { llcId, tenantId } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
      { status: 401 }
    );
  }

  try {
    await requireLlcRole(llcId, ['admin', 'manager']);

    const body = await request.json();
    const parsed = updateTenantSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: parsed.error.issues[0]?.message || 'Invalid input' } },
        { status: 400 }
      );
    }

    const updated = await updateTenant(tenantId, parsed.data, user.uid);
    return NextResponse.json({ ok: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'Admin or manager access required' } },
        { status: 403 }
      );
    }
    if (message.includes('not found')) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Tenant not found' } },
        { status: 404 }
      );
    }
    console.error('Error updating tenant:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update tenant' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/llcs/[llcId]/tenants/[tenantId]
 * Delete a tenant (only if no active leases)
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { llcId, tenantId } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
      { status: 401 }
    );
  }

  try {
    await requireLlcRole(llcId, ['admin']);

    const result = await deleteTenant(tenantId, user.uid);
    return NextResponse.json({ ok: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'Admin access required' } },
        { status: 403 }
      );
    }
    if (message.includes('not found')) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Tenant not found' } },
        { status: 404 }
      );
    }
    if (message.includes('active leases')) {
      return NextResponse.json(
        { ok: false, error: { code: 'HAS_LEASES', message: 'Cannot delete tenant with active leases' } },
        { status: 409 }
      );
    }
    console.error('Error deleting tenant:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete tenant' } },
      { status: 500 }
    );
  }
}
