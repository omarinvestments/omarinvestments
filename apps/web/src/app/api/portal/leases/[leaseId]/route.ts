import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { getTenantLeaseDetail } from '@/lib/services/portal.service';

interface RouteParams {
  params: Promise<{ leaseId: string }>;
}

/**
 * GET /api/portal/leases/[leaseId]
 * Get a single lease detail for the authenticated tenant.
 * Note: Requires llcId as query parameter since lease IDs are LLC-scoped.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { leaseId } = await params;
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

    const lease = await getTenantLeaseDetail(user.uid, llcId, leaseId);

    if (!lease) {
      return NextResponse.json(
        { ok: false, error: 'Lease not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: lease });
  } catch (error) {
    console.error('Error fetching tenant lease detail:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch lease detail' },
      { status: 500 }
    );
  }
}
