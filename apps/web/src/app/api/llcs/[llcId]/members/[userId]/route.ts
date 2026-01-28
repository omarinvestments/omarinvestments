import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { requireLlcRole } from '@/lib/auth/requireLlcMember';
import { getMember, updateMember, removeMember } from '@/lib/services/member.service';
import { updateMemberSchema } from '@shared/types';

interface RouteParams {
  params: Promise<{ llcId: string; userId: string }>;
}

/**
 * GET /api/llcs/[llcId]/members/[userId]
 * Get a single member's details
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { llcId, userId } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
      { status: 401 }
    );
  }

  try {
    await requireLlcRole(llcId, ['admin', 'manager']);

    const member = await getMember(llcId, userId);
    if (!member) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Member not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: member });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'Admin or manager access required' } },
        { status: 403 }
      );
    }
    console.error('Error getting member:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get member' } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/llcs/[llcId]/members/[userId]
 * Update a member's role, scopes, or status (admin only)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { llcId, userId } = await params;

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
    const parsed = updateMemberSchema.safeParse(body);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues?.[0]?.message ?? 'Invalid input';
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: firstIssue } },
        { status: 400 }
      );
    }

    const updated = await updateMember(llcId, userId, parsed.data, user.uid);
    return NextResponse.json({ ok: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'Admin access required' } },
        { status: 403 }
      );
    }
    if (message.includes('NOT_FOUND')) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Member not found' } },
        { status: 404 }
      );
    }
    if (message.includes('LAST_ADMIN')) {
      return NextResponse.json(
        { ok: false, error: { code: 'LAST_ADMIN', message: 'Cannot demote the last active admin' } },
        { status: 409 }
      );
    }
    console.error('Error updating member:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update member' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/llcs/[llcId]/members/[userId]
 * Remove a member from an LLC (admin only)
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { llcId, userId } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
      { status: 401 }
    );
  }

  try {
    await requireLlcRole(llcId, ['admin']);

    await removeMember(llcId, userId, user.uid);
    return NextResponse.json({ ok: true, data: { removed: true } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'Admin access required' } },
        { status: 403 }
      );
    }
    if (message.includes('NOT_FOUND')) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Member not found' } },
        { status: 404 }
      );
    }
    if (message.includes('LAST_ADMIN')) {
      return NextResponse.json(
        { ok: false, error: { code: 'LAST_ADMIN', message: 'Cannot remove the last active admin' } },
        { status: 409 }
      );
    }
    console.error('Error removing member:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to remove member' } },
      { status: 500 }
    );
  }
}
