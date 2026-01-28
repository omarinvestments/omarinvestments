import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { requireLlcRole } from '@/lib/auth/requireLlcMember';
import { getPayment } from '@/lib/services/payment.service';

interface RouteParams {
  params: Promise<{ llcId: string; paymentId: string }>;
}

/**
 * GET /api/llcs/[llcId]/payments/[paymentId]
 * Get a single payment
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { llcId, paymentId } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
      { status: 401 }
    );
  }

  try {
    await requireLlcRole(llcId, ['admin', 'manager', 'accounting', 'readOnly']);

    const payment = await getPayment(llcId, paymentId);
    if (!payment) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Payment not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: payment });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'No access to this LLC' } },
        { status: 403 }
      );
    }
    console.error('Error getting payment:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get payment' } },
      { status: 500 }
    );
  }
}
