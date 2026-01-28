import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { searchTenants } from '@/lib/services/tenant.service';

/**
 * GET /api/tenants/search?q=<query>&limit=<limit>
 * Search tenants by name or email
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!query.trim()) {
      return NextResponse.json(
        { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Search query is required' } },
        { status: 400 }
      );
    }

    const tenants = await searchTenants(query, limit);

    return NextResponse.json({ ok: true, data: tenants });
  } catch (error) {
    console.error('Error searching tenants:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to search tenants' } },
      { status: 500 }
    );
  }
}
