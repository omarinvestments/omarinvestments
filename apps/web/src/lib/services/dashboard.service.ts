import { adminDb } from '@/lib/firebase/admin';

export interface LlcDashboardStats {
  llcId: string;
  legalName: string;
  propertyCount: number;
  unitCount: number;
  occupiedUnits: number;
  activeLeases: number;
  openCases: number;
  overdueCharges: number;
  overdueAmount: number;
  leasesExpiringSoon: number;
}

export interface OwnerDashboardStats {
  totalLlcs: number;
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  occupancyRate: number;
  totalActiveLeases: number;
  totalOpenCases: number;
  totalOverdueAmount: number;
  llcStats: LlcDashboardStats[];
}

/**
 * Get all LLCs accessible to a user
 */
async function getUserLlcs(userId: string): Promise<{ id: string; legalName: string }[]> {
  const membershipsSnapshot = await adminDb
    .collectionGroup('members')
    .where('userId', '==', userId)
    .where('status', '==', 'active')
    .get();

  const llcs: { id: string; legalName: string }[] = [];

  for (const memberDoc of membershipsSnapshot.docs) {
    const llcRef = memberDoc.ref.parent.parent;
    if (llcRef) {
      const llcDoc = await llcRef.get();
      if (llcDoc.exists && llcDoc.data()?.status === 'active') {
        llcs.push({
          id: llcDoc.id,
          legalName: llcDoc.data()?.legalName || 'Unknown',
        });
      }
    }
  }

  return llcs;
}

/**
 * Get dashboard stats for a single LLC
 */
export async function getLlcDashboardStats(llcId: string): Promise<LlcDashboardStats | null> {
  const llcRef = adminDb.collection('llcs').doc(llcId);
  const llcDoc = await llcRef.get();

  if (!llcDoc.exists) {
    return null;
  }

  const legalName = llcDoc.data()?.legalName || 'Unknown';
  const today = new Date().toISOString().slice(0, 10);
  const sixtyDaysFromNow = new Date();
  sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);
  const futureDate = sixtyDaysFromNow.toISOString().slice(0, 10);

  // Fetch all stats in parallel
  const [
    propertiesSnap,
    unitsSnap,
    leasesSnap,
    casesSnap,
    chargesSnap,
  ] = await Promise.all([
    // Properties (active only)
    llcRef.collection('properties').where('status', '!=', 'sold').get(),
    // All units (will filter for occupied)
    adminDb.collectionGroup('units').get(),
    // Active leases
    llcRef.collection('leases').where('status', '==', 'active').get(),
    // Open cases
    llcRef.collection('cases').where('status', 'in', ['open', 'stayed']).get(),
    // All charges (will filter for overdue)
    llcRef.collection('charges').where('status', 'in', ['open', 'partial']).get(),
  ]);

  // Filter units to only those belonging to this LLC's properties
  const propertyIds = new Set(propertiesSnap.docs.map(d => d.id));
  const llcUnits = unitsSnap.docs.filter(doc => {
    const propertyRef = doc.ref.parent.parent;
    return propertyRef && propertyIds.has(propertyRef.id);
  });

  const unitCount = llcUnits.length;
  const occupiedUnits = llcUnits.filter(doc => doc.data()?.status === 'occupied').length;

  // Calculate overdue charges
  let overdueCharges = 0;
  let overdueAmount = 0;
  for (const chargeDoc of chargesSnap.docs) {
    const charge = chargeDoc.data();
    if (charge.dueDate < today) {
      overdueCharges++;
      overdueAmount += (charge.amount || 0) - (charge.paidAmount || 0);
    }
  }

  // Calculate leases expiring soon (within 60 days)
  let leasesExpiringSoon = 0;
  for (const leaseDoc of leasesSnap.docs) {
    const lease = leaseDoc.data();
    if (lease.endDate >= today && lease.endDate <= futureDate) {
      leasesExpiringSoon++;
    }
  }

  return {
    llcId,
    legalName,
    propertyCount: propertiesSnap.size,
    unitCount,
    occupiedUnits,
    activeLeases: leasesSnap.size,
    openCases: casesSnap.size,
    overdueCharges,
    overdueAmount,
    leasesExpiringSoon,
  };
}

/**
 * Get aggregated dashboard stats across all user's LLCs
 */
export async function getOwnerDashboardStats(userId: string): Promise<OwnerDashboardStats> {
  const userLlcs = await getUserLlcs(userId);

  if (userLlcs.length === 0) {
    return {
      totalLlcs: 0,
      totalProperties: 0,
      totalUnits: 0,
      occupiedUnits: 0,
      occupancyRate: 0,
      totalActiveLeases: 0,
      totalOpenCases: 0,
      totalOverdueAmount: 0,
      llcStats: [],
    };
  }

  // Fetch stats for all LLCs in parallel
  const llcStatsPromises = userLlcs.map(llc => getLlcDashboardStats(llc.id));
  const llcStatsResults = await Promise.all(llcStatsPromises);

  // Filter out nulls and aggregate
  const llcStats = llcStatsResults.filter((s): s is LlcDashboardStats => s !== null);

  let totalProperties = 0;
  let totalUnits = 0;
  let occupiedUnits = 0;
  let totalActiveLeases = 0;
  let totalOpenCases = 0;
  let totalOverdueAmount = 0;

  for (const stats of llcStats) {
    totalProperties += stats.propertyCount;
    totalUnits += stats.unitCount;
    occupiedUnits += stats.occupiedUnits;
    totalActiveLeases += stats.activeLeases;
    totalOpenCases += stats.openCases;
    totalOverdueAmount += stats.overdueAmount;
  }

  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  return {
    totalLlcs: llcStats.length,
    totalProperties,
    totalUnits,
    occupiedUnits,
    occupancyRate,
    totalActiveLeases,
    totalOpenCases,
    totalOverdueAmount,
    llcStats,
  };
}
