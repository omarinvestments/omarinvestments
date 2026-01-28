import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { requireLlcRole } from '@/lib/auth/requireLlcMember';
import { createDocument, listDocuments } from '@/lib/services/document.service';
import { createDocumentSchema } from '@shared/types';

interface RouteParams {
  params: Promise<{ llcId: string; caseId: string }>;
}

/**
 * GET /api/llcs/[llcId]/cases/[caseId]/documents
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
    await requireLlcRole(llcId, ['admin', 'legal']);

    const documents = await listDocuments(llcId, caseId);
    return NextResponse.json({ ok: true, data: documents });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'No access' } },
        { status: 403 }
      );
    }
    console.error('Error listing documents:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list documents' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/llcs/[llcId]/cases/[caseId]/documents
 * Create document metadata record (after file is uploaded via signed URL)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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
    const parsed = createDocumentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: parsed.error.issues[0]?.message } },
        { status: 400 }
      );
    }

    const doc = await createDocument(llcId, caseId, parsed.data, user.uid);
    return NextResponse.json({ ok: true, data: doc }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'No access' } },
        { status: 403 }
      );
    }
    console.error('Error creating document:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create document' } },
      { status: 500 }
    );
  }
}
