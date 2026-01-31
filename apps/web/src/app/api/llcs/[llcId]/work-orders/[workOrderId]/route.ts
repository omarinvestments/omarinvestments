import { NextRequest, NextResponse } from 'next/server';
import { requireLlcAccess, requirePermission } from '@/lib/auth/checkPermission';
import {
  getWorkOrder,
  updateWorkOrder,
  updateWorkOrderStatus,
  assignWorkOrder,
  completeWorkOrder,
  addWorkOrderNote,
  cancelWorkOrder,
} from '@/lib/services/workOrder.service';
import {
  updateWorkOrderSchema,
  updateWorkOrderStatusSchema,
  assignWorkOrderSchema,
  completeWorkOrderSchema,
  addWorkOrderNoteSchema,
} from '@shared/types';

interface RouteParams {
  params: Promise<{ llcId: string; workOrderId: string }>;
}

/**
 * GET /api/llcs/[llcId]/work-orders/[workOrderId]
 * Get a specific work order
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { llcId, workOrderId } = await params;
    await requireLlcAccess(llcId);

    const workOrder = await getWorkOrder(llcId, workOrderId);

    if (!workOrder) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Work order not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: workOrder });
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
    console.error('Error getting work order:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get work order' } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/llcs/[llcId]/work-orders/[workOrderId]
 * Update a work order
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { llcId, workOrderId } = await params;
    const context = await requirePermission('workOrder:write', { llcId });

    const body = await request.json();

    // Check what type of update this is
    if (body.action === 'status') {
      // Status update
      const parsed = updateWorkOrderStatusSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { ok: false, error: { code: 'INVALID_INPUT', message: parsed.error.issues[0]?.message || 'Invalid input' } },
          { status: 400 }
        );
      }
      const workOrder = await updateWorkOrderStatus(
        llcId,
        workOrderId,
        parsed.data.status,
        context.userId,
        body.reason
      );
      return NextResponse.json({ ok: true, data: workOrder });
    }

    if (body.action === 'assign') {
      // Assignment update
      const parsed = assignWorkOrderSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { ok: false, error: { code: 'INVALID_INPUT', message: parsed.error.issues[0]?.message || 'Invalid input' } },
          { status: 400 }
        );
      }
      const workOrder = await assignWorkOrder(llcId, workOrderId, parsed.data, context.userId);
      return NextResponse.json({ ok: true, data: workOrder });
    }

    if (body.action === 'complete') {
      // Complete the work order
      const parsed = completeWorkOrderSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { ok: false, error: { code: 'INVALID_INPUT', message: parsed.error.issues[0]?.message || 'Invalid input' } },
          { status: 400 }
        );
      }
      const workOrder = await completeWorkOrder(llcId, workOrderId, parsed.data, context.userId);
      return NextResponse.json({ ok: true, data: workOrder });
    }

    if (body.action === 'note') {
      // Add a note
      const parsed = addWorkOrderNoteSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { ok: false, error: { code: 'INVALID_INPUT', message: parsed.error.issues[0]?.message || 'Invalid input' } },
          { status: 400 }
        );
      }
      const workOrder = await addWorkOrderNote(
        llcId,
        workOrderId,
        parsed.data,
        context.userId,
        context.displayName
      );
      return NextResponse.json({ ok: true, data: workOrder });
    }

    // Regular update
    const parsed = updateWorkOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: parsed.error.issues[0]?.message || 'Invalid input' } },
        { status: 400 }
      );
    }

    const workOrder = await updateWorkOrder(llcId, workOrderId, parsed.data);
    return NextResponse.json({ ok: true, data: workOrder });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'Cannot update work order' } },
        { status: 403 }
      );
    }
    if (message.includes('UNAUTHENTICATED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
        { status: 401 }
      );
    }
    if (message.includes('not found')) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Work order not found' } },
        { status: 404 }
      );
    }
    console.error('Error updating work order:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update work order' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/llcs/[llcId]/work-orders/[workOrderId]
 * Cancel a work order
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { llcId, workOrderId } = await params;
    const context = await requirePermission('workOrder:delete', { llcId });

    const { searchParams } = new URL(request.url);
    const reason = searchParams.get('reason') || undefined;

    const workOrder = await cancelWorkOrder(llcId, workOrderId, context.userId, reason);
    return NextResponse.json({ ok: true, data: workOrder });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'Cannot cancel work order' } },
        { status: 403 }
      );
    }
    if (message.includes('UNAUTHENTICATED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
        { status: 401 }
      );
    }
    console.error('Error canceling work order:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to cancel work order' } },
      { status: 500 }
    );
  }
}
