import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { createTenant, listAllTenants } from '@/lib/services/tenant.service';
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

    return NextResponse.json({ ok: true, data: tenant }, { status: 201 });
  } catch (error) {
    console.error('Error creating tenant:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create tenant' } },
      { status: 500 }
    );
  }
}
