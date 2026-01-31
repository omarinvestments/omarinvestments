import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/checkPermission';
import {
  listAllAssignments,
  createAssignment,
} from '@/lib/services/assignment.service';
import { createUserAssignmentSchema } from '@shared/types';

/**
 * GET /api/admin/assignments
 * List all user assignments (super-admin only)
 * Query params:
 * - role: filter by role (manager | employee)
 * - status: filter by status (active | disabled)
 * - llcId: filter by LLC
 * - limit: max results (default 100)
 */
export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') as 'manager' | 'employee' | null;
    const status = searchParams.get('status') as 'active' | 'disabled' | null;
    const llcId = searchParams.get('llcId');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const assignments = await listAllAssignments({
      role: role || undefined,
      status: status || undefined,
      llcId: llcId || undefined,
      limit,
    });

    return NextResponse.json({ ok: true, data: assignments });
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
    console.error('Error listing assignments:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list assignments' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/assignments
 * Create a new user assignment (super-admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireSuperAdmin();

    const body = await request.json();
    const parsed = createUserAssignmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: parsed.error.issues[0]?.message || 'Invalid input' } },
        { status: 400 }
      );
    }

    const assignment = await createAssignment(parsed.data, context.userId);
    return NextResponse.json({ ok: true, data: assignment }, { status: 201 });
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
    console.error('Error creating assignment:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create assignment' } },
      { status: 500 }
    );
  }
}
