import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { requireLlcRole } from '@/lib/auth/requireLlcMember';
import { inviteMember, listMembers } from '@/lib/services/member.service';
import { inviteMemberSchema } from '@shared/types';

interface RouteParams {
  params: Promise<{ llcId: string }>;
}

/**
 * GET /api/llcs/[llcId]/members
 * List all members of an LLC
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { llcId } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
      { status: 401 }
    );
  }

  try {
    await requireLlcRole(llcId, ['admin', 'manager']);

    const members = await listMembers(llcId);
    return NextResponse.json({ ok: true, data: members });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'Admin or manager access required' } },
        { status: 403 }
      );
    }
    console.error('Error listing members:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list members' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/llcs/[llcId]/members
 * Invite a member to an LLC (admin only)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { llcId } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
      { status: 401 }
    );
  }

  try {
    await requireLlcRole(llcId, ['admin']);

    const body = await request.json();
    const parsed = inviteMemberSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues?.[0]?.message || 'Invalid input';
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message } },
        { status: 400 }
      );
    }

    const member = await inviteMember(llcId, parsed.data, user.uid);
    return NextResponse.json({ ok: true, data: member }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'Admin access required' } },
        { status: 403 }
      );
    }
    if (message.includes('ALREADY_MEMBER')) {
      return NextResponse.json(
        { ok: false, error: { code: 'ALREADY_MEMBER', message: 'User is already a member of this LLC' } },
        { status: 409 }
      );
    }
    if (message.includes('MEMBER_DISABLED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'MEMBER_DISABLED', message: 'User is a disabled member. Reactivate them instead.' } },
        { status: 409 }
      );
    }
    if (message.includes('auth/user-not-found')) {
      return NextResponse.json(
        { ok: false, error: { code: 'USER_NOT_FOUND', message: 'No account found with that email address' } },
        { status: 404 }
      );
    }
    console.error('Error inviting member:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to invite member' } },
      { status: 500 }
    );
  }
}
