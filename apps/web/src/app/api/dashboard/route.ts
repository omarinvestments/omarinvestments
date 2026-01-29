import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { getOwnerDashboardStats } from '@/lib/services/dashboard.service';

/**
 * GET /api/dashboard
 * Get aggregated dashboard stats across all user's LLCs
 */
export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
      { status: 401 }
    );
  }

  try {
    const stats = await getOwnerDashboardStats(user.uid);
    return NextResponse.json({ ok: true, data: stats });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch dashboard stats' } },
      { status: 500 }
    );
  }
}
