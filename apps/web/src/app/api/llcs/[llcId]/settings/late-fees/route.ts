import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { requireLlcRole } from '@/lib/auth/requireLlcMember';
import { getLateFeeSettings, updateLateFeeSettings } from '@/lib/services/lateFee.service';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ llcId: string }>;
}

const updateLateFeeSettingsSchema = z.object({
  lateFeeEnabled: z.boolean().optional(),
  lateFeeType: z.enum(['flat', 'percentage']).optional(),
  lateFeeAmount: z.number().nonnegative().optional(),
  lateFeeMaxAmount: z.number().nonnegative().optional(),
  lateFeeGraceDays: z.number().int().min(0).max(30).optional(),
});

/**
 * GET /api/llcs/[llcId]/settings/late-fees
 * Get late fee settings for an LLC
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { llcId } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
      { status: 401 }
    );
  }

  try {
    await requireLlcRole(llcId, ['admin', 'manager', 'accounting']);

    const settings = await getLateFeeSettings(llcId);
    return NextResponse.json({ ok: true, data: settings });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'No access to this LLC' } },
        { status: 403 }
      );
    }
    if (message.includes('NOT_FOUND')) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'LLC not found' } },
        { status: 404 }
      );
    }
    console.error('Error getting late fee settings:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get late fee settings' } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/llcs/[llcId]/settings/late-fees
 * Update late fee settings for an LLC
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { llcId } = await params;

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
    const parsed = updateLateFeeSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: parsed.error.issues[0]?.message || 'Invalid input' } },
        { status: 400 }
      );
    }

    const settings = await updateLateFeeSettings(llcId, parsed.data, user.uid);
    return NextResponse.json({ ok: true, data: settings });
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
        { ok: false, error: { code: 'NOT_FOUND', message: 'LLC not found' } },
        { status: 404 }
      );
    }
    console.error('Error updating late fee settings:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update late fee settings' } },
      { status: 500 }
    );
  }
}
