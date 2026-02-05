import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { getTenantSummary } from '@/lib/services/portal.service';

/**
 * GET /api/portal/summary
 * Get dashboard summary for the authenticated tenant.
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const summary = await getTenantSummary(user.uid);

    return NextResponse.json({ ok: true, data: summary });
  } catch (error) {
    console.error('Error fetching tenant summary:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch summary' },
      { status: 500 }
    );
  }
}
