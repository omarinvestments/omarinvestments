import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { requireLlcRole } from '@/lib/auth/requireLlcMember';
import {
  getLeaseDocument,
  deleteLeaseDocument,
} from '@/lib/services/leaseDocument.service';

interface RouteParams {
  params: Promise<{ llcId: string; leaseId: string; documentId: string }>;
}

/**
 * GET /api/llcs/[llcId]/leases/[leaseId]/documents/[documentId]
 * Get a single document with download URL.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { llcId, leaseId, documentId } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
      { status: 401 }
    );
  }

  try {
    await requireLlcRole(llcId, ['admin', 'manager', 'accounting', 'readOnly']);

    const document = await getLeaseDocument(llcId, leaseId, documentId);

    if (!document) {
      return NextResponse.json(
        { ok: false, error: { message: 'Document not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: document });
  } catch (error) {
    console.error('Error getting lease document:', error);
    const message = error instanceof Error ? error.message : 'Failed to get document';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { message: 'Permission denied' } },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { ok: false, error: { message: 'Failed to get document' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/llcs/[llcId]/leases/[leaseId]/documents/[documentId]
 * Delete a document (removes from Firestore and Storage).
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { llcId, leaseId, documentId } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
      { status: 401 }
    );
  }

  try {
    await requireLlcRole(llcId, ['admin', 'manager']);

    await deleteLeaseDocument(llcId, leaseId, documentId, user.uid);

    return NextResponse.json({ ok: true, data: { deleted: true } });
  } catch (error) {
    console.error('Error deleting lease document:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete document';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { message: 'Permission denied' } },
        { status: 403 }
      );
    }
    const status = message.startsWith('NOT_FOUND') ? 404 : 500;
    return NextResponse.json(
      { ok: false, error: { message: message.replace('NOT_FOUND: ', '') } },
      { status }
    );
  }
}
