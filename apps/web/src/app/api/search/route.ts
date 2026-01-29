import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { globalSearch } from '@/lib/services/search.service';

/**
 * GET /api/search?q=query&limit=10
 * Search across all entities in user's LLCs
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
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const clampedLimit = Math.min(Math.max(1, limit), 50);

    const results = await globalSearch(user.uid, query, clampedLimit);
    return NextResponse.json({ ok: true, data: results });
  } catch (error) {
    console.error('Error searching:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Search failed' } },
      { status: 500 }
    );
  }
}
