import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { requireLlcRole } from '@/lib/auth/requireLlcMember';
import { createTenant, listAllTenants } from '@/lib/services/tenant.service';
import { createActivation } from '@/lib/services/activation.service';
import { createTenantSchema } from '@shared/types';

interface RouteParams {
  params: Promise<{ llcId: string }>;
}

/**
 * GET /api/llcs/[llcId]/tenants
 * List all tenants for an LLC (optionally filter by propertyId query param)
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { llcId } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
      { status: 401 }
    );
  }

  try {
    await requireLlcRole(llcId, ['admin', 'manager', 'accounting', 'maintenance', 'legal', 'readOnly']);

    // Tenants are now global - return all tenants
    const tenants = await listAllTenants();
    return NextResponse.json({ ok: true, data: tenants });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'No access to this LLC' } },
        { status: 403 }
      );
    }
    console.error('Error listing tenants:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list tenants' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/llcs/[llcId]/tenants
 * Create a new tenant (residential or commercial)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { llcId } = await params;

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
    const parsed = createTenantSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: parsed.error.issues[0]?.message || 'Invalid input' } },
        { status: 400 }
      );
    }

    const tenant = await createTenant(parsed.data, user.uid);

    // Create pending activation for account activation
    try {
      if (tenant.type === 'residential') {
        if (tenant.dateOfBirth && tenant.ssn4) {
          await createActivation({
            type: 'residential',
            role: 'tenant',
            firstName: tenant.firstName,
            middleInitial: tenant.middleInitial || undefined,
            lastName: tenant.lastName,
            dateOfBirth: tenant.dateOfBirth,
            ssn4: tenant.ssn4,
            llcIds: [llcId],
            tenantId: tenant.id,
          }, user.uid);
        }
      } else {
        if (tenant.einLast4 && tenant.businessName) {
          await createActivation({
            type: 'commercial',
            role: 'tenant',
            firstName: tenant.primaryContact.name.split(' ')[0] || tenant.businessName,
            lastName: tenant.primaryContact.name.split(' ').slice(1).join(' ') || '',
            dateOfBirth: '1900-01-01', // Commercial entities use EIN/business name for verification
            einLast4: tenant.einLast4,
            businessName: tenant.businessName,
            llcIds: [llcId],
            tenantId: tenant.id,
          }, user.uid);
        }
      }
    } catch (activationError) {
      // Log but don't fail the tenant creation
      console.error('Failed to create activation for tenant:', activationError);
    }

    return NextResponse.json({ ok: true, data: tenant }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'Admin or manager access required' } },
        { status: 403 }
      );
    }
    console.error('Error creating tenant:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create tenant' } },
      { status: 500 }
    );
  }
}
