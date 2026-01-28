import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { requireLlcRole } from '@/lib/auth/requireLlcMember';
import { getUnit, updateUnit, deleteUnit } from '@/lib/services/unit.service';
import { updateUnitSchema } from '@shared/types';

interface RouteParams {
  params: Promise<{ llcId: string; propertyId: string; unitId: string }>;
}

/**
 * GET /api/llcs/[llcId]/properties/[propertyId]/units/[unitId]
 * Get a single unit
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { llcId, propertyId, unitId } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
      { status: 401 }
    );
  }

  try {
    await requireLlcRole(llcId, ['admin', 'manager', 'accounting', 'maintenance', 'legal', 'readOnly']);

    const unit = await getUnit(llcId, propertyId, unitId);
    if (!unit) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Unit not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: unit });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'No access to this LLC' } },
        { status: 403 }
      );
    }
    console.error('Error fetching unit:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch unit' } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/llcs/[llcId]/properties/[propertyId]/units/[unitId]
 * Update a unit
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { llcId, propertyId, unitId } = await params;

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
    const parsed = updateUnitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: parsed.error.issues[0]?.message || 'Invalid input' } },
        { status: 400 }
      );
    }

    const updated = await updateUnit(llcId, propertyId, unitId, parsed.data, user.uid);
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
        { ok: false, error: { code: 'NOT_FOUND', message: 'Unit not found' } },
        { status: 404 }
      );
    }
    console.error('Error updating unit:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update unit' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/llcs/[llcId]/properties/[propertyId]/units/[unitId]
 * Delete a unit (only if not occupied)
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { llcId, propertyId, unitId } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
      { status: 401 }
    );
  }

  try {
    await requireLlcRole(llcId, ['admin']);

    const result = await deleteUnit(llcId, propertyId, unitId, user.uid);
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
        { ok: false, error: { code: 'NOT_FOUND', message: 'Unit not found' } },
        { status: 404 }
      );
    }
    if (message.includes('occupied')) {
      return NextResponse.json(
        { ok: false, error: { code: 'UNIT_OCCUPIED', message: 'Cannot delete an occupied unit' } },
        { status: 409 }
      );
    }
    console.error('Error deleting unit:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete unit' } },
      { status: 500 }
    );
  }
}
