import { NextRequest, NextResponse } from 'next/server';
import { requirePermissionContext } from '@/lib/auth/permissionContext';
import { getActivation, cancelActivation } from '@/lib/services/activation.service';

interface RouteParams {
  params: Promise<{ activationId: string }>;
}

/**
 * GET /api/activations/[activationId]
 * Get a specific activation (staff only)
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requirePermissionContext();
    const { activationId } = await params;

    const activation = await getActivation(activationId);

    if (!activation) {
      return NextResponse.json({ ok: false, error: 'Activation not found' }, { status: 404 });
    }

    // Check permission - must be creator or super-admin
    if (!context.isSuperAdmin && activation.createdBy !== context.userId) {
      // Check if user has access to the LLC
      const hasLlcAccess = activation.llcIds.some(
        llcId => context.adminOfLlcIds.includes(llcId) || context.assignedLlcIds.includes(llcId)
      );
      if (!hasLlcAccess) {
        return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
      }
    }

    // Return without sensitive fields
    return NextResponse.json({
      ok: true,
      data: {
        id: activation.id,
        type: activation.type,
        role: activation.role,
        firstName: activation.firstName,
        middleInitial: activation.middleInitial,
        lastName: activation.lastName,
        llcIds: activation.llcIds,
        propertyIds: activation.propertyIds,
        tenantId: activation.tenantId,
        capabilities: activation.capabilities,
        status: activation.status,
        createdBy: activation.createdBy,
        createdAt: activation.createdAt,
        expiresAt: activation.expiresAt,
        activatedAt: activation.activatedAt,
        activatedUserId: activation.activatedUserId,
      },
    });
  } catch (error) {
    console.error('Error getting activation:', error);
    if ((error as Error).message === 'UNAUTHENTICATED') {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: 'Failed to get activation' }, { status: 500 });
  }
}

/**
 * DELETE /api/activations/[activationId]
 * Cancel/expire an activation (staff only)
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requirePermissionContext();
    const { activationId } = await params;

    const activation = await getActivation(activationId);

    if (!activation) {
      return NextResponse.json({ ok: false, error: 'Activation not found' }, { status: 404 });
    }

    // Check permission - must be creator or super-admin
    if (!context.isSuperAdmin && activation.createdBy !== context.userId) {
      // Check if user has admin access to the LLC
      const hasAdminAccess = activation.llcIds.some(llcId => context.adminOfLlcIds.includes(llcId));
      if (!hasAdminAccess) {
        return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
      }
    }

    // Can only cancel pending activations
    if (activation.status !== 'pending') {
      return NextResponse.json(
        { ok: false, error: 'Can only cancel pending activations' },
        { status: 400 }
      );
    }

    await cancelActivation(activationId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error canceling activation:', error);
    if ((error as Error).message === 'UNAUTHENTICATED') {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: 'Failed to cancel activation' }, { status: 500 });
  }
}
