import { adminDb } from '@/lib/firebase/admin';
import { getChargeBalance, ChargeBalance } from './charge.service';
import { TenantLink, LeaseStatus, ChargeType, ChargeStatus, PaymentStatus } from '@shared/types';

// ============================================
// Types
// ============================================

export interface TenantSummary {
  totalBalance: number;
  overdueAmount: number;
  nextDueDate: string | null;
  nextDueAmount: number;
  openChargesCount: number;
  activeLeaseCount: number;
}

export interface TenantLease {
  id: string;
  llcId: string;
  llcName: string;
  propertyId: string;
  propertyAddress: string;
  unitId: string;
  unitNumber: string;
  rentAmount: number;
  dueDay: number;
  startDate: string;
  endDate: string;
  status: LeaseStatus;
  balance: ChargeBalance;
}

export interface TenantCharge {
  id: string;
  llcId: string;
  leaseId: string;
  propertyAddress: string;
  unitNumber: string;
  period: string;
  type: ChargeType;
  description?: string;
  amount: number;
  paidAmount: number;
  balance: number;
  status: ChargeStatus;
  dueDate: string;
  createdAt: string;
}

export interface TenantPayment {
  id: string;
  llcId: string;
  leaseId: string;
  propertyAddress: string;
  unitNumber: string;
  amount: number;
  status: PaymentStatus;
  paymentMethod: {
    type: string;
    last4?: string;
    brand?: string;
    checkNumber?: string;
  };
  appliedTo: { chargeId: string; amount: number }[];
  createdAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  leaseId?: string;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get tenant links for a user directly from the user document.
 * This avoids needing the full AuthenticatedUser object.
 */
async function getTenantLinksForUser(userId: string): Promise<TenantLink[]> {
  const userDoc = await adminDb.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    return [];
  }
  return userDoc.data()?.tenantLinks || [];
}

/**
 * Get all lease IDs for a tenant user based on their tenantLinks.
 */
export async function getTenantLeaseIds(
  userId: string
): Promise<{ llcId: string; leaseId: string; tenantId: string }[]> {
  const tenantLinks = await getTenantLinksForUser(userId);

  if (!tenantLinks || tenantLinks.length === 0) {
    return [];
  }

  const leaseIds: { llcId: string; leaseId: string; tenantId: string }[] = [];

  // For each tenant link, find leases where tenantUserIds contains this user
  for (const link of tenantLinks) {
    // Skip invalid tenant links
    if (!link.llcId || !link.tenantId) {
      console.warn('Skipping invalid tenant link:', link);
      continue;
    }

    const leasesSnapshot = await adminDb
      .collection('llcs')
      .doc(link.llcId)
      .collection('leases')
      .where('tenantUserIds', 'array-contains', userId)
      .get();

    for (const doc of leasesSnapshot.docs) {
      leaseIds.push({
        llcId: link.llcId,
        leaseId: doc.id,
        tenantId: link.tenantId,
      });
    }
  }

  return leaseIds;
}

/**
 * Validate that a user has tenant access to a specific lease.
 */
export async function validateTenantAccessToLease(
  userId: string,
  llcId: string,
  leaseId: string
): Promise<boolean> {
  const tenantLinks = await getTenantLinksForUser(userId);

  // Check user has a valid tenant link to this LLC
  const hasLlcLink = tenantLinks.some(link => link.llcId && link.llcId === llcId);
  if (!hasLlcLink) {
    return false;
  }

  // Verify lease belongs to this tenant (tenantUserIds contains userId)
  const leaseDoc = await adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('leases')
    .doc(leaseId)
    .get();

  if (!leaseDoc.exists) {
    return false;
  }

  const leaseData = leaseDoc.data();
  return leaseData?.tenantUserIds?.includes(userId) ?? false;
}

/**
 * Validate that a user has tenant access to a specific charge.
 */
export async function validateTenantAccessToCharge(
  userId: string,
  llcId: string,
  chargeId: string
): Promise<boolean> {
  const tenantLinks = await getTenantLinksForUser(userId);

  const hasLlcLink = tenantLinks.some(link => link.llcId && link.llcId === llcId);
  if (!hasLlcLink) {
    return false;
  }

  const chargeDoc = await adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('charges')
    .doc(chargeId)
    .get();

  if (!chargeDoc.exists) {
    return false;
  }

  const chargeData = chargeDoc.data();
  return chargeData?.tenantUserIds?.includes(userId) ?? false;
}

