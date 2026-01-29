import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { getOwnerAlerts } from '@/lib/services/alerts.service';

/**
 * GET /api/alerts
 * Get all alerts across all user's LLCs
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
    const alerts = await getOwnerAlerts(user.uid);
    return NextResponse.json({ ok: true, data: alerts });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch alerts' } },
      { status: 500 }
    );
  }
}
