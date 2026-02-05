import { NextRequest, NextResponse } from 'next/server';
import { requirePermissionContext } from '@/lib/auth/permissionContext';
import {
  createActivation,
  listActivations,
  canCreateActivation,
} from '@/lib/services/activation.service';
import { createActivationSchema } from '@shared/validators/activation';

/**
 * GET /api/activations
 * List pending activations (staff only)
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requirePermissionContext();

    // Must be at least a manager to view activations
    if (!context.isSuperAdmin && context.effectiveRole !== 'admin' && context.effectiveRole !== 'manager') {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'pending' | 'activated' | 'expired' | null;
    const role = searchParams.get('role') as 'tenant' | 'employee' | 'manager' | 'admin' | null;
    const llcId = searchParams.get('llcId');
    const limit = searchParams.get('limit');

    const activations = await listActivations({
      status: status || undefined,
      role: role || undefined,
      llcId: llcId || undefined,
      // Non-super-admins only see their own creations
      createdBy: context.isSuperAdmin ? undefined : context.userId,
      limit: limit ? parseInt(limit, 10) : 50,
    });

    // Filter out sensitive fields
    const safeActivations = activations.map(a => ({
      id: a.id,
      type: a.type,
      role: a.role,
      firstName: a.firstName,
      middleInitial: a.middleInitial,
      lastName: a.lastName,
      llcIds: a.llcIds,
      propertyIds: a.propertyIds,
      status: a.status,
      createdBy: a.createdBy,
      createdAt: a.createdAt,
      expiresAt: a.expiresAt,
      activatedAt: a.activatedAt,
      // Exclude: dateOfBirth, ssn4, einLast4
    }));

    return NextResponse.json({ ok: true, data: safeActivations });
  } catch (error) {
    console.error('Error listing activations:', error);
    if ((error as Error).message === 'UNAUTHENTICATED') {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: 'Failed to list activations' }, { status: 500 });
  }
}

/**
 * POST /api/activations
 * Create a pending activation (staff only)
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requirePermissionContext();

    const body = await request.json();
    const parsed = createActivationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'Invalid input', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const input = parsed.data;

    // Check permission to create this type of activation
    const canCreate = canCreateActivation(
      context,
      input.role,
      input.llcIds || [],
      input.propertyIds || []
    );

    if (!canCreate) {
      return NextResponse.json(
        { ok: false, error: 'You do not have permission to create this type of activation' },
        { status: 403 }
      );
    }

    const activation = await createActivation(input, context.userId);

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
        status: activation.status,
        createdAt: activation.createdAt,
        expiresAt: activation.expiresAt,
      },
    });
  } catch (error) {
    console.error('Error creating activation:', error);
    if ((error as Error).message === 'UNAUTHENTICATED') {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: 'Failed to create activation' }, { status: 500 });
  }
}
