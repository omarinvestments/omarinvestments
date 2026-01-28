import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { acceptInvitation } from '@/lib/services/member.service';

interface RouteParams {
  params: Promise<{ llcId: string }>;
}

/**
 * POST /api/invitations/[llcId]/accept
 * Accept an invitation to join an LLC
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { llcId } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
      { status: 401 }
    );
  }

  try {
    const member = await acceptInvitation(llcId, user.uid);
    return NextResponse.json({ ok: true, data: member });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';

    if (message.includes('NOT_FOUND')) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'No invitation found for this LLC' } },
        { status: 404 }
      );
    }
    if (message.includes('INVALID_STATUS')) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_STATUS', message: 'This invitation has already been processed' } },
        { status: 400 }
      );
    }

    console.error('Error accepting invitation:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to accept invitation' } },
      { status: 500 }
    );
  }
}
