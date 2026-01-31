import { NextRequest, NextResponse } from 'next/server';
import { requireLlcAccess, requirePermission } from '@/lib/auth/checkPermission';
import { listWorkOrders, createWorkOrder } from '@/lib/services/workOrder.service';
import { createWorkOrderSchema } from '@shared/types';

interface RouteParams {
  params: Promise<{ llcId: string }>;
}

/**
 * GET /api/llcs/[llcId]/work-orders
 * List work orders for an LLC
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { llcId } = await params;
    await requireLlcAccess(llcId);

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId') || undefined;
    const status = searchParams.get('status') || undefined;
    const priority = searchParams.get('priority') || undefined;
    const assignedEmployeeId = searchParams.get('assignedEmployeeId') || undefined;

    const workOrders = await listWorkOrders(llcId, {
      propertyId,
      status: status as never,
      priority: priority as never,
      assignedEmployeeId,
    });

    return NextResponse.json({ ok: true, data: workOrders });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'No access to this LLC' } },
        { status: 403 }
      );
    }
    if (message.includes('UNAUTHENTICATED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
        { status: 401 }
      );
    }
    console.error('Error listing work orders:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list work orders' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/llcs/[llcId]/work-orders
 * Create a new work order
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { llcId } = await params;
    const context = await requirePermission('workOrder:write', { llcId });

    const body = await request.json();
    const parsed = createWorkOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: parsed.error.issues[0]?.message || 'Invalid input' } },
        { status: 400 }
      );
    }

    const workOrder = await createWorkOrder(llcId, parsed.data, context.userId);
    return NextResponse.json({ ok: true, data: workOrder }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'Cannot create work orders' } },
        { status: 403 }
      );
    }
    if (message.includes('UNAUTHENTICATED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
        { status: 401 }
      );
    }
    console.error('Error creating work order:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create work order' } },
      { status: 500 }
    );
  }
}