/**
 * Validate that a user has tenant access to a specific payment.
 */
export async function validateTenantAccessToPayment(
  userId: string,
  llcId: string,
  paymentId: string
): Promise<boolean> {
  const tenantLinks = await getTenantLinksForUser(userId);

  const hasLlcLink = tenantLinks.some(link => link.llcId && link.llcId === llcId);
  if (!hasLlcLink) {
    return false;
  }

  const paymentDoc = await adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('payments')
    .doc(paymentId)
    .get();

  if (!paymentDoc.exists) {
    return false;
  }

  // Get the lease for this payment to verify tenant access
  const paymentData = paymentDoc.data();
  if (!paymentData?.leaseId) {
    return false;
  }

  return validateTenantAccessToLease(userId, llcId, paymentData.leaseId);
}

// ============================================
// Main Service Functions
// ============================================

/**
 * Get dashboard summary for a tenant: total balance, overdue, next due.
 */
export async function getTenantSummary(userId: string): Promise<TenantSummary> {
  const leaseIds = await getTenantLeaseIds(userId);

  let totalBalance = 0;
  let overdueAmount = 0;
  let openChargesCount = 0;
  let activeLeaseCount = 0;
  let nextDueDate: string | null = null;
  let nextDueAmount = 0;

  const today = new Date().toISOString().slice(0, 10);

  for (const { llcId, leaseId } of leaseIds) {
    // Get lease to check if active
    const leaseDoc = await adminDb
      .collection('llcs')
      .doc(llcId)
      .collection('leases')
      .doc(leaseId)
      .get();

    if (leaseDoc.exists && leaseDoc.data()?.status === 'active') {
      activeLeaseCount++;
    }

    // Get balance for this lease
    const balance = await getChargeBalance(llcId, leaseId);
    totalBalance += balance.balance;
    overdueAmount += balance.overdueAmount;
    openChargesCount += balance.openCharges;

    // Find next due charge
    const openChargesSnapshot = await adminDb
      .collection('llcs')
      .doc(llcId)
      .collection('charges')
      .where('leaseId', '==', leaseId)
      .where('status', 'in', ['open', 'partial'])
      .where('dueDate', '>=', today)
      .orderBy('dueDate', 'asc')
      .limit(1)
      .get();

    const firstChargeDoc = openChargesSnapshot.docs[0];
    if (firstChargeDoc) {
      const charge = firstChargeDoc.data();
      const chargeDueDate = charge.dueDate;
      const chargeRemaining = charge.amount - (charge.paidAmount || 0);

      if (!nextDueDate || chargeDueDate < nextDueDate) {
        nextDueDate = chargeDueDate;
        nextDueAmount = chargeRemaining;
      } else if (chargeDueDate === nextDueDate) {
        nextDueAmount += chargeRemaining;
      }
    }
  }

  return {
    totalBalance,
    overdueAmount,
    nextDueDate,
    nextDueAmount,
    openChargesCount,
    activeLeaseCount,
  };
}

/**
 * Get all leases for a tenant with property info and balance.
 */
export async function getTenantLeases(userId: string): Promise<TenantLease[]> {
  const leaseIds = await getTenantLeaseIds(userId);
  const leases: TenantLease[] = [];

  for (const { llcId, leaseId } of leaseIds) {
    // Get lease
    const leaseDoc = await adminDb
      .collection('llcs')
      .doc(llcId)
      .collection('leases')
      .doc(leaseId)
      .get();

    if (!leaseDoc.exists) continue;
    const leaseData = leaseDoc.data();
    if (!leaseData) continue;

    // Get LLC name
    const llcDoc = await adminDb.collection('llcs').doc(llcId).get();
    const llcName = llcDoc.data()?.name || 'Unknown LLC';

    // Get property
    const propertyDoc = await adminDb
      .collection('llcs')
      .doc(llcId)
      .collection('properties')
      .doc(leaseData.propertyId)
      .get();
    const propertyData = propertyDoc.data();
    const propertyAddress = propertyData?.address
      ? `${propertyData.address.street1}, ${propertyData.address.city}, ${propertyData.address.state}`
      : 'Unknown Address';

    // Get unit
    const unitDoc = await adminDb
      .collection('llcs')
      .doc(llcId)
      .collection('properties')
      .doc(leaseData.propertyId)
      .collection('units')
      .doc(leaseData.unitId)
      .get();
    const unitNumber = unitDoc.data()?.label || unitDoc.data()?.unitNumber || 'Unknown Unit';

    // Get balance
    const balance = await getChargeBalance(llcId, leaseId);

    leases.push({
      id: leaseId,
      llcId,
      llcName,
      propertyId: leaseData.propertyId,
      propertyAddress,
      unitId: leaseData.unitId,
      unitNumber,
      rentAmount: leaseData.rentAmount,
      dueDay: leaseData.dueDay,
      startDate: leaseData.startDate,
      endDate: leaseData.endDate,
      status: leaseData.status as LeaseStatus,
      balance,
    });
  }

  return leases;
}

