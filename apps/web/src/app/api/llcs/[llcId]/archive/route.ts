import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { requireLlcRole } from '@/lib/auth/requireLlcMember';
import { archiveLlc } from '@/lib/services/llc.service';

interface RouteParams {
  params: Promise<{ llcId: string }>;
}

/**
 * POST /api/llcs/[llcId]/archive
 * Archive an LLC (soft delete, admin only)
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { llcId } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } }, { status: 401 });
  }

  try {
    await requireLlcRole(llcId, ['admin']);

    const result = await archiveLlc(llcId, user.uid);
    return NextResponse.json({ ok: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'Admin access required' } },
        { status: 403 }
      );
    }
    if (message.includes('already archived')) {
      return NextResponse.json(
        { ok: false, error: { code: 'ALREADY_ARCHIVED', message: 'LLC is already archived' } },
        { status: 400 }
      );
    }
    console.error('Error archiving LLC:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to archive LLC' } },
      { status: 500 }
    );
  }
}
