import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { requireLlcRole } from '@/lib/auth/requireLlcMember';
import { getCase, updateCase, deleteCase } from '@/lib/services/case.service';
import { updateCaseSchema } from '@shared/types';

interface RouteParams {
  params: Promise<{ llcId: string; caseId: string }>;
}

/**
 * GET /api/llcs/[llcId]/cases/[caseId]
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { llcId, caseId } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
      { status: 401 }
    );
  }

  try {
    await requireLlcRole(llcId, ['admin', 'manager', 'legal', 'accounting']);

    const caseRecord = await getCase(llcId, caseId);
    if (!caseRecord) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Case not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: caseRecord });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'No access' } },
        { status: 403 }
      );
    }
    console.error('Error getting case:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get case' } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/llcs/[llcId]/cases/[caseId]
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { llcId, caseId } = await params;

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
    const parsed = updateCaseSchema.safeParse(body);

    if (!parsed.success) {
      const firstIssueMessage = parsed.error.issues?.[0]?.message || 'Invalid input';
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: firstIssueMessage } },
        { status: 400 }
      );
    }

    const updated = await updateCase(llcId, caseId, parsed.data, user.uid);
    return NextResponse.json({ ok: true, data: updated });
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
        { ok: false, error: { code: 'NOT_FOUND', message: 'Case not found' } },
        { status: 404 }
      );
    }
    console.error('Error updating case:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update case' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/llcs/[llcId]/cases/[caseId]
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { llcId, caseId } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
      { status: 401 }
    );
  }

  try {
    await requireLlcRole(llcId, ['admin', 'legal']);

    await deleteCase(llcId, caseId, user.uid);
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
        { ok: false, error: { code: 'NOT_FOUND', message: 'Case not found' } },
        { status: 404 }
      );
    }
    if (message.includes('HAS_CHILDREN')) {
      return NextResponse.json(
        { ok: false, error: { code: 'HAS_CHILDREN', message: 'Remove tasks and documents before deleting this case' } },
        { status: 409 }
      );
    }
    console.error('Error deleting case:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete case' } },
      { status: 500 }
    );
  }
}
