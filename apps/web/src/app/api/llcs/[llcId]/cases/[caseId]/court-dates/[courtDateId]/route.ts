import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { requireLlcRole } from '@/lib/auth/requireLlcMember';
import {
  getCourtDate,
  updateCourtDate,
  deleteCourtDate,
} from '@/lib/services/courtDate.service';
import { updateCourtDateSchema } from '@shared/types';

interface RouteParams {
  params: Promise<{ llcId: string; caseId: string; courtDateId: string }>;
}

/**
 * GET /api/llcs/[llcId]/cases/[caseId]/court-dates/[courtDateId]
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { llcId, caseId, courtDateId } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
      { status: 401 }
    );
  }

  try {
    await requireLlcRole(llcId, ['admin', 'legal']);

    const courtDate = await getCourtDate(llcId, caseId, courtDateId);
    if (!courtDate) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Court date not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: courtDate });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'No access' } },
        { status: 403 }
      );
    }
    console.error('Error getting court date:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get court date' } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/llcs/[llcId]/cases/[caseId]/court-dates/[courtDateId]
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { llcId, caseId, courtDateId } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
      { status: 401 }
    );
  }

  try {
    await requireLlcRole(llcId, ['admin', 'legal']);

    const body = await request.json();
    const parsed = updateCourtDateSchema.safeParse(body);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues?.[0]?.message ?? 'Invalid input';
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: firstIssue } },
        { status: 400 }
      );
    }

    const courtDate = await updateCourtDate(llcId, caseId, courtDateId, parsed.data, user.uid);
    return NextResponse.json({ ok: true, data: courtDate });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'Admin or legal access required' } },
        { status: 403 }
      );
    }
    if (message.includes('NOT_FOUND')) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Court date not found' } },
        { status: 404 }
      );
    }
    console.error('Error updating court date:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update court date' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/llcs/[llcId]/cases/[caseId]/court-dates/[courtDateId]
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { llcId, caseId, courtDateId } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
      { status: 401 }
    );
  }

  try {
    await requireLlcRole(llcId, ['admin', 'legal']);

    await deleteCourtDate(llcId, caseId, courtDateId, user.uid);
    return NextResponse.json({ ok: true, data: { deleted: true } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'Admin or legal access required' } },
        { status: 403 }
      );
    }
    if (message.includes('NOT_FOUND')) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Court date not found' } },
        { status: 404 }
      );
    }
    console.error('Error deleting court date:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete court date' } },
      { status: 500 }
    );
  }
}
