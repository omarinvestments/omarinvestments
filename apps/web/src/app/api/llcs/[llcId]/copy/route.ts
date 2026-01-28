import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { requireLlcRole } from '@/lib/auth/requireLlcMember';
import { copyLlc } from '@/lib/services/llc.service';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ llcId: string }>;
}

const copySchema = z.object({
  legalName: z.string().min(1).max(200),
});

/**
 * POST /api/llcs/[llcId]/copy
 * Copy an LLC's settings to create a new entity (admin only)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { llcId } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } }, { status: 401 });
  }

  try {
    await requireLlcRole(llcId, ['admin']);

    const body = await request.json();
    const parsed = copySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: 'A legal name is required for the new LLC' } },
        { status: 400 }
      );
    }

    const newLlc = await copyLlc(llcId, parsed.data.legalName, user.uid);
    return NextResponse.json({ ok: true, data: newLlc }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'Admin access required' } },
        { status: 403 }
      );
    }
    console.error('Error copying LLC:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to copy LLC' } },
      { status: 500 }
    );
  }
}
