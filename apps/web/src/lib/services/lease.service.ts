import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export interface CreateLeaseInput {
  propertyId: string;
  unitId: string;
  tenantIds: string[];
  startDate: string;
  endDate: string;
  rentAmount: number;
  dueDay: number;
  depositAmount: number;
  status?: string;
  terms?: {
    petPolicy?: 'allowed' | 'not_allowed' | 'case_by_case';
    petDeposit?: number;
    parkingSpaces?: number;
    utilitiesIncluded?: string[];
    specialTerms?: string;
  };
  renewalOf?: string;
  notes?: string;
}

export interface UpdateLeaseInput {
  startDate?: string;
  endDate?: string;
  rentAmount?: number;
  dueDay?: number;
  depositAmount?: number;
  status?: string;
  terms?: {
    petPolicy?: 'allowed' | 'not_allowed' | 'case_by_case';
    petDeposit?: number;
    parkingSpaces?: number;
    utilitiesIncluded?: string[];
    specialTerms?: string;
  };
  notes?: string;
}

/**
 * Helper to update unit status
 */
async function updateUnitStatus(
  batch: FirebaseFirestore.WriteBatch,
  llcId: string,
  propertyId: string,
  unitId: string,
  status: string,
  actorUserId: string
) {
  const unitRef = adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('properties')
    .doc(propertyId)
    .collection('units')
    .doc(unitId);

  batch.update(unitRef, {
    status,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const auditRef = adminDb.collection('llcs').doc(llcId).collection('auditLogs').doc();
  batch.set(auditRef, {
    actorUserId,
    action: 'update',
    entityType: 'unit',
    entityId: unitId,
    entityPath: `llcs/${llcId}/properties/${propertyId}/units/${unitId}`,
    changes: {
      after: { status, reason: 'lease_status_change' },
    },
    createdAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Check if a unit has any other active leases (excluding a specific lease)
 */
async function hasOtherActiveLeases(
  llcId: string,
  unitId: string,
  excludeLeaseId: string
): Promise<boolean> {
  const snapshot = await adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('leases')
    .where('unitId', '==', unitId)
    .where('status', '==', 'active')
    .limit(2)
    .get();

  return snapshot.docs.some((doc) => doc.id !== excludeLeaseId);
}

/**
 * Create a new lease under an LLC.
 * If status is 'active', the unit status is automatically set to 'occupied'.
 */
export async function createLease(
  llcId: string,
  input: CreateLeaseInput,
  actorUserId: string
) {
  const leaseRef = adminDb.collection('llcs').doc(llcId).collection('leases').doc();
  const auditRef = adminDb.collection('llcs').doc(llcId).collection('auditLogs').doc();

  const status = input.status || 'draft';
  const leaseData = {
    llcId,
    propertyId: input.propertyId,
    unitId: input.unitId,
    tenantIds: input.tenantIds,
    startDate: input.startDate,
    endDate: input.endDate,
    rentAmount: input.rentAmount,
    dueDay: input.dueDay,
    depositAmount: input.depositAmount,
    status,
    terms: input.terms || null,
    renewalOf: input.renewalOf || null,
    notes: input.notes || null,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: actorUserId,
  };

  const batch = adminDb.batch();
  batch.set(leaseRef, leaseData);

  // If lease is active, set unit to occupied
  if (status === 'active') {
    await updateUnitStatus(batch, llcId, input.propertyId, input.unitId, 'occupied', actorUserId);
  }

  batch.set(auditRef, {
    actorUserId,
    action: 'create',
    entityType: 'lease',
    entityId: leaseRef.id,
    entityPath: `llcs/${llcId}/leases/${leaseRef.id}`,
    changes: {
      after: {
        propertyId: input.propertyId,
        unitId: input.unitId,
        tenantIds: input.tenantIds,
        status,
      },
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();
  return { id: leaseRef.id, ...leaseData };
}

/**
 * Update an existing lease.
 * Automatically updates unit status when lease status changes:
 * - active → unit becomes 'occupied'
 * - ended/terminated → unit becomes 'vacant' (if no other active leases)
 */
export async function updateLease(
  llcId: string,
  leaseId: string,
  input: UpdateLeaseInput,
  actorUserId: string
) {
  const leaseRef = adminDb.collection('llcs').doc(llcId).collection('leases').doc(leaseId);
  const leaseDoc = await leaseRef.get();

  if (!leaseDoc.exists) {
    throw new Error('Lease not found');
  }

  const currentData = leaseDoc.data();
  const updateData: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.startDate !== undefined) updateData.startDate = input.startDate;
  if (input.endDate !== undefined) updateData.endDate = input.endDate;
  if (input.rentAmount !== undefined) updateData.rentAmount = input.rentAmount;
  if (input.dueDay !== undefined) updateData.dueDay = input.dueDay;
  if (input.depositAmount !== undefined) updateData.depositAmount = input.depositAmount;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.notes !== undefined) updateData.notes = input.notes;

  if (input.terms) {
    const currentTerms = currentData?.terms || {};
    updateData.terms = { ...currentTerms, ...input.terms };
  }

  const batch = adminDb.batch();
  batch.update(leaseRef, updateData);

  // Handle unit status changes based on lease status
  const previousStatus = currentData?.status;
  const newStatus = input.status;
  const propertyId = currentData?.propertyId;
  const unitId = currentData?.unitId;

  if (newStatus && newStatus !== previousStatus && propertyId && unitId) {
    // Lease becoming active → set unit to occupied
    if (newStatus === 'active') {
      await updateUnitStatus(batch, llcId, propertyId, unitId, 'occupied', actorUserId);
    }
    // Lease ending → set unit to vacant (if no other active leases)
    else if ((newStatus === 'ended' || newStatus === 'terminated') && previousStatus === 'active') {
      const hasOtherActive = await hasOtherActiveLeases(llcId, unitId, leaseId);
      if (!hasOtherActive) {
        await updateUnitStatus(batch, llcId, propertyId, unitId, 'vacant', actorUserId);
      }
    }
  }

  const auditRef = adminDb.collection('llcs').doc(llcId).collection('auditLogs').doc();
  batch.set(auditRef, {
    actorUserId,
    action: 'update',
    entityType: 'lease',
    entityId: leaseId,
    entityPath: `llcs/${llcId}/leases/${leaseId}`,
    changes: {
      before: { status: currentData?.status, rentAmount: currentData?.rentAmount },
      after: updateData,
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();
  return { id: leaseId, ...currentData, ...updateData };
}

/**
 * Get a single lease
 */
export async function getLease(llcId: string, leaseId: string) {
  const leaseRef = adminDb.collection('llcs').doc(llcId).collection('leases').doc(leaseId);
  const leaseDoc = await leaseRef.get();

  if (!leaseDoc.exists) {
    return null;
  }

  return { id: leaseDoc.id, ...leaseDoc.data() };
}

/**
 * List leases for an LLC, optionally filtered by propertyId or unitId
 */
export async function listLeases(llcId: string, propertyId?: string, unitId?: string) {
  let query = adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('leases')
    .orderBy('startDate', 'desc') as FirebaseFirestore.Query;

  if (propertyId) {
    query = query.where('propertyId', '==', propertyId);
  }
  if (unitId) {
    query = query.where('unitId', '==', unitId);
  }

  const snapshot = await query.get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * Delete a lease (only if status is 'draft').
 * Removes leaseId from tenants' leaseIds.
 */
export async function deleteLease(
  llcId: string,
  leaseId: string,
  actorUserId: string
) {
  const leaseRef = adminDb.collection('llcs').doc(llcId).collection('leases').doc(leaseId);
  const leaseDoc = await leaseRef.get();

  if (!leaseDoc.exists) {
    throw new Error('Lease not found');
  }

  const leaseData = leaseDoc.data();

  if (leaseData?.status !== 'draft') {
    throw new Error('Only draft leases can be deleted. Change status to ended or terminated instead.');
  }

  const batch = adminDb.batch();
  batch.delete(leaseRef);

  // Remove leaseId from tenants
  const tenantIds: string[] = leaseData?.tenantIds || [];
  for (const tenantId of tenantIds) {
    const tenantRef = adminDb.collection('llcs').doc(llcId).collection('tenants').doc(tenantId);
    batch.update(tenantRef, {
      leaseIds: FieldValue.arrayRemove(leaseId),
    });
  }

  const auditRef = adminDb.collection('llcs').doc(llcId).collection('auditLogs').doc();
  batch.set(auditRef, {
    actorUserId,
    action: 'delete',
    entityType: 'lease',
    entityId: leaseId,
    entityPath: `llcs/${llcId}/leases/${leaseId}`,
    changes: {
      before: {
        propertyId: leaseData?.propertyId,
        unitId: leaseData?.unitId,
        tenantIds: leaseData?.tenantIds,
        status: leaseData?.status,
      },
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();
  return { id: leaseId, deleted: true };
}

export interface RenewLeaseInput {
  startDate: string;
  endDate: string;
  rentAmount: number;
  rentChangeReason?: string;
  dueDay?: number;
  depositAmount?: number;
  terms?: {
    petPolicy?: 'allowed' | 'not_allowed' | 'case_by_case';
    petDeposit?: number;
    parkingSpaces?: number;
    utilitiesIncluded?: string[];
    specialTerms?: string;
  };
  notes?: string;
}

/**
 * Renew a lease - creates a new lease linked to the original via renewalOf.
 * The original lease status is updated to 'ended'.
 * Keeps the same property, unit, and tenants.
 */
export async function renewLease(
  llcId: string,
  originalLeaseId: string,
  input: RenewLeaseInput,
  actorUserId: string
) {
  // Get the original lease
  const originalLeaseRef = adminDb.collection('llcs').doc(llcId).collection('leases').doc(originalLeaseId);
  const originalLeaseDoc = await originalLeaseRef.get();

  if (!originalLeaseDoc.exists) {
    throw new Error('NOT_FOUND: Original lease not found');
  }

  const originalData = originalLeaseDoc.data();
  if (!originalData) {
    throw new Error('NOT_FOUND: Original lease data not found');
  }

  // Only active leases can be renewed
  if (originalData.status !== 'active') {
    throw new Error('INVALID_STATUS: Only active leases can be renewed');
  }

  // Create the new lease
  const newLeaseRef = adminDb.collection('llcs').doc(llcId).collection('leases').doc();
  const auditRef = adminDb.collection('llcs').doc(llcId).collection('auditLogs').doc();

  const newLeaseData = {
    llcId,
    propertyId: originalData.propertyId,
    unitId: originalData.unitId,
    tenantIds: originalData.tenantIds,
    tenantUserIds: originalData.tenantUserIds || [],
    startDate: input.startDate,
    endDate: input.endDate,
    rentAmount: input.rentAmount,
    dueDay: input.dueDay ?? originalData.dueDay,
    depositAmount: input.depositAmount ?? originalData.depositAmount,
    status: 'active',
    terms: input.terms ?? originalData.terms ?? null,
    renewalOf: originalLeaseId,
    notes: input.notes || null,
    rentChangeReason: input.rentChangeReason || null,
    previousRentAmount: originalData.rentAmount,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: actorUserId,
  };

  const batch = adminDb.batch();

  // Create the new lease
  batch.set(newLeaseRef, newLeaseData);

  // Update the original lease status to 'ended'
  batch.update(originalLeaseRef, {
    status: 'ended',
    renewedToLeaseId: newLeaseRef.id,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Audit log for new lease
  batch.set(auditRef, {
    actorUserId,
    action: 'create',
    entityType: 'lease',
    entityId: newLeaseRef.id,
    entityPath: `llcs/${llcId}/leases/${newLeaseRef.id}`,
    changes: {
      after: {
        action: 'renewal',
        renewalOf: originalLeaseId,
        rentAmount: input.rentAmount,
        previousRentAmount: originalData.rentAmount,
      },
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  // Audit log for original lease status change
  const auditRef2 = adminDb.collection('llcs').doc(llcId).collection('auditLogs').doc();
  batch.set(auditRef2, {
    actorUserId,
    action: 'update',
    entityType: 'lease',
    entityId: originalLeaseId,
    entityPath: `llcs/${llcId}/leases/${originalLeaseId}`,
    changes: {
      before: { status: 'active' },
      after: { status: 'ended', renewedToLeaseId: newLeaseRef.id },
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return {
    id: newLeaseRef.id,
    ...newLeaseData,
    originalLeaseId,
  };
}

/**
 * Get leases that are nearing expiration (ending within daysAhead days).
 * Only returns active leases.
 */
export async function getLeasesNearingExpiration(llcId: string, daysAhead: number = 60) {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + daysAhead);

  const todayStr = today.toISOString().slice(0, 10);
  const futureDateStr = futureDate.toISOString().slice(0, 10);

  // Get active leases ending between today and futureDate
  const snapshot = await adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('leases')
    .where('status', '==', 'active')
    .where('endDate', '>=', todayStr)
    .where('endDate', '<=', futureDateStr)
    .orderBy('endDate', 'asc')
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}
