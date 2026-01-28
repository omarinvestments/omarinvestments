import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { requireLlcRole } from '@/lib/auth/requireLlcMember';
import { generateUploadUrl } from '@/lib/services/leaseDocument.service';

interface RouteParams {
  params: Promise<{ llcId: string; leaseId: string }>;
}

/**
 * POST /api/llcs/[llcId]/leases/[leaseId]/documents/upload-url
 * Generate a signed URL for uploading a document to Firebase Storage.
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

    if (!body.fileName || !body.contentType) {
      return NextResponse.json(
        { ok: false, error: { message: 'fileName and contentType are required' } },
        { status: 400 }
      );
    }

    // Validate content type (allow common document types)
    const allowedContentTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain',
    ];

    if (!allowedContentTypes.includes(body.contentType)) {
      return NextResponse.json(
        { ok: false, error: { message: 'Unsupported file type' } },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (body.sizeBytes && body.sizeBytes > maxSize) {
      return NextResponse.json(
        { ok: false, error: { message: 'File size exceeds 10MB limit' } },
        { status: 400 }
      );
    }

    const result = await generateUploadUrl(
      llcId,
      leaseId,
      body.fileName,
      body.contentType
    );

    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate upload URL';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { message: 'Permission denied' } },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { ok: false, error: { message: 'Failed to generate upload URL' } },
      { status: 500 }
    );
  }
}