/**
 * Get a single lease detail for a tenant.
 */
export async function getTenantLeaseDetail(
  userId: string,
  llcId: string,
  leaseId: string
): Promise<TenantLease | null> {
  const hasAccess = await validateTenantAccessToLease(userId, llcId, leaseId);
  if (!hasAccess) {
    return null;
  }

  const leaseDoc = await adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('leases')
    .doc(leaseId)
    .get();

  if (!leaseDoc.exists) return null;
  const leaseData = leaseDoc.data();
  if (!leaseData) return null;

  // Get LLC name
  const llcDoc = await adminDb.collection('llcs').doc(llcId).get();
  const llcName = llcDoc.data()?.name || 'Unknown LLC';

  // Get property
  const propertyDoc = await adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('properties')
    .doc(leaseData.propertyId)
    .get();
  const propertyData = propertyDoc.data();
  const propertyAddress = propertyData?.address
    ? `${propertyData.address.street1}, ${propertyData.address.city}, ${propertyData.address.state}`
    : 'Unknown Address';

  // Get unit
  const unitDoc = await adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('properties')
    .doc(leaseData.propertyId)
    .collection('units')
    .doc(leaseData.unitId)
    .get();
  const unitNumber = unitDoc.data()?.label || unitDoc.data()?.unitNumber || 'Unknown Unit';

  // Get balance
  const balance = await getChargeBalance(llcId, leaseId);

  return {
    id: leaseId,
    llcId,
    llcName,
    propertyId: leaseData.propertyId,
    propertyAddress,
    unitId: leaseData.unitId,
    unitNumber,
    rentAmount: leaseData.rentAmount,
    dueDay: leaseData.dueDay,
    startDate: leaseData.startDate,
    endDate: leaseData.endDate,
    status: leaseData.status as LeaseStatus,
    balance,
  };
}

/**
 * Get paginated charges for a tenant.
 */
