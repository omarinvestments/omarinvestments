import { NextRequest, NextResponse } from 'next/server';
import { requireTaskAccess } from '@/lib/auth/checkPermission';
import {
  getGlobalTask,
  updateGlobalTask,
  updateGlobalTaskStatus,
  completeGlobalTask,
  deleteGlobalTask,
} from '@/lib/services/globalTask.service';
import {
  updateGlobalTaskSchema,
  updateGlobalTaskStatusSchema,
  completeGlobalTaskSchema,
} from '@shared/types';

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

/**
 * GET /api/tasks/[taskId]
 * Get a specific task
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireTaskAccess();

    const { taskId } = await params;
    const task = await getGlobalTask(taskId);

    if (!task) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Task not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: task });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'No access' } },
        { status: 403 }
      );
    }
    if (message.includes('UNAUTHENTICATED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
        { status: 401 }
      );
    }
    console.error('Error getting task:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get task' } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tasks/[taskId]
 * Update a task
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireTaskAccess();
    const { taskId } = await params;

    const existing = await getGlobalTask(taskId);
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Task not found' } },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Check what type of update this is
    if (body.action === 'status') {
      const parsed = updateGlobalTaskStatusSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { ok: false, error: { code: 'INVALID_INPUT', message: parsed.error.issues[0]?.message || 'Invalid input' } },
          { status: 400 }
        );
      }
      const task = await updateGlobalTaskStatus(taskId, parsed.data.status);
      return NextResponse.json({ ok: true, data: task });
    }

    if (body.action === 'complete') {
      const parsed = completeGlobalTaskSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { ok: false, error: { code: 'INVALID_INPUT', message: parsed.error.issues[0]?.message || 'Invalid input' } },
          { status: 400 }
        );
      }
      const task = await completeGlobalTask(taskId, parsed.data, context.userId);
      return NextResponse.json({ ok: true, data: task });
    }

    // Regular update
    const parsed = updateGlobalTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: parsed.error.issues[0]?.message || 'Invalid input' } },
        { status: 400 }
      );
    }

    const task = await updateGlobalTask(taskId, parsed.data);
    return NextResponse.json({ ok: true, data: task });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'Cannot update task' } },
        { status: 403 }
      );
    }
    if (message.includes('UNAUTHENTICATED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
        { status: 401 }
      );
    }
    console.error('Error updating task:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update task' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tasks/[taskId]
 * Delete a task
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireTaskAccess();

    const { taskId } = await params;
    const existing = await getGlobalTask(taskId);

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Task not found' } },
        { status: 404 }
      );
    }

    await deleteGlobalTask(taskId);
    return NextResponse.json({ ok: true, data: { deleted: true } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'Cannot delete task' } },
        { status: 403 }
      );
    }
    if (message.includes('UNAUTHENTICATED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
        { status: 401 }
      );
    }
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete task' } },
      { status: 500 }
    );
  }
}
