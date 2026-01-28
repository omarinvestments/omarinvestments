import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { requireLlcRole } from '@/lib/auth/requireLlcMember';
import { recordPayment, listPayments } from '@/lib/services/payment.service';
import { recordPaymentSchema } from '@shared/types';

interface RouteParams {
  params: Promise<{ llcId: string }>;
}

/**
 * GET /api/llcs/[llcId]/payments
 * List payments with optional filters
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { llcId } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
      { status: 401 }
    );
  }

  try {
    await requireLlcRole(llcId, ['admin', 'manager', 'accounting', 'readOnly']);

    const { searchParams } = new URL(request.url);
    const filters = {
      status: searchParams.get('status') as 'requires_payment_method' | 'requires_confirmation' | 'processing' | 'succeeded' | 'failed' | 'canceled' | 'refunded' | undefined,
      leaseId: searchParams.get('leaseId') || undefined,
      tenantId: searchParams.get('tenantId') || undefined,
      fromDate: searchParams.get('fromDate') || undefined,
      toDate: searchParams.get('toDate') || undefined,
    };

    const payments = await listPayments(llcId, filters);
    return NextResponse.json({ ok: true, data: payments });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'No access to this LLC' } },
        { status: 403 }
      );
    }
    console.error('Error listing payments:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list payments' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/llcs/[llcId]/payments
 * Record a manual payment
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
    await requireLlcRole(llcId, ['admin', 'manager', 'accounting']);

    const body = await request.json();
    const parsed = recordPaymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: parsed.error.issues[0]?.message || 'Invalid input' } },
        { status: 400 }
      );
    }

    const payment = await recordPayment(llcId, parsed.data, user.uid);
    return NextResponse.json({ ok: true, data: payment }, { status: 201 });
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
        { ok: false, error: { code: 'NOT_FOUND', message: 'Lease not found' } },
        { status: 404 }
      );
    }
    if (message.includes('INVALID_ALLOCATION')) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_ALLOCATION', message: message.split(': ')[1] || message } },
        { status: 400 }
      );
    }
    console.error('Error recording payment:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to record payment' } },
      { status: 500 }
    );
  }
}
