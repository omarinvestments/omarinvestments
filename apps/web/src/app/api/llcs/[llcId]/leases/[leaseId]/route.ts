import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { requireLlcRole } from '@/lib/auth/requireLlcMember';
import { getLease, updateLease, deleteLease } from '@/lib/services/lease.service';
import { updateLeaseSchema } from '@shared/types';

interface RouteParams {
  params: Promise<{ llcId: string; leaseId: string }>;
}

/**
 * GET /api/llcs/[llcId]/leases/[leaseId]
 * Get a single lease
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { llcId, leaseId } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
      { status: 401 }
    );
  }

  try {
    await requireLlcRole(llcId, ['admin', 'manager', 'accounting', 'maintenance', 'legal', 'readOnly']);

    const lease = await getLease(llcId, leaseId);
    if (!lease) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Lease not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: lease });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'No access to this LLC' } },
        { status: 403 }
      );
    }
    console.error('Error fetching lease:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch lease' } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/llcs/[llcId]/leases/[leaseId]
 * Update a lease
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { llcId, leaseId } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
      { status: 401 }
    );
  }

  try {
    await requireLlcRole(llcId, ['admin', 'manager']);

    const body = await request.json();
    const parsed = updateLeaseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: parsed.error.issues[0]?.message || 'Invalid input' } },
        { status: 400 }
      );
    }

    const updated = await updateLease(llcId, leaseId, parsed.data, user.uid);
    return NextResponse.json({ ok: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'Admin or manager access required' } },
        { status: 403 }
      );
    }
    if (message.includes('not found')) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Lease not found' } },
        { status: 404 }
      );
    }
    console.error('Error updating lease:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update lease' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/llcs/[llcId]/leases/[leaseId]
 * Delete a lease (only draft leases can be deleted)
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { llcId, leaseId } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
      { status: 401 }
    );
  }

  try {
    await requireLlcRole(llcId, ['admin']);

    const result = await deleteLease(llcId, leaseId, user.uid);
    return NextResponse.json({ ok: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'Admin access required' } },
        { status: 403 }
      );
    }
    if (message.includes('not found')) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Lease not found' } },
        { status: 404 }
      );
    }
    if (message.includes('draft')) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_DRAFT', message: 'Only draft leases can be deleted' } },
        { status: 409 }
      );
    }
    console.error('Error deleting lease:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete lease' } },
      { status: 500 }
    );
  }
}
