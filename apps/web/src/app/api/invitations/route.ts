import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { listPendingInvitations } from '@/lib/services/member.service';

/**
 * GET /api/invitations
 * List all pending LLC invitations for the current user
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
    const invitations = await listPendingInvitations(user.uid);
    return NextResponse.json({ ok: true, data: invitations });
  } catch (error) {
    console.error('Error listing invitations:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list invitations' } },
      { status: 500 }
    );
  }
}
