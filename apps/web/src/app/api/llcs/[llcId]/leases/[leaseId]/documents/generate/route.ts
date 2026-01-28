import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { requireLlcRole } from '@/lib/auth/requireLlcMember';
import { getTemplate, renderTemplate } from '@/lib/services/leaseTemplate.service';
import { adminDb } from '@/lib/firebase/admin';
import { LeaseDocumentType } from '@shared/types';

interface RouteParams {
  params: Promise<{ llcId: string; leaseId: string }>;
}

/**
 * POST /api/llcs/[llcId]/leases/[leaseId]/documents/generate
 * Generate a document from a template by rendering placeholders.
 * Returns the rendered HTML content (PDF generation would be a separate step).
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

    if (!body.templateId) {
      return NextResponse.json(
        { ok: false, error: { message: 'templateId is required' } },
        { status: 400 }
      );
    }

    // Get the template
    const template = await getTemplate(llcId, body.templateId);
    if (!template) {
      return NextResponse.json(
        { ok: false, error: { message: 'Template not found' } },
        { status: 404 }
      );
    }

    // Get lease data
    const leaseDoc = await adminDb
      .collection('llcs')
      .doc(llcId)
      .collection('leases')
      .doc(leaseId)
      .get();

    if (!leaseDoc.exists) {
      return NextResponse.json(
        { ok: false, error: { message: 'Lease not found' } },
        { status: 404 }
      );
    }

    const leaseData = leaseDoc.data();
    if (!leaseData) {
      return NextResponse.json(
        { ok: false, error: { message: 'Lease data not found' } },
        { status: 404 }
      );
    }

    // Get related data for rendering
    const [propertyDoc, unitDoc, llcDoc] = await Promise.all([
      adminDb.collection('llcs').doc(llcId).collection('properties').doc(leaseData.propertyId).get(),
      adminDb.collection('llcs').doc(llcId).collection('units').doc(leaseData.unitId).get(),
      adminDb.collection('llcs').doc(llcId).get(),
    ]);

    const propertyData = propertyDoc.data();
    const unitData = unitDoc.data();
    const llcData = llcDoc.data();

    // Get first tenant
    let tenantData: { name?: string; email?: string; phone?: string } | undefined;
    if (leaseData.tenantIds && leaseData.tenantIds.length > 0) {
      const tenantDoc = await adminDb
        .collection('llcs')
        .doc(llcId)
        .collection('tenants')
        .doc(leaseData.tenantIds[0])
        .get();
      const tenant = tenantDoc.data();
      if (tenant) {
        tenantData = {
          name: `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim(),
          email: tenant.email,
          phone: tenant.phone,
        };
      }
    }

    // Render the template
    const renderedContent = renderTemplate(template.templateContent, {
      lease: {
        startDate: leaseData.startDate,
        endDate: leaseData.endDate,
        rentAmount: leaseData.rentAmount,
        depositAmount: leaseData.depositAmount,
        dueDay: leaseData.dueDay,
      },
      property: propertyData
        ? {
            name: propertyData.name,
            address: propertyData.address,
            city: propertyData.city,
            state: propertyData.state,
            zipCode: propertyData.zipCode,
          }
        : undefined,
      unit: unitData
        ? {
            number: unitData.unitNumber,
            bedrooms: unitData.bedrooms,
            bathrooms: unitData.bathrooms,
          }
        : undefined,
      tenant: tenantData,
      llc: llcData
        ? {
            name: llcData.name,
          }
        : undefined,
    });

    return NextResponse.json({
      ok: true,
      data: {
        templateId: template.id,
        templateName: template.name,
        type: template.type as LeaseDocumentType,
        renderedContent,
      },
    });
  } catch (error) {
    console.error('Error generating document:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate document';
    if (message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { ok: false, error: { message: 'Permission denied' } },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { ok: false, error: { message: 'Failed to generate document' } },
      { status: 500 }
    );
  }
}
