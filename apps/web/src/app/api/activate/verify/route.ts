import { NextRequest, NextResponse } from 'next/server';
import { verifyIdentity } from '@/lib/services/activation.service';
import { verifyIdentitySchema } from '@shared/validators/activation';

// Simple in-memory rate limiting (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5; // Max attempts per window
const RATE_WINDOW = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || record.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * POST /api/activate/verify
 * Step 1: Verify identity with DOB + SSN4 (or EIN4 + business name)
 * Public endpoint - no auth required
 */
export async function POST(request: NextRequest) {
  try {
    // Get IP for rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { ok: false, error: 'Too many attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = verifyIdentitySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'Invalid input', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const result = await verifyIdentity(parsed.data);

    if (!result) {
      // Don't reveal whether it's wrong credentials or no match
      return NextResponse.json(
        { ok: false, error: 'No matching account found. Please check your information and try again.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        activationId: result.activationId,
        verificationToken: result.verificationToken,
        firstName: result.firstName,
        middleInitial: result.middleInitial,
        lastName: result.lastName,
        role: result.role,
      },
    });
  } catch (error) {
    console.error('Error verifying identity:', error);
    return NextResponse.json(
      { ok: false, error: 'Verification failed. Please try again.' },
      { status: 500 }
    );
  }
}
