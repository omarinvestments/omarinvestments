import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/checkPermission';
import { adminDb } from '@/lib/firebase/admin';

/**
 * Enriched property data for admin view
 */
interface AdminPropertyView {
  id: string;
  llcId: string;
  llcName: string;
  name: string | null;
  address: string;
  city: string;
  state: string;
  type: string;
  status: string;
  yearBuilt: number | null;
  totalSqft: number | null;
  // Market value (most recent)
  marketValue: number | null;
  marketValueYear: number | null;
  // Units & occupancy
  unitCount: number;
  occupiedUnits: number;
  occupancyRate: number;
  // Income
  totalMonthlyRent: number;
  // Mortgage info
  mortgageBalance: number | null;
  mortgagePayment: number | null;
  mortgageRate: number | null;
  nextPaymentDate: string | null;
}

/**
 * Enriched unit data for admin view
 */
interface AdminUnitView {
  id: string;
  llcId: string;
  llcName: string;
  propertyId: string;
  propertyAddress: string;
  unitNumber: string;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  status: string;
  marketRent: number | null;
  // Lease info (if occupied)
  currentLeaseId: string | null;
  currentTenantNames: string[];
  currentRent: number | null;
  leaseEndDate: string | null;
}

/**
 * GET /api/admin/properties
 * Get all properties and units across all LLCs (super-admin only)
 * Query params:
 * - llcId: filter by LLC
 * - propertyType: filter by property type
 * - unitStatus: filter units by status
 */
