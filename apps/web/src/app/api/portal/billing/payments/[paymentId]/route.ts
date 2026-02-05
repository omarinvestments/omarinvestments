import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { getTenantPaymentDetail } from '@/lib/services/portal.service';

interface RouteParams {
  params: Promise<{ paymentId: string }>;
}

/**
 * GET /api/portal/billing/payments/[paymentId]
 * Get a single payment detail for the authenticated tenant.
 * Note: Requires llcId as query parameter since payment IDs are LLC-scoped.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { paymentId } = await params;
    const { searchParams } = new URL(request.url);
    const llcId = searchParams.get('llcId');

    if (!llcId) {
      return NextResponse.json(
        { ok: false, error: 'llcId query parameter is required' },
        { status: 400 }
      );
    }

    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const payment = await getTenantPaymentDetail(user.uid, llcId, paymentId);

    if (!payment) {
      return NextResponse.json(
        { ok: false, error: 'Payment not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: payment });
  } catch (error) {
    console.error('Error fetching tenant payment detail:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch payment detail' },
      { status: 500 }
    );
  }
}
