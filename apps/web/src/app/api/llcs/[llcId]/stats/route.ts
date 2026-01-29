import { NextRequest, NextResponse } from 'next/server';
import { requireLlcMember } from '@/lib/auth/requireLlcMember';
import { getLlcDashboardStats } from '@/lib/services/dashboard.service';

/**
 * GET /api/llcs/[llcId]/stats
 * Get dashboard stats for a specific LLC
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ llcId: string }> }
) {
  try {
    const { llcId } = await params;

    // Verify user is a member (any role can view stats)
    await requireLlcMember(llcId);

    const stats = await getLlcDashboardStats(llcId);

    if (!stats) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'LLC not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('UNAUTHENTICATED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
        { status: 401 }
      );
    }

    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'Not authorized' } },
        { status: 403 }
      );
    }

    console.error('Error fetching LLC stats:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch LLC stats' } },
      { status: 500 }
    );
  }
}