export async function getTenantCharges(
  userId: string,
  options: PaginationOptions = {}
): Promise<PaginatedResponse<TenantCharge>> {
  const { page = 1, limit = 20, leaseId: filterLeaseId } = options;
  const leaseIds = await getTenantLeaseIds(userId);

  // Filter by specific lease if provided
  const targetLeases = filterLeaseId
    ? leaseIds.filter(l => l.leaseId === filterLeaseId)
    : leaseIds;

  // Collect all charges across leases
  const allCharges: TenantCharge[] = [];

  // Cache for property/unit lookups
  const propertyCache = new Map<string, { address: string; unitNumber: string }>();

  for (const { llcId, leaseId } of targetLeases) {
    const chargesSnapshot = await adminDb
      .collection('llcs')
      .doc(llcId)
      .collection('charges')
      .where('leaseId', '==', leaseId)
      .orderBy('dueDate', 'desc')
      .get();

    for (const doc of chargesSnapshot.docs) {
      const data = doc.data();

      // Get property/unit info (cached)
      const cacheKey = `${llcId}:${leaseId}`;
      let locationInfo = propertyCache.get(cacheKey);

      if (!locationInfo) {
        const leaseDoc = await adminDb
          .collection('llcs')
          .doc(llcId)
          .collection('leases')
          .doc(leaseId)
          .get();
        const leaseData = leaseDoc.data();

        if (leaseData) {
          const propDoc = await adminDb
            .collection('llcs')
            .doc(llcId)
            .collection('properties')
            .doc(leaseData.propertyId)
            .get();
          const propData = propDoc.data();

          const unitDoc = await adminDb
            .collection('llcs')
            .doc(llcId)
            .collection('properties')
            .doc(leaseData.propertyId)
            .collection('units')
            .doc(leaseData.unitId)
            .get();
          const unitData = unitDoc.data();

          locationInfo = {
            address: propData?.address
              ? `${propData.address.street1}, ${propData.address.city}`
              : 'Unknown',
            unitNumber: unitData?.label || unitData?.unitNumber || 'Unknown',
          };
          propertyCache.set(cacheKey, locationInfo);
        } else {
          locationInfo = { address: 'Unknown', unitNumber: 'Unknown' };
        }
      }

      allCharges.push({
        id: doc.id,
        llcId,
        leaseId,
        propertyAddress: locationInfo.address,
        unitNumber: locationInfo.unitNumber,
        period: data.period,
        type: data.type as ChargeType,
        description: data.description || undefined,
        amount: data.amount,
        paidAmount: data.paidAmount || 0,
        balance: data.amount - (data.paidAmount || 0),
        status: data.status as ChargeStatus,
        dueDate: data.dueDate,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      });
    }
  }

  // Sort by due date descending
  allCharges.sort((a, b) => b.dueDate.localeCompare(a.dueDate));

  // Paginate
  const total = allCharges.length;
  const offset = (page - 1) * limit;
  const items = allCharges.slice(offset, offset + limit);

  return {
    items,
    total,
    page,
    limit,
    hasMore: offset + limit < total,
  };
}

/**
 * Get a single charge detail for a tenant.
 */
export async function getTenantChargeDetail(
  userId: string,
  llcId: string,
  chargeId: string
): Promise<TenantCharge | null> {
  const hasAccess = await validateTenantAccessToCharge(userId, llcId, chargeId);
  if (!hasAccess) {
    return null;
  }

  const chargeDoc = await adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('charges')
    .doc(chargeId)
    .get();

  if (!chargeDoc.exists) return null;
  const data = chargeDoc.data();
  if (!data) return null;

  // Get property/unit info
  const leaseDoc = await adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('leases')
    .doc(data.leaseId)
    .get();
  const leaseData = leaseDoc.data();

  let propertyAddress = 'Unknown';
  let unitNumber = 'Unknown';

  if (leaseData) {
    const propDoc = await adminDb
      .collection('llcs')
      .doc(llcId)
      .collection('properties')
      .doc(leaseData.propertyId)
      .get();
    const propData = propDoc.data();

    const unitDoc = await adminDb
      .collection('llcs')
      .doc(llcId)
      .collection('properties')
      .doc(leaseData.propertyId)
      .collection('units')
      .doc(leaseData.unitId)
      .get();
    const unitData = unitDoc.data();

    propertyAddress = propData?.address
      ? `${propData.address.street1}, ${propData.address.city}`
      : 'Unknown';
    unitNumber = unitData?.label || unitData?.unitNumber || 'Unknown';
  }

  return {
    id: chargeId,
    llcId,
    leaseId: data.leaseId,
    propertyAddress,
    unitNumber,
    period: data.period,
    type: data.type as ChargeType,
    description: data.description || undefined,
    amount: data.amount,
    paidAmount: data.paidAmount || 0,
    balance: data.amount - (data.paidAmount || 0),
    status: data.status as ChargeStatus,
    dueDate: data.dueDate,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  };
}

/**
 * Get paginated payments for a tenant.
 */
