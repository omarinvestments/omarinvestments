import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { getTenantChargeDetail } from '@/lib/services/portal.service';

interface RouteParams {
  params: Promise<{ chargeId: string }>;
}

/**
 * GET /api/portal/billing/charges/[chargeId]
 * Get a single charge detail for the authenticated tenant.
 * Note: Requires llcId as query parameter since charge IDs are LLC-scoped.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { chargeId } = await params;
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

    const charge = await getTenantChargeDetail(user.uid, llcId, chargeId);

    if (!charge) {
      return NextResponse.json(
        { ok: false, error: 'Charge not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: charge });
  } catch (error) {
    console.error('Error fetching tenant charge detail:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch charge detail' },
      { status: 500 }
    );
  }
}
