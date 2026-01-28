import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { requireLlcRole } from '@/lib/auth/requireLlcMember';
import {
  createTemplate,
  listTemplates,
} from '@/lib/services/leaseTemplate.service';
import { LeaseDocumentType } from '@shared/types';

interface RouteParams {
  params: Promise<{ llcId: string }>;
}

/**
 * GET /api/llcs/[llcId]/templates
 * List all templates for an LLC.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { llcId } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
      { status: 401 }
    );
  }

  try {
    await requireLlcRole(llcId, ['admin', 'manager', 'accounting', 'readOnly']);

    // Optional type filter
    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get('type');
    const type = typeParam as LeaseDocumentType | undefined;

    const templates = await listTemplates(llcId, type);

    return NextResponse.json({ ok: true, data: templates });
  } catch (error) {
    console.error('Error listing templates:', error);
    const message = error instanceof Error ? error.message : 'Failed to list templates';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { message: 'Permission denied' } },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { ok: false, error: { message: 'Failed to list templates' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/llcs/[llcId]/templates
 * Create a new template.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { llcId } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
      { status: 401 }
    );
  }

  try {
    await requireLlcRole(llcId, ['admin']);

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.type || !body.templateContent) {
      return NextResponse.json(
        { ok: false, error: { message: 'name, type, and templateContent are required' } },
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
        { ok: false, error: { message: 'Invalid template type' } },
        { status: 400 }
      );
    }

    const template = await createTemplate(
      llcId,
      {
        name: body.name,
        type: body.type,
        description: body.description,
        templateContent: body.templateContent,
        isDefault: body.isDefault,
      },
      user.uid
    );

    return NextResponse.json({ ok: true, data: template }, { status: 201 });
  } catch (error) {
    console.error('Error creating template:', error);
    const message = error instanceof Error ? error.message : 'Failed to create template';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { message: 'Permission denied' } },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { ok: false, error: { message: 'Failed to create template' } },
      { status: 500 }
    );
  }
}
