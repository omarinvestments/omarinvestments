import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/checkPermission';
import { recordMortgagePaymentSchema } from '@shared/validators/mortgage';
import {
  getMortgage,
  getPaymentHistory,
  recordPayment,
} from '@/lib/services/mortgage.service';

interface RouteParams {
  params: Promise<{ mortgageId: string }>;
}

/**
 * GET /api/admin/mortgages/[mortgageId]/payments
 * Get payment history for a mortgage (super-admin only)
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireSuperAdmin();

    const { mortgageId } = await params;

    // Verify mortgage exists
    const mortgage = await getMortgage(mortgageId);
    if (!mortgage) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Mortgage not found' } },
        { status: 404 }
      );
    }

    const payments = await getPaymentHistory(mortgageId);

    // Calculate totals
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalPrincipal = payments.reduce((sum, p) => sum + p.principalAmount, 0);
    const totalInterest = payments.reduce((sum, p) => sum + p.interestAmount, 0);
    const totalEscrow = payments.reduce((sum, p) => sum + (p.escrowAmount || 0), 0);

    return NextResponse.json({
      ok: true,
      data: {
        payments,
        summary: {
          paymentCount: payments.length,
          totalPaid,
          totalPrincipal,
          totalInterest,
          totalEscrow,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED') || message.includes('Super-admin')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'Super-admin access required' } },
        { status: 403 }
      );
    }
    if (message.includes('UNAUTHENTICATED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
        { status: 401 }
      );
    }
    console.error('Error fetching payment history:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch payment history' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/mortgages/[mortgageId]/payments
 * Record a new payment (super-admin only)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireSuperAdmin();

    const { mortgageId } = await params;
    const body = await request.json();
    const parseResult = recordMortgagePaymentSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: parseResult.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const payment = await recordPayment(mortgageId, parseResult.data, context.userId);

    return NextResponse.json({
      ok: true,
      data: payment,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED') || message.includes('Super-admin')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'Super-admin access required' } },
        { status: 403 }
      );
    }
    if (message.includes('UNAUTHENTICATED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
        { status: 401 }
      );
    }
    if (message.includes('NOT_FOUND')) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Mortgage not found' } },
        { status: 404 }
      );
    }
    console.error('Error recording payment:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to record payment' } },
      { status: 500 }
    );
  }
}
