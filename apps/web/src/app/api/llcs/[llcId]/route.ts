import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { requireLlcRole } from '@/lib/auth/requireLlcMember';
import { getLlc, updateLlc } from '@/lib/services/llc.service';
import { updateLlcSchema } from '@shared/types';

interface RouteParams {
  params: Promise<{ llcId: string }>;
}

/**
 * GET /api/llcs/[llcId]
 * Get a single LLC's details
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { llcId } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } }, { status: 401 });
  }

  try {
    // Verify membership
    await requireLlcRole(llcId, [
      'admin', 'manager', 'accounting', 'maintenance', 'legal', 'tenant', 'readOnly',
    ]);

    const llc = await getLlc(llcId);
    if (!llc) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'LLC not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: llc });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'No access to this LLC' } },
        { status: 403 }
      );
    }
    console.error('Error fetching LLC:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch LLC' } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/llcs/[llcId]
 * Update an LLC's details (admin only)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { llcId } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } }, { status: 401 });
  }

  try {
    // Only admins can update LLC details
    await requireLlcRole(llcId, ['admin']);

    const body = await request.json();
    const parsed = updateLlcSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: parsed.error.issues[0]?.message } },
        { status: 400 }
      );
    }

    const updated = await updateLlc(llcId, parsed.data, user.uid);
    return NextResponse.json({ ok: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'Admin access required' } },
        { status: 403 }
      );
    }
    console.error('Error updating LLC:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update LLC' } },
      { status: 500 }
    );
  }
}
