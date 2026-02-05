import { NextRequest, NextResponse } from 'next/server';
import { confirmName } from '@/lib/services/activation.service';
import { confirmNameSchema } from '@shared/validators/activation';

/**
 * POST /api/activate/confirm
 * Step 2: Confirm name match
 * Public endpoint - no auth required
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = confirmNameSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'Invalid input', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { activationId, verificationToken } = parsed.data;

    const result = await confirmName(activationId, verificationToken);

    if (!result) {
      return NextResponse.json(
        { ok: false, error: 'Invalid or expired verification. Please start over.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        confirmationToken: result.confirmationToken,
        activationId: result.activationId,
      },
    });
  } catch (error) {
    console.error('Error confirming name:', error);
    return NextResponse.json(
      { ok: false, error: 'Confirmation failed. Please try again.' },
      { status: 500 }
    );
  }
}
