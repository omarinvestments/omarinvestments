import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { createTenant, listAllTenants } from '@/lib/services/tenant.service';
import { createActivation } from '@/lib/services/activation.service';
import { createTenantSchema } from '@shared/types';

/**
 * GET /api/tenants
 * List all tenants (requires admin-level access)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const tenants = await listAllTenants(limit);

    return NextResponse.json({ ok: true, data: tenants });
  } catch (error) {
    console.error('Error listing tenants:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list tenants' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tenants
 * Create a new global tenant
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = createTenantSchema.safeParse(body);

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
            llcIds: [],
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
            llcIds: [],
            tenantId: tenant.id,
          }, user.uid);
        }
      }
    } catch (activationError) {
      // Log but don't fail the tenant creation
      console.error('Failed to create activation for tenant:', activationError);
    }

    return NextResponse.json({ ok: true, data: tenant }, { status: 201 });
  } catch (error) {
    console.error('Error creating tenant:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create tenant' } },
      { status: 500 }
    );
  }
}
