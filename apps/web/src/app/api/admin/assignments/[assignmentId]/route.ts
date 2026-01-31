import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/checkPermission';
import {
  getAssignment,
  updateAssignment,
  deleteAssignment,
} from '@/lib/services/assignment.service';
import { updateUserAssignmentSchema } from '@shared/types';

interface RouteParams {
  params: Promise<{ assignmentId: string }>;
}

/**
 * GET /api/admin/assignments/[assignmentId]
 * Get a specific assignment (super-admin only)
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireSuperAdmin();

    const { assignmentId } = await params;
    const assignment = await getAssignment(assignmentId);

    if (!assignment) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Assignment not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: assignment });
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
    console.error('Error getting assignment:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get assignment' } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/assignments/[assignmentId]
 * Update an assignment (super-admin only)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await requireSuperAdmin();

    const { assignmentId } = await params;
    const existing = await getAssignment(assignmentId);

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Assignment not found' } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = updateUserAssignmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: parsed.error.issues[0]?.message || 'Invalid input' } },
        { status: 400 }
      );
    }

    const assignment = await updateAssignment(assignmentId, parsed.data);
    return NextResponse.json({ ok: true, data: assignment });
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
    console.error('Error updating assignment:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update assignment' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/assignments/[assignmentId]
 * Delete an assignment (super-admin only)
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireSuperAdmin();

    const { assignmentId } = await params;
    const existing = await getAssignment(assignmentId);

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Assignment not found' } },
        { status: 404 }
      );
    }

    await deleteAssignment(assignmentId);
    return NextResponse.json({ ok: true, data: { deleted: true } });
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
    console.error('Error deleting assignment:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete assignment' } },
      { status: 500 }
    );
  }
}
