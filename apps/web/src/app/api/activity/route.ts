import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { getRecentActivity } from '@/lib/services/activity.service';

/**
 * GET /api/activity?limit=20
 * Get recent activity across all user's LLCs
 */
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const clampedLimit = Math.min(Math.max(1, limit), 100); // Clamp between 1-100

    const activity = await getRecentActivity(user.uid, clampedLimit);
    return NextResponse.json({ ok: true, data: activity });
  } catch (error) {
    console.error('Error fetching activity:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch activity' } },
      { status: 500 }
    );
  }
}
