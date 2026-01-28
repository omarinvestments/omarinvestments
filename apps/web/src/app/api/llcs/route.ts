import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { createLlc, listUserLlcs } from '@/lib/services/llc.service';
import { createLlcSchema } from '@shared/types';

/**
 * GET /api/llcs
 * List all LLCs the authenticated user has access to
 */
export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } }, { status: 401 });
  }

  try {
    const llcs = await listUserLlcs(user.uid);
    return NextResponse.json({ ok: true, data: llcs });
  } catch (error) {
    console.error('Error listing LLCs:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list LLCs' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/llcs
 * Create a new LLC (the creator becomes the admin)
 */
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createLlcSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: parsed.error.issues[0]?.message || 'Invalid input' } },
        { status: 400 }
      );
    }

    const llc = await createLlc(parsed.data, user.uid);

    return NextResponse.json({ ok: true, data: llc }, { status: 201 });
  } catch (error) {
    console.error('Error creating LLC:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create LLC' } },
      { status: 500 }
    );
  }
}
