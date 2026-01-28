import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { requireLlcRole } from '@/lib/auth/requireLlcMember';
import { generateUploadUrl } from '@/lib/services/document.service';

interface RouteParams {
  params: Promise<{ llcId: string; caseId: string }>;
}

const ALLOWED_CONTENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/**
 * POST /api/llcs/[llcId]/cases/[caseId]/documents/upload-url
 * Generate a signed upload URL for a document
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
    const { fileName, contentType } = body as { fileName: string; contentType: string };

    if (!fileName || !contentType) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: 'fileName and contentType are required' } },
        { status: 400 }
      );
    }

    if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: `Content type not allowed. Allowed: ${ALLOWED_CONTENT_TYPES.join(', ')}` } },
        { status: 400 }
      );
    }

    const result = await generateUploadUrl(llcId, caseId, fileName, contentType);
    return NextResponse.json({ ok: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'No access' } },
        { status: 403 }
      );
    }
    console.error('Error generating upload URL:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to generate upload URL' } },
      { status: 500 }
    );
  }
}
