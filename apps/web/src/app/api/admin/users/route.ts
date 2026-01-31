import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/checkPermission';
import {
  listUsers,
  searchUsersByEmail,
  getOrCreateUser,
} from '@/lib/services/user.service';
import { listUserAssignments } from '@/lib/services/assignment.service';

/**
 * GET /api/admin/users
 * List all users (super-admin only)
 * Query params:
 * - search: search by email prefix
 * - superAdminsOnly: only return super-admins
 * - userType: filter by user type ('staff' | 'tenant')
 * - limit: max results (default 50)
 */
export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const superAdminsOnly = searchParams.get('superAdminsOnly') === 'true';
    const userType = searchParams.get('userType') as 'staff' | 'tenant' | null;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    let users;
    if (search) {
      users = await searchUsersByEmail(search, limit);
    } else {
      users = await listUsers({
        limit,
        superAdminsOnly,
        userType: userType || undefined,
      });
    }

    // Optionally fetch assignments for each user
    const includeAssignments = searchParams.get('includeAssignments') === 'true';
    if (includeAssignments) {
      const usersWithAssignments = await Promise.all(
        users.map(async user => {
          const assignments = await listUserAssignments(user.id);
          return { ...user, assignments };
        })
      );
      return NextResponse.json({ ok: true, data: usersWithAssignments });
    }

    return NextResponse.json({ ok: true, data: users });
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
    console.error('Error listing users:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list users' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users
 * Create/sync a user from Firebase Auth (super-admin only)
 * Body: { userId: string, userType?: 'staff' | 'tenant' }
 */
export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const body = await request.json();
    const { userId, userType } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: 'userId is required' } },
        { status: 400 }
      );
    }

    const user = await getOrCreateUser(userId, {
      userType: userType || 'staff', // Default to staff when created by admin
    });
    return NextResponse.json({ ok: true, data: user }, { status: 201 });
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
    console.error('Error creating user:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create user' } },
      { status: 500 }
    );
  }
}
