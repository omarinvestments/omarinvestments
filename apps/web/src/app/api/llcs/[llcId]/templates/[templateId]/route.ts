import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { requireLlcRole } from '@/lib/auth/requireLlcMember';
import {
  getTemplate,
  updateTemplate,
  deleteTemplate,
} from '@/lib/services/leaseTemplate.service';

interface RouteParams {
  params: Promise<{ llcId: string; templateId: string }>;
}

/**
 * GET /api/llcs/[llcId]/templates/[templateId]
 * Get a single template.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { llcId, templateId } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
      { status: 401 }
    );
  }

  try {
    await requireLlcRole(llcId, ['admin', 'manager', 'accounting', 'readOnly']);

    const template = await getTemplate(llcId, templateId);

    if (!template) {
      return NextResponse.json(
        { ok: false, error: { message: 'Template not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: template });
  } catch (error) {
    console.error('Error getting template:', error);
    const message = error instanceof Error ? error.message : 'Failed to get template';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { message: 'Permission denied' } },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { ok: false, error: { message: 'Failed to get template' } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/llcs/[llcId]/templates/[templateId]
 * Update a template.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { llcId, templateId } = await params;

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

    const template = await updateTemplate(
      llcId,
      templateId,
      {
        name: body.name,
        description: body.description,
        templateContent: body.templateContent,
        isDefault: body.isDefault,
      },
      user.uid
    );

    return NextResponse.json({ ok: true, data: template });
  } catch (error) {
    console.error('Error updating template:', error);
    const message = error instanceof Error ? error.message : 'Failed to update template';
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

/**
 * DELETE /api/llcs/[llcId]/templates/[templateId]
 * Delete a template.
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { llcId, templateId } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
      { status: 401 }
    );
  }

  try {
    await requireLlcRole(llcId, ['admin']);

    await deleteTemplate(llcId, templateId, user.uid);

    return NextResponse.json({ ok: true, data: { deleted: true } });
  } catch (error) {
    console.error('Error deleting template:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete template';
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
