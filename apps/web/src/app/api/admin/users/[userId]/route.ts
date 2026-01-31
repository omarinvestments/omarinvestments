import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/checkPermission';
import {
  getUser,
  updateUser,
  syncFromAuth,
} from '@/lib/services/user.service';
import { listUserAssignments } from '@/lib/services/assignment.service';
import { updateUserSchema } from '@shared/types';

interface RouteParams {
  params: Promise<{ userId: string }>;
}

/**
 * GET /api/admin/users/[userId]
 * Get a specific user with their assignments (super-admin only)
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireSuperAdmin();

    const { userId } = await params;
    const user = await getUser(userId);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      );
    }

    const assignments = await listUserAssignments(userId);

    return NextResponse.json({
      ok: true,
      data: { ...user, assignments },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED') || message.includes('Super-admin')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'Super-admin access required' } },
        { status: 403 }
      );
    }
    if (message.includes('UNAUTHENTICATED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
        { status: 401 }
      );
    }
    console.error('Error getting user:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get user' } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users/[userId]
 * Update a user (super-admin only)
 * Body: { displayName?: string, isSuperAdmin?: boolean }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireSuperAdmin();
    const { userId } = await params;

    // Prevent removing own super-admin status
    if (userId === context.userId) {
      const body = await request.json();
      if (body.isSuperAdmin === false) {
        return NextResponse.json(
          { ok: false, error: { code: 'INVALID_INPUT', message: 'Cannot remove your own super-admin status' } },
          { status: 400 }
        );
      }
    }

    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: parsed.error.issues[0]?.message || 'Invalid input' } },
        { status: 400 }
      );
    }

    const user = await updateUser(userId, parsed.data);
    const assignments = await listUserAssignments(userId);

    return NextResponse.json({
      ok: true,
      data: { ...user, assignments },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED') || message.includes('Super-admin')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'Super-admin access required' } },
        { status: 403 }
      );
    }
    if (message.includes('UNAUTHENTICATED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
        { status: 401 }
      );
    }
    console.error('Error updating user:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update user' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users/[userId]/sync
 * Sync user data from Firebase Auth (super-admin only)
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireSuperAdmin();

    const { userId } = await params;
    const user = await syncFromAuth(userId);
    const assignments = await listUserAssignments(userId);

    return NextResponse.json({
      ok: true,
      data: { ...user, assignments },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED') || message.includes('Super-admin')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'Super-admin access required' } },
        { status: 403 }
      );
    }
    if (message.includes('UNAUTHENTICATED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
        { status: 401 }
      );
    }
    console.error('Error syncing user:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to sync user' } },
      { status: 500 }
    );
  }
}
