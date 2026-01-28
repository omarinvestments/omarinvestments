import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { requireLlcRole } from '@/lib/auth/requireLlcMember';
import { applyLateFee } from '@/lib/services/lateFee.service';

interface RouteParams {
  params: Promise<{ llcId: string; chargeId: string }>;
}

/**
 * POST /api/llcs/[llcId]/charges/[chargeId]/apply-late-fee
 * Apply a late fee to a charge
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
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

    const result = await applyLateFee(llcId, chargeId, user.uid);
    return NextResponse.json({ ok: true, data: result }, { status: 201 });
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
    if (message.includes('LATE_FEE_DISABLED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'LATE_FEE_DISABLED', message: 'Late fees are not enabled for this LLC' } },
        { status: 400 }
      );
    }
    if (message.includes('INVALID_STATUS') || message.includes('INVALID_TYPE')) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_CHARGE', message: message.split(': ')[1] || 'Cannot apply late fee to this charge' } },
        { status: 400 }
      );
    }
    if (message.includes('ALREADY_APPLIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'ALREADY_APPLIED', message: 'Late fee has already been applied to this charge' } },
        { status: 400 }
      );
    }
    if (message.includes('GRACE_PERIOD')) {
      return NextResponse.json(
        { ok: false, error: { code: 'GRACE_PERIOD', message: 'Charge is still within grace period' } },
        { status: 400 }
      );
    }
    if (message.includes('ZERO_FEE')) {
      return NextResponse.json(
        { ok: false, error: { code: 'ZERO_FEE', message: 'Calculated late fee is zero' } },
        { status: 400 }
      );
    }
    console.error('Error applying late fee:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to apply late fee' } },
      { status: 500 }
    );
  }
}
