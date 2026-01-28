import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { requireLlcRole } from '@/lib/auth/requireLlcMember';
import {
  createLeaseDocument,
  listLeaseDocuments,
} from '@/lib/services/leaseDocument.service';
import { LeaseDocumentType } from '@shared/types';

interface RouteParams {
  params: Promise<{ llcId: string; leaseId: string }>;
}

/**
 * GET /api/llcs/[llcId]/leases/[leaseId]/documents
 * List all documents for a lease.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { llcId, leaseId } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
      { status: 401 }
    );
  }

  try {
    await requireLlcRole(llcId, ['admin', 'manager', 'accounting', 'readOnly']);

    const documents = await listLeaseDocuments(llcId, leaseId);

    return NextResponse.json({ ok: true, data: documents });
  } catch (error) {
    console.error('Error listing lease documents:', error);
    const message = error instanceof Error ? error.message : 'Failed to list documents';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { message: 'Permission denied' } },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { ok: false, error: { message: 'Failed to list documents' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/llcs/[llcId]/leases/[leaseId]/documents
 * Create a document record after upload is complete.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { llcId, leaseId } = await params;

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

    // Validate required fields
    if (!body.type || !body.title || !body.fileName || !body.storagePath) {
      return NextResponse.json(
        { ok: false, error: { message: 'Missing required fields' } },
        { status: 400 }
      );
    }

    const validTypes: LeaseDocumentType[] = [
      'lease_agreement',
      'addendum',
      'move_in_checklist',
      'move_out_checklist',
      'notice',
      'other',
    ];

    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { ok: false, error: { message: 'Invalid document type' } },
        { status: 400 }
      );
    }

    const document = await createLeaseDocument(
      llcId,
      leaseId,
      body.storagePath,
      {
        type: body.type,
        title: body.title,
        fileName: body.fileName,
        contentType: body.contentType || 'application/octet-stream',
        sizeBytes: body.sizeBytes || 0,
        generatedFromTemplate: body.generatedFromTemplate,
      },
      user.uid
    );

    return NextResponse.json({ ok: true, data: document }, { status: 201 });
  } catch (error) {
    console.error('Error creating lease document:', error);
    const message = error instanceof Error ? error.message : 'Failed to create document';
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