export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(request.url);
    const llcIdFilter = searchParams.get('llcId');
    const propertyTypeFilter = searchParams.get('propertyType');
    const unitStatusFilter = searchParams.get('unitStatus');

    // Get all LLCs first
    const llcsSnap = await adminDb.collection('llcs').get();
    const llcMap = new Map<string, string>();
    llcsSnap.docs.forEach(doc => {
      llcMap.set(doc.id, doc.data().legalName || 'Unknown LLC');
    });

    // Get all properties
    const propertiesSnap = await adminDb.collectionGroup('properties').get();

    const properties: AdminPropertyView[] = [];
    const units: AdminUnitView[] = [];

    for (const propertyDoc of propertiesSnap.docs) {
      const property = propertyDoc.data();
      // Path format: llcs/{llcId}/properties/{propertyId}
      const pathParts = propertyDoc.ref.path.split('/');
      if (pathParts.length < 2 || !pathParts[1]) continue;
      const llcId = pathParts[1];

      // Apply LLC filter
      if (llcIdFilter && llcId !== llcIdFilter) continue;

      // Apply property type filter
      if (propertyTypeFilter && property.type !== propertyTypeFilter) continue;

      const llcName = llcMap.get(llcId) || 'Unknown LLC';

      // Get units for this property
      const unitsSnap = await adminDb
        .collection('llcs')
        .doc(llcId)
        .collection('properties')
        .doc(propertyDoc.id)
        .collection('units')
        .get();

      let unitCount = unitsSnap.docs.length;
      let occupiedUnits = 0;
      let totalMonthlyRent = 0;

      // If no units, treat property as single unit
      if (unitCount === 0) {
        unitCount = 1;
      }

      // Get active leases for this property to calculate occupancy and rent
      const leasesSnap = await adminDb
        .collection('llcs')
        .doc(llcId)
        .collection('leases')
        .where('propertyId', '==', propertyDoc.id)
        .where('status', '==', 'active')
        .get();

      // Map of unitId to lease
      const unitLeaseMap = new Map<string, { leaseId: string; rent: number; endDate: string; tenantIds: string[] }>();
      for (const leaseDoc of leasesSnap.docs) {
        const lease = leaseDoc.data();
        totalMonthlyRent += lease.rentAmount || 0;
        unitLeaseMap.set(lease.unitId, {
          leaseId: leaseDoc.id,
          rent: lease.rentAmount || 0,
          endDate: lease.endDate,
          tenantIds: lease.tenantIds || [],
        });
      }

      occupiedUnits = unitLeaseMap.size;
      if (unitsSnap.docs.length === 0 && leasesSnap.docs.length > 0) {
        // Property without units but has lease
        occupiedUnits = 1;
      }

      // Process units
      for (const unitDoc of unitsSnap.docs) {
        const unit = unitDoc.data();

        // Apply unit status filter
        if (unitStatusFilter && unit.status !== unitStatusFilter) continue;

        const leaseInfo = unitLeaseMap.get(unitDoc.id);
        const tenantNames: string[] = [];

        if (leaseInfo) {
          // Get tenant names
          for (const tenantId of leaseInfo.tenantIds) {
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
        }

        const propertyAddress = property.address
          ? `${property.address.street1}, ${property.address.city}, ${property.address.state}`
          : 'Unknown';

        units.push({
          id: unitDoc.id,
          llcId,
          llcName,
          propertyId: propertyDoc.id,
          propertyAddress,
          unitNumber: unit.unitNumber || 'N/A',
          bedrooms: unit.bedrooms ?? null,
          bathrooms: unit.bathrooms ?? null,
          sqft: unit.sqft ?? null,
          status: unit.status || 'unknown',
          marketRent: unit.marketRent ?? null,
          currentLeaseId: leaseInfo?.leaseId || null,
          currentTenantNames: tenantNames,
          currentRent: leaseInfo?.rent || null,
          leaseEndDate: leaseInfo?.endDate || null,
        });
      }

      // Get most recent market value
      let marketValue: number | null = null;
      let marketValueYear: number | null = null;
      if (property.parcelInfo?.marketValues?.length > 0) {
        const sorted = [...property.parcelInfo.marketValues].sort((a: { year: number }, b: { year: number }) => b.year - a.year);
        marketValue = sorted[0].value;
        marketValueYear = sorted[0].year;
      } else if (property.parcelInfo?.marketValue) {
        marketValue = property.parcelInfo.marketValue;
        marketValueYear = property.parcelInfo.assessedYear || null;
      }

      const address = property.address
        ? `${property.address.street1}${property.address.street2 ? ', ' + property.address.street2 : ''}`
        : 'Unknown';

      properties.push({
        id: propertyDoc.id,
        llcId,
        llcName,
        name: property.name || null,
        address,
        city: property.address?.city || '',
        state: property.address?.state || '',
        type: property.type || 'unknown',
        status: property.status || 'unknown',
        yearBuilt: property.yearBuilt ?? null,
        totalSqft: property.totalSqft ?? property.parcelInfo?.parcelAreaSqft ?? null,
        marketValue,
        marketValueYear,
        unitCount: unitsSnap.docs.length || 1,
        occupiedUnits,
        occupancyRate: unitCount > 0 ? Math.round((occupiedUnits / unitCount) * 100) : 0,
        totalMonthlyRent,
        mortgageBalance: property.mortgageInfo?.currentBalance ?? null,
        mortgagePayment: property.mortgageInfo?.monthlyPayment ?? null,
        mortgageRate: property.mortgageInfo?.interestRate ?? null,
        nextPaymentDate: property.mortgageInfo?.nextPaymentDate ?? null,
      });
    }

    // Sort properties by LLC name, then by address
    properties.sort((a, b) => {
      const llcCompare = a.llcName.localeCompare(b.llcName);
      if (llcCompare !== 0) return llcCompare;
      return a.address.localeCompare(b.address);
    });

    // Sort units by property address, then unit number
    units.sort((a, b) => {
      const propCompare = a.propertyAddress.localeCompare(b.propertyAddress);
      if (propCompare !== 0) return propCompare;
      return a.unitNumber.localeCompare(b.unitNumber);
    });

    return NextResponse.json({
      ok: true,
      data: {
        properties,
        units,
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
    console.error('Error fetching admin properties:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch properties' } },
      { status: 500 }
    );
  }
}
