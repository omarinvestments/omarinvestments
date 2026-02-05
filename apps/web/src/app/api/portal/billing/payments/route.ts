import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { getTenantPayments } from '@/lib/services/portal.service';

/**
 * GET /api/portal/billing/payments
 * Get paginated payments for the authenticated tenant.
 * Query params: page, limit, leaseId (optional filter)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const leaseId = searchParams.get('leaseId') || undefined;

    // Validate pagination params
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { ok: false, error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    const payments = await getTenantPayments(user.uid, { page, limit, leaseId });

    return NextResponse.json({ ok: true, data: payments });
  } catch (error) {
    console.error('Error fetching tenant payments:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}
