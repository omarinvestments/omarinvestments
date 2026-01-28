import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { requireLlcRole } from '@/lib/auth/requireLlcMember';
import { getCharge, voidCharge } from '@/lib/services/charge.service';
import { voidChargeSchema } from '@shared/types';

interface RouteParams {
  params: Promise<{ llcId: string; chargeId: string }>;
}

/**
 * GET /api/llcs/[llcId]/charges/[chargeId]
 * Get a single charge
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { llcId, chargeId } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
      { status: 401 }
    );
  }

  try {
    await requireLlcRole(llcId, ['admin', 'manager', 'accounting', 'readOnly']);

    const charge = await getCharge(llcId, chargeId);
    if (!charge) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Charge not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: charge });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'No access to this LLC' } },
        { status: 403 }
      );
    }
    console.error('Error getting charge:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get charge' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/llcs/[llcId]/charges/[chargeId]
 * Void a charge (requires reason in body)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { llcId, chargeId } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
      { status: 401 }
    );
  }

  try {
    await requireLlcRole(llcId, ['admin', 'manager', 'accounting']);

    const body = await request.json();
    const parsed = voidChargeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: 'Reason is required to void a charge' } },
        { status: 400 }
      );
    }

    const charge = await voidCharge(llcId, chargeId, parsed.data.reason, user.uid);
    return NextResponse.json({ ok: true, data: charge });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'Admin, manager, or accounting access required' } },
        { status: 403 }
      );
    }
    if (message.includes('NOT_FOUND')) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Charge not found' } },
        { status: 404 }
      );
    }
    if (message.includes('INVALID_STATUS') || message.includes('ALREADY_VOID')) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_STATUS', message: message.split(': ')[1] || message } },
        { status: 400 }
      );
    }
    console.error('Error voiding charge:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to void charge' } },
      { status: 500 }
    );
  }
}
