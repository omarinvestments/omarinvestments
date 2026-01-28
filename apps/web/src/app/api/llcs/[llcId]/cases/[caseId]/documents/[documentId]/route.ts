import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { requireLlcRole } from '@/lib/auth/requireLlcMember';
import { deleteDocument, generateDownloadUrl } from '@/lib/services/document.service';
import { adminDb } from '@/lib/firebase/admin';

interface RouteParams {
  params: Promise<{ llcId: string; caseId: string; documentId: string }>;
}

/**
 * GET /api/llcs/[llcId]/cases/[caseId]/documents/[documentId]
 * Get a signed download URL for the document
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { llcId, caseId, documentId } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
      { status: 401 }
    );
  }

  try {
    await requireLlcRole(llcId, ['admin', 'legal']);

    // Get the document metadata to find the storage path
    const docSnap = await adminDb
      .collection('llcs')
      .doc(llcId)
      .collection('cases')
      .doc(caseId)
      .collection('documents')
      .doc(documentId)
      .get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Document not found' } },
        { status: 404 }
      );
    }

    const data = docSnap.data();
    if (!data || !data.storagePath) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Document not found' } },
        { status: 404 }
      );
    }

    const storagePath = data.storagePath as string;
    const downloadUrl = await generateDownloadUrl(storagePath);

    return NextResponse.json({ ok: true, data: { downloadUrl } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'No access' } },
        { status: 403 }
      );
    }
    console.error('Error generating download URL:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to generate download URL' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/llcs/[llcId]/cases/[caseId]/documents/[documentId]
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { llcId, caseId, documentId } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
      { status: 401 }
    );
  }

  try {
    await requireLlcRole(llcId, ['admin', 'legal']);

    await deleteDocument(llcId, caseId, documentId, user.uid);
    return NextResponse.json({ ok: true, data: { deleted: true } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'No access' } },
        { status: 403 }
      );
    }
    if (message.includes('NOT_FOUND')) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Document not found' } },
        { status: 404 }
      );
    }
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete document' } },
      { status: 500 }
    );
  }
}
