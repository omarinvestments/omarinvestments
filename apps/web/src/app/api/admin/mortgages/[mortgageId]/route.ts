import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/checkPermission';
import { updateMortgageSchema } from '@shared/validators/mortgage';
import {
  getMortgage,
  updateMortgage,
  deleteMortgage,
  calculateMortgageSummary,
} from '@/lib/services/mortgage.service';

interface RouteParams {
  params: Promise<{ mortgageId: string }>;
}

/**
 * GET /api/admin/mortgages/[mortgageId]
 * Get mortgage details with calculations (super-admin only)
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireSuperAdmin();

    const { mortgageId } = await params;
    const mortgage = await getMortgage(mortgageId);

    if (!mortgage) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Mortgage not found' } },
        { status: 404 }
      );
    }

    // Calculate summary with projections
    const summary = await calculateMortgageSummary(mortgage);

    return NextResponse.json({
      ok: true,
      data: {
        mortgage,
        summary,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED') || message.includes('Super-admin')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'Super-admin access required' } },
        { status: 403 }
      );
    }
    if (message.includes('UNAUTHENTICATED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
        { status: 401 }
      );
    }
    console.error('Error fetching mortgage:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch mortgage' } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/mortgages/[mortgageId]
 * Update a mortgage (super-admin only)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireSuperAdmin();

    const { mortgageId } = await params;
    const body = await request.json();
    const parseResult = updateMortgageSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: parseResult.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const mortgage = await updateMortgage(mortgageId, parseResult.data, context.userId);

    return NextResponse.json({
      ok: true,
      data: mortgage,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED') || message.includes('Super-admin')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'Super-admin access required' } },
        { status: 403 }
      );
    }
    if (message.includes('UNAUTHENTICATED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
        { status: 401 }
      );
    }
    if (message.includes('NOT_FOUND')) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Mortgage not found' } },
        { status: 404 }
      );
    }
    console.error('Error updating mortgage:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update mortgage' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/mortgages/[mortgageId]
 * Delete a mortgage (super-admin only)
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireSuperAdmin();

    const { mortgageId } = await params;
    await deleteMortgage(mortgageId);

    return NextResponse.json({
      ok: true,
      data: { deleted: true },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PERMISSION_DENIED') || message.includes('Super-admin')) {
      return NextResponse.json(
        { ok: false, error: { code: 'PERMISSION_DENIED', message: 'Super-admin access required' } },
        { status: 403 }
      );
    }
    if (message.includes('UNAUTHENTICATED')) {
      return NextResponse.json(
        { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
        { status: 401 }
      );
    }
    if (message.includes('NOT_FOUND')) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Mortgage not found' } },
        { status: 404 }
      );
    }
    console.error('Error deleting mortgage:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete mortgage' } },
      { status: 500 }
    );
  }
}
