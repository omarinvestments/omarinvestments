import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { requireLlcRole } from '@/lib/auth/requireLlcMember';
import { getChargeBalance } from '@/lib/services/charge.service';

interface RouteParams {
  params: Promise<{ llcId: string; leaseId: string }>;
}

/**
 * GET /api/llcs/[llcId]/leases/[leaseId]/balance
 * Get the balance summary for a lease
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
    await requireLlcRole(llcId, ['admin', 'manager', 'accounting', 'readOnly']);

    const balance = await getChargeBalance(llcId, leaseId);
    return NextResponse.json({ ok: true, data: balance });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'No access to this LLC' } },
        { status: 403 }
      );
    }
    console.error('Error getting balance:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get balance' } },
      { status: 500 }
    );
  }
}
