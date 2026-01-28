import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { requireLlcRole } from '@/lib/auth/requireLlcMember';
import { createUnit, listUnits } from '@/lib/services/unit.service';
import { createUnitSchema } from '@shared/types';

interface RouteParams {
  params: Promise<{ llcId: string; propertyId: string }>;
}

/**
 * GET /api/llcs/[llcId]/properties/[propertyId]/units
 * List all units for a property
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { llcId, propertyId } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
      { status: 401 }
    );
  }

  try {
    await requireLlcRole(llcId, ['admin', 'manager', 'accounting', 'maintenance', 'legal', 'readOnly']);

    const units = await listUnits(llcId, propertyId);
    return NextResponse.json({ ok: true, data: units });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'No access to this LLC' } },
        { status: 403 }
      );
    }
    console.error('Error listing units:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list units' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/llcs/[llcId]/properties/[propertyId]/units
 * Create a new unit
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { llcId, propertyId } = await params;

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
    const parsed = createUnitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: parsed.error.issues[0]?.message || 'Invalid input' } },
        { status: 400 }
      );
    }

    const unit = await createUnit(llcId, propertyId, parsed.data, user.uid);
    return NextResponse.json({ ok: true, data: unit }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'Admin or manager access required' } },
        { status: 403 }
      );
    }
    console.error('Error creating unit:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create unit' } },
      { status: 500 }
    );
  }
}
