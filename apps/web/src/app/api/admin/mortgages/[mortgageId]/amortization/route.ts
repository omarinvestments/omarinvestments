import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/checkPermission';
import {
  getMortgage,
  calculateAmortizationSchedule,
  calculateRemainingAmortization,
  calculateExtraPaymentSavings,
} from '@/lib/services/mortgage.service';

interface RouteParams {
  params: Promise<{ mortgageId: string }>;
}

/**
 * GET /api/admin/mortgages/[mortgageId]/amortization
 * Get amortization schedule for a mortgage (super-admin only)
 * Query params:
 * - type: 'full' (from origination) or 'remaining' (from current balance, default)
 * - extraPayment: Calculate savings from extra monthly payment (amount in cents)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireSuperAdmin();

    const { mortgageId } = await params;
    const { searchParams } = new URL(request.url);
    const scheduleType = searchParams.get('type') || 'remaining';
    const extraPaymentParam = searchParams.get('extraPayment');
    const extraPayment = extraPaymentParam !== null && extraPaymentParam !== undefined
      ? parseInt(extraPaymentParam, 10)
      : undefined;

    const mortgage = await getMortgage(mortgageId);
    if (!mortgage) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Mortgage not found' } },
        { status: 404 }
      );
    }

    // Calculate appropriate schedule
    const schedule = scheduleType === 'full'
      ? calculateAmortizationSchedule(mortgage)
      : calculateRemainingAmortization(mortgage);

    // Calculate totals from schedule
    const totalPayments = schedule.length;
    const totalInterest = schedule.reduce((sum, e) => sum + e.interest, 0);
    const totalPrincipal = schedule.reduce((sum, e) => sum + e.principal, 0);

    // Calculate extra payment savings if requested
    let extraPaymentSavings = undefined;
    if (extraPayment && extraPayment > 0) {
      extraPaymentSavings = calculateExtraPaymentSavings(mortgage, extraPayment);
    }

    return NextResponse.json({
      ok: true,
      data: {
        schedule,
        summary: {
          totalPayments,
          totalPrincipal,
          totalInterest,
          totalAmount: totalPrincipal + totalInterest,
          firstPaymentDate: schedule[0]?.paymentDate,
          lastPaymentDate: schedule[schedule.length - 1]?.paymentDate,
        },
        extraPaymentSavings,
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
    console.error('Error calculating amortization:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to calculate amortization' } },
      { status: 500 }
    );
  }
}