export async function getTenantPayments(
  userId: string,
  options: PaginationOptions = {}
): Promise<PaginatedResponse<TenantPayment>> {
  const { page = 1, limit = 20, leaseId: filterLeaseId } = options;
  const leaseIds = await getTenantLeaseIds(userId);

  // Filter by specific lease if provided
  const targetLeases = filterLeaseId
    ? leaseIds.filter(l => l.leaseId === filterLeaseId)
    : leaseIds;

  // Collect all payments across leases
  const allPayments: TenantPayment[] = [];

  // Cache for property/unit lookups
  const propertyCache = new Map<string, { address: string; unitNumber: string }>();

  for (const { llcId, leaseId } of targetLeases) {
    const paymentsSnapshot = await adminDb
      .collection('llcs')
      .doc(llcId)
      .collection('payments')
      .where('leaseId', '==', leaseId)
      .orderBy('createdAt', 'desc')
      .get();

    for (const doc of paymentsSnapshot.docs) {
      const data = doc.data();

      // Get property/unit info (cached)
      const cacheKey = `${llcId}:${leaseId}`;
      let locationInfo = propertyCache.get(cacheKey);

      if (!locationInfo) {
        const leaseDoc = await adminDb
          .collection('llcs')
          .doc(llcId)
          .collection('leases')
          .doc(leaseId)
          .get();
        const leaseData = leaseDoc.data();

        if (leaseData) {
          const propDoc = await adminDb
            .collection('llcs')
            .doc(llcId)
            .collection('properties')
            .doc(leaseData.propertyId)
            .get();
          const propData = propDoc.data();

          const unitDoc = await adminDb
            .collection('llcs')
            .doc(llcId)
            .collection('properties')
            .doc(leaseData.propertyId)
            .collection('units')
            .doc(leaseData.unitId)
            .get();
          const unitData = unitDoc.data();

          locationInfo = {
            address: propData?.address
              ? `${propData.address.street1}, ${propData.address.city}`
              : 'Unknown',
            unitNumber: unitData?.label || unitData?.unitNumber || 'Unknown',
          };
          propertyCache.set(cacheKey, locationInfo);
        } else {
          locationInfo = { address: 'Unknown', unitNumber: 'Unknown' };
        }
      }

      allPayments.push({
        id: doc.id,
        llcId,
        leaseId,
        propertyAddress: locationInfo.address,
        unitNumber: locationInfo.unitNumber,
        amount: data.amount,
        status: data.status as PaymentStatus,
        paymentMethod: {
          type: data.paymentMethod?.type || 'other',
          last4: data.paymentMethod?.last4,
          brand: data.paymentMethod?.brand,
          checkNumber: data.paymentMethod?.checkNumber,
        },
        appliedTo: data.appliedTo || [],
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      });
    }
  }

  // Sort by created date descending
  allPayments.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // Paginate
  const total = allPayments.length;
  const offset = (page - 1) * limit;
  const items = allPayments.slice(offset, offset + limit);

  return {
    items,
    total,
    page,
    limit,
    hasMore: offset + limit < total,
  };
}

/**
 * Get a single payment detail for a tenant.
 */
export async function getTenantPaymentDetail(
  userId: string,
  llcId: string,
  paymentId: string
): Promise<TenantPayment | null> {
  const hasAccess = await validateTenantAccessToPayment(userId, llcId, paymentId);
  if (!hasAccess) {
    return null;
  }

  const paymentDoc = await adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('payments')
    .doc(paymentId)
    .get();

  if (!paymentDoc.exists) return null;
  const data = paymentDoc.data();
  if (!data) return null;

  // Get property/unit info
  const leaseDoc = await adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('leases')
    .doc(data.leaseId)
    .get();
  const leaseData = leaseDoc.data();

  let propertyAddress = 'Unknown';
  let unitNumber = 'Unknown';

  if (leaseData) {
    const propDoc = await adminDb
      .collection('llcs')
      .doc(llcId)
      .collection('properties')
      .doc(leaseData.propertyId)
      .get();
    const propData = propDoc.data();

    const unitDoc = await adminDb
      .collection('llcs')
      .doc(llcId)
      .collection('properties')
      .doc(leaseData.propertyId)
      .collection('units')
      .doc(leaseData.unitId)
      .get();
    const unitData = unitDoc.data();

    propertyAddress = propData?.address
      ? `${propData.address.street1}, ${propData.address.city}`
      : 'Unknown';
    unitNumber = unitData?.label || unitData?.unitNumber || 'Unknown';
  }

  return {
    id: paymentId,
    llcId,
    leaseId: data.leaseId,
    propertyAddress,
    unitNumber,
    amount: data.amount,
    status: data.status as PaymentStatus,
    paymentMethod: {
      type: data.paymentMethod?.type || 'other',
      last4: data.paymentMethod?.last4,
      brand: data.paymentMethod?.brand,
      checkNumber: data.paymentMethod?.checkNumber,
    },
    appliedTo: data.appliedTo || [],
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  };
}
