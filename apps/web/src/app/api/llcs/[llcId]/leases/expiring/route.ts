import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { requireLlcRole } from '@/lib/auth/requireLlcMember';
import { getLeasesNearingExpiration } from '@/lib/services/lease.service';

interface RouteParams {
  params: Promise<{ llcId: string }>;
}

/**
 * GET /api/llcs/[llcId]/leases/expiring
 * List active leases nearing expiration
 * Query params: ?days=60 (default 60)
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
    const daysParam = searchParams.get('days');
    const days = daysParam ? parseInt(daysParam, 10) : 60;

    if (isNaN(days) || days < 1 || days > 365) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: 'Days must be between 1 and 365' } },
        { status: 400 }
      );
    }

    const leases = await getLeasesNearingExpiration(llcId, days);
    return NextResponse.json({ ok: true, data: leases });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'No access to this LLC' } },
        { status: 403 }
      );
    }
    console.error('Error listing expiring leases:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list expiring leases' } },
      { status: 500 }
    );
  }
}
