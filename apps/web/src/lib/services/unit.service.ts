import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export interface CreateUnitInput {
  unitNumber: string;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  status?: string;
  marketRent?: number;
  notes?: string;
}

export interface UpdateUnitInput {
  unitNumber?: string;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  status?: string;
  marketRent?: number;
  notes?: string;
}

/**
 * Create a new unit under a property
 */
export async function createUnit(
  llcId: string,
  propertyId: string,
  input: CreateUnitInput,
  actorUserId: string
) {
  const unitRef = adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('properties')
    .doc(propertyId)
    .collection('units')
    .doc();

  const auditRef = adminDb.collection('llcs').doc(llcId).collection('auditLogs').doc();

  const unitData = {
    llcId,
    propertyId,
    unitNumber: input.unitNumber,
    bedrooms: input.bedrooms ?? null,
    bathrooms: input.bathrooms ?? null,
    sqft: input.sqft ?? null,
    status: input.status || 'available',
    marketRent: input.marketRent ?? null,
    notes: input.notes || null,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: actorUserId,
  };

  const batch = adminDb.batch();
  batch.set(unitRef, unitData);
  batch.set(auditRef, {
    actorUserId,
    action: 'create',
    entityType: 'unit',
    entityId: unitRef.id,
    entityPath: `llcs/${llcId}/properties/${propertyId}/units/${unitRef.id}`,
    changes: { after: { unitNumber: input.unitNumber, propertyId } },
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();
  return { id: unitRef.id, ...unitData };
}

/**
 * Update an existing unit
 */
export async function updateUnit(
  llcId: string,
  propertyId: string,
  unitId: string,
  input: UpdateUnitInput,
  actorUserId: string
) {
  const unitRef = adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('properties')
    .doc(propertyId)
    .collection('units')
    .doc(unitId);

  const unitDoc = await unitRef.get();

  if (!unitDoc.exists) {
    throw new Error('Unit not found');
  }

  const currentData = unitDoc.data();
  const updateData: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.unitNumber !== undefined) updateData.unitNumber = input.unitNumber;
  if (input.bedrooms !== undefined) updateData.bedrooms = input.bedrooms;
  if (input.bathrooms !== undefined) updateData.bathrooms = input.bathrooms;
  if (input.sqft !== undefined) updateData.sqft = input.sqft;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.marketRent !== undefined) updateData.marketRent = input.marketRent;
  if (input.notes !== undefined) updateData.notes = input.notes;

  const auditRef = adminDb.collection('llcs').doc(llcId).collection('auditLogs').doc();
  const batch = adminDb.batch();

  batch.update(unitRef, updateData);
  batch.set(auditRef, {
    actorUserId,
    action: 'update',
    entityType: 'unit',
    entityId: unitId,
    entityPath: `llcs/${llcId}/properties/${propertyId}/units/${unitId}`,
    changes: {
      before: { unitNumber: currentData?.unitNumber, status: currentData?.status },
      after: updateData,
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();
  return { id: unitId, ...currentData, ...updateData };
}

/**
 * Get a single unit
 */
export async function getUnit(llcId: string, propertyId: string, unitId: string) {
  const unitRef = adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('properties')
    .doc(propertyId)
    .collection('units')
    .doc(unitId);

  const unitDoc = await unitRef.get();

  if (!unitDoc.exists) {
    return null;
  }

  return { id: unitDoc.id, ...unitDoc.data() };
}

/**
 * List all units for a property
 */
export async function listUnits(llcId: string, propertyId: string) {
  const unitsRef = adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('properties')
    .doc(propertyId)
    .collection('units')
    .orderBy('unitNumber', 'asc');

  const snapshot = await unitsRef.get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * Delete a unit (hard delete — only if status is not 'occupied')
 */
export async function deleteUnit(
  llcId: string,
  propertyId: string,
  unitId: string,
  actorUserId: string
) {
  const unitRef = adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('properties')
    .doc(propertyId)
    .collection('units')
    .doc(unitId);

  const unitDoc = await unitRef.get();

  if (!unitDoc.exists) {
    throw new Error('Unit not found');
  }

  const unitData = unitDoc.data();

  if (unitData?.status === 'occupied') {
    throw new Error('Cannot delete an occupied unit. Change status first.');
  }

  const auditRef = adminDb.collection('llcs').doc(llcId).collection('auditLogs').doc();
  const batch = adminDb.batch();

  batch.delete(unitRef);
  batch.set(auditRef, {
    actorUserId,
    action: 'delete',
    entityType: 'unit',
    entityId: unitId,
    entityPath: `llcs/${llcId}/properties/${propertyId}/units/${unitId}`,
    changes: {
      before: { unitNumber: unitData?.unitNumber, status: unitData?.status },
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();
  return { id: unitId, deleted: true };
}
