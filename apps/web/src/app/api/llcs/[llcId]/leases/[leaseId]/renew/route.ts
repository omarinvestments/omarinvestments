import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { requireLlcRole } from '@/lib/auth/requireLlcMember';
import { renewLease } from '@/lib/services/lease.service';
import { renewLeaseSchema } from '@shared/types';

interface RouteParams {
  params: Promise<{ llcId: string; leaseId: string }>;
}

/**
 * POST /api/llcs/[llcId]/leases/[leaseId]/renew
 * Create a renewal lease linked to the original
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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
    const parsed = renewLeaseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: parsed.error.issues[0]?.message || 'Invalid input' } },
        { status: 400 }
      );
    }

    const newLease = await renewLease(llcId, leaseId, parsed.data, user.uid);
    return NextResponse.json({ ok: true, data: newLease }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'Admin or manager access required' } },
        { status: 403 }
      );
    }
    if (message.includes('NOT_FOUND')) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Original lease not found' } },
        { status: 404 }
      );
    }
    if (message.includes('INVALID_STATUS')) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_STATUS', message: message.split(': ')[1] || 'Invalid lease status' } },
        { status: 400 }
      );
    }
    console.error('Error renewing lease:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to renew lease' } },
      { status: 500 }
    );
  }
}
