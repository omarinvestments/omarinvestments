import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { requireLlcRole } from '@/lib/auth/requireLlcMember';
import { restoreLlc } from '@/lib/services/llc.service';

interface RouteParams {
  params: Promise<{ llcId: string }>;
}

/**
 * POST /api/llcs/[llcId]/restore
 * Restore an archived LLC (admin only)
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { llcId } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } }, { status: 401 });
  }

  try {
    await requireLlcRole(llcId, ['admin']);

    const result = await restoreLlc(llcId, user.uid);
    return NextResponse.json({ ok: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'Admin access required' } },
        { status: 403 }
      );
    }
    if (message.includes('not archived')) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_ARCHIVED', message: 'LLC is not archived' } },
        { status: 400 }
      );
    }
    console.error('Error restoring LLC:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to restore LLC' } },
      { status: 500 }
    );
  }
}
