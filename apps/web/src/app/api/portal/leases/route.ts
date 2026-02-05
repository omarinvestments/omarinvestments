import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { getTenantLeases } from '@/lib/services/portal.service';

/**
 * GET /api/portal/leases
 * Get all leases for the authenticated tenant.
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

    const leases = await getTenantLeases(user.uid);

    return NextResponse.json({ ok: true, data: leases });
  } catch (error) {
    console.error('Error fetching tenant leases:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch leases' },
      { status: 500 }
    );
  }
}
