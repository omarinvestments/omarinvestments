import { NextRequest, NextResponse } from 'next/server';
import { requireTaskAccess } from '@/lib/auth/checkPermission';
import { getAccessibleLlcIds } from '@/lib/auth/permissionContext';
import {
  listGlobalTasks,
  listUserTasks,
  listAccessibleTasks,
  createGlobalTask,
} from '@/lib/services/globalTask.service';
import { createGlobalTaskSchema } from '@shared/types';

/**
 * GET /api/tasks
 * List global tasks accessible to the current user
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireTaskAccess();

    const { searchParams } = new URL(request.url);
    const llcId = searchParams.get('llcId') || undefined;
    const assignedToMe = searchParams.get('assignedToMe') === 'true';
    const status = searchParams.get('status') || undefined;
    const includeCompleted = searchParams.get('includeCompleted') === 'true';

    let tasks;

    if (assignedToMe) {
      // Get tasks assigned to the current user
      tasks = await listUserTasks(context.userId, { includeCompleted });
    } else if (llcId) {
      // Get tasks for a specific LLC
      tasks = await listGlobalTasks({
        llcId,
        status: status as never,
      });
    } else if (context.isSuperAdmin) {
      // Super-admin can see all tasks
      tasks = await listGlobalTasks({
        status: status as never,
      });
    } else {
      // Get tasks for accessible LLCs/properties
      const accessibleLlcIds = getAccessibleLlcIds(context);
      tasks = await listAccessibleTasks(
        accessibleLlcIds,
        context.assignedPropertyIds,
        { status: status as never }
      );
    }

    return NextResponse.json({ ok: true, data: tasks });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'Task access not granted' } },
        { status: 403 }
      );
    }
    if (message.includes('UNAUTHENTICATED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
        { status: 401 }
      );
    }
    console.error('Error listing tasks:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list tasks' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks
 * Create a new global task
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireTaskAccess();

    const body = await request.json();
    const parsed = createGlobalTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: parsed.error.issues[0]?.message || 'Invalid input' } },
        { status: 400 }
      );
    }

    const task = await createGlobalTask(
      parsed.data,
      context.userId,
      context.displayName
    );

    return NextResponse.json({ ok: true, data: task }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'Cannot create tasks' } },
        { status: 403 }
      );
    }
    if (message.includes('UNAUTHENTICATED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
        { status: 401 }
      );
    }
    console.error('Error creating task:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create task' } },
      { status: 500 }
    );
  }
}
