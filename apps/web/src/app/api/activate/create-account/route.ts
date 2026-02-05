import { NextRequest, NextResponse } from 'next/server';
import { createAccount } from '@/lib/services/activation.service';
import { createAccountSchema } from '@shared/validators/activation';

/**
 * POST /api/activate/create-account
 * Step 3: Create Firebase Auth account and Firestore user record
 * Public endpoint - no auth required
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createAccountSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'Invalid input', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { email, password, confirmationToken } = parsed.data;

    // Create the account
    const result = await createAccount(email, password, confirmationToken);

    return NextResponse.json({
      ok: true,
      data: {
        userId: result.userId,
        userType: result.userType,
        message: 'Account created successfully. Please sign in with your new credentials.',
      },
    });
  } catch (error) {
    console.error('Error creating account:', error);

    const message = (error as Error).message;

    if (message === 'Invalid or expired confirmation token') {
      return NextResponse.json(
        { ok: false, error: 'Your session has expired. Please start the activation process again.' },
        { status: 400 }
      );
    }

    if (message === 'Activation not found or already used') {
      return NextResponse.json(
        { ok: false, error: 'This activation has already been used or is no longer valid.' },
        { status: 400 }
      );
    }

    if (message === 'Email already in use') {
      return NextResponse.json(
        { ok: false, error: 'This email address is already associated with an account. Please sign in instead.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { ok: false, error: 'Failed to create account. Please try again.' },
      { status: 500 }
    );
  }
}
