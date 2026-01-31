import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/checkPermission';
import { adminDb } from '@/lib/firebase/admin';

/**
 * Enriched lease data for admin view
 */
interface AdminLeaseView {
  id: string;
  llcId: string;
  llcName: string;
  propertyId: string;
  propertyAddress: string;
  propertyType: string;
  unitId: string;
  unitNumber: string;
  tenantNames: string[];
  tenantIds: string[];
  startDate: string;
  endDate: string;
  rentAmount: number;
  dueDay: number;
  depositAmount: number;
  status: string;
  // Calculated fields
  amountOverdue: number;
  lastPaymentDate: string | null;
  lastPaymentAmount: number | null;
  daysUntilExpiry: number | null;
}

/**
 * GET /api/admin/leases
 * Get all leases across all LLCs (super-admin only)
 * Query params:
 * - llcId: filter by LLC
 * - propertyId: filter by property
 * - status: filter by status (active, expired, terminated, pending)
 * - propertyType: filter by property type
 */
export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(request.url);
    const llcIdFilter = searchParams.get('llcId');
    const propertyIdFilter = searchParams.get('propertyId');
    const statusFilter = searchParams.get('status');
    const propertyTypeFilter = searchParams.get('propertyType');

    // Get all LLCs first
    const llcsSnap = await adminDb.collection('llcs').get();
    const llcMap = new Map<string, string>();
    llcsSnap.docs.forEach(doc => {
      llcMap.set(doc.id, doc.data().legalName || 'Unknown LLC');
    });

    // Get all leases using collectionGroup
    const leasesSnap = await adminDb.collectionGroup('leases').get();

    const leases: AdminLeaseView[] = [];
    const today = new Date().toISOString().slice(0, 10);

    for (const leaseDoc of leasesSnap.docs) {
      const lease = leaseDoc.data();

      const pathParts = leaseDoc.ref.path.split('/');
      if (pathParts.length < 2 || !pathParts[1]) continue;
      const llcId = pathParts[1];

      // Apply LLC filter
      if (llcIdFilter && llcId !== llcIdFilter) continue;

      // Apply status filter
      if (statusFilter && lease.status !== statusFilter) continue;

      // Get property info
      const propertyDoc = await adminDb
        .collection('llcs')
        .doc(llcId)
        .collection('properties')
        .doc(lease.propertyId)
        .get();

      const property = propertyDoc.data();
      if (!property) continue;

      // Apply property type filter
      if (propertyTypeFilter && property.type !== propertyTypeFilter) continue;

      // Apply property filter
      if (propertyIdFilter && lease.propertyId !== propertyIdFilter) continue;

      // Get unit info
      const unitDoc = await adminDb
        .collection('llcs')
        .doc(llcId)
        .collection('properties')
        .doc(lease.propertyId)
        .collection('units')
        .doc(lease.unitId)
        .get();

      const unit = unitDoc.data();

      // Get tenant names
      const tenantNames: string[] = [];
      for (const tenantId of lease.tenantIds || []) {
        const tenantDoc = await adminDb
          .collection('llcs')
          .doc(llcId)
          .collection('tenants')
          .doc(tenantId)
          .get();
        const tenant = tenantDoc.data();
        if (tenant) {
          tenantNames.push(`${tenant.firstName || ''} ${tenant.lastName || ''}`.trim() || 'Unknown');
        }
      }

      // Calculate overdue amount - get all open/partial charges for this lease
      let amountOverdue = 0;
      const chargesSnap = await adminDb
        .collection('llcs')
        .doc(llcId)
        .collection('charges')
        .where('leaseId', '==', leaseDoc.id)
        .where('status', 'in', ['open', 'partial'])
        .get();

      for (const chargeDoc of chargesSnap.docs) {
        const charge = chargeDoc.data();
        if (charge.dueDate < today) {
          amountOverdue += (charge.amount || 0) - (charge.paidAmount || 0);
        }
      }

      // Get last payment
      const paymentsSnap = await adminDb
        .collection('llcs')
        .doc(llcId)
        .collection('payments')
        .where('leaseId', '==', leaseDoc.id)
        .where('status', '==', 'completed')
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      let lastPaymentDate: string | null = null;
      let lastPaymentAmount: number | null = null;
      const lastPaymentDoc = paymentsSnap.docs[0];
      if (lastPaymentDoc) {
        const payment = lastPaymentDoc.data();
        lastPaymentDate = payment.createdAt?.toDate?.()?.toISOString?.()?.slice(0, 10) || null;
        lastPaymentAmount = payment.amount || null;
      }

      // Calculate days until expiry
      let daysUntilExpiry: number | null = null;
      if (lease.endDate && lease.status === 'active') {
        const endDate = new Date(lease.endDate);
        const todayDate = new Date();
        daysUntilExpiry = Math.ceil((endDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      const propertyAddress = property.address
        ? `${property.address.street1}, ${property.address.city}, ${property.address.state}`
        : 'Unknown';

      leases.push({
        id: leaseDoc.id,
        llcId,
        llcName: llcMap.get(llcId) || 'Unknown LLC',
        propertyId: lease.propertyId,
        propertyAddress,
        propertyType: property.type || 'unknown',
        unitId: lease.unitId,
        unitNumber: unit?.unitNumber || 'N/A',
        tenantNames,
        tenantIds: lease.tenantIds || [],
        startDate: lease.startDate,
        endDate: lease.endDate,
        rentAmount: lease.rentAmount || 0,
        dueDay: lease.dueDay || 1,
        depositAmount: lease.depositAmount || 0,
        status: lease.status,
        amountOverdue,
        lastPaymentDate,
        lastPaymentAmount,
        daysUntilExpiry,
      });
    }

    // Sort by LLC name, then by property address
    leases.sort((a, b) => {
      const llcCompare = a.llcName.localeCompare(b.llcName);
      if (llcCompare !== 0) return llcCompare;
      return a.propertyAddress.localeCompare(b.propertyAddress);
    });

    return NextResponse.json({ ok: true, data: leases });
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
    console.error('Error fetching admin leases:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch leases' } },
      { status: 500 }
    );
  }
}
