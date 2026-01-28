import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export interface ParcelInfoInput {
  pid?: string;
  parcelAreaSqft?: number;
  torrensAbstract?: 'torrens' | 'abstract';
  addition?: string;
  lot?: string;
  block?: string;
  metesAndBounds?: string;
  assessedYear?: number;
  marketValue?: number;
  totalTax?: number;
  countyPropertyType?: string;
  homestead?: boolean;
  schoolDistrict?: string;
  sewerDistrict?: string;
  watershedDistrict?: string;
}

export interface CreatePropertyInput {
  name?: string;
  type: string;
  address: {
    street1: string;
    street2?: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
  };
  county?: string;
  yearBuilt?: number;
  status?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  parcelInfo?: ParcelInfoInput;
  notes?: string;
}

export interface UpdatePropertyInput {
  name?: string;
  type?: string;
  address?: {
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  county?: string;
  yearBuilt?: number;
  status?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  parcelInfo?: ParcelInfoInput;
  notes?: string;
}

/**
 * Create a new property under an LLC
 */
export async function createProperty(
  llcId: string,
  input: CreatePropertyInput,
  actorUserId: string
) {
  const propertyRef = adminDb.collection('llcs').doc(llcId).collection('properties').doc();
  const auditRef = adminDb.collection('llcs').doc(llcId).collection('auditLogs').doc();

  const propertyData = {
    llcId,
    name: input.name || null,
    type: input.type,
    address: { country: 'US', ...input.address },
    county: input.county || null,
    yearBuilt: input.yearBuilt || null,
    status: input.status || 'active',
    purchaseDate: input.purchaseDate || null,
    purchasePrice: input.purchasePrice || null,
    parcelInfo: input.parcelInfo || null,
    notes: input.notes || null,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: actorUserId,
  };

  const batch = adminDb.batch();
  batch.set(propertyRef, propertyData);
  batch.set(auditRef, {
    actorUserId,
    action: 'create',
    entityType: 'property',
    entityId: propertyRef.id,
    entityPath: `llcs/${llcId}/properties/${propertyRef.id}`,
    changes: { after: { name: input.name, type: input.type, address: input.address } },
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();
  return { id: propertyRef.id, ...propertyData };
}

/**
 * Update an existing property
 */
export async function updateProperty(
  llcId: string,
  propertyId: string,
  input: UpdatePropertyInput,
  actorUserId: string
) {
  const propertyRef = adminDb.collection('llcs').doc(llcId).collection('properties').doc(propertyId);
  const propertyDoc = await propertyRef.get();

  if (!propertyDoc.exists) {
    throw new Error('Property not found');
  }

  const currentData = propertyDoc.data();
  const updateData: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.type !== undefined) updateData.type = input.type;
  if (input.county !== undefined) updateData.county = input.county;
  if (input.yearBuilt !== undefined) updateData.yearBuilt = input.yearBuilt;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.purchaseDate !== undefined) updateData.purchaseDate = input.purchaseDate;
  if (input.purchasePrice !== undefined) updateData.purchasePrice = input.purchasePrice;
  if (input.notes !== undefined) updateData.notes = input.notes;

  if (input.address) {
    const currentAddress = currentData?.address || {};
    updateData.address = { ...currentAddress, ...input.address };
  }

  if (input.parcelInfo) {
    const currentParcel = currentData?.parcelInfo || {};
    updateData.parcelInfo = { ...currentParcel, ...input.parcelInfo };
  }

  const auditRef = adminDb.collection('llcs').doc(llcId).collection('auditLogs').doc();
  const batch = adminDb.batch();

  batch.update(propertyRef, updateData);
  batch.set(auditRef, {
    actorUserId,
    action: 'update',
    entityType: 'property',
    entityId: propertyId,
    entityPath: `llcs/${llcId}/properties/${propertyId}`,
    changes: {
      before: { name: currentData?.name, type: currentData?.type, address: currentData?.address },
      after: updateData,
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();
  return { id: propertyId, ...currentData, ...updateData };
}

/**
 * Get a single property
 */
export async function getProperty(llcId: string, propertyId: string) {
  const propertyRef = adminDb.collection('llcs').doc(llcId).collection('properties').doc(propertyId);
  const propertyDoc = await propertyRef.get();

  if (!propertyDoc.exists) {
    return null;
  }

  return { id: propertyDoc.id, ...propertyDoc.data() };
}

/**
 * List all properties for an LLC
 */
export async function listProperties(llcId: string) {
  const propertiesRef = adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('properties')
    .where('status', '!=', 'sold')
    .orderBy('createdAt', 'desc');

  const snapshot = await propertiesRef.get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * Delete a property (sets status to inactive)
 */
export async function archiveProperty(
  llcId: string,
  propertyId: string,
  actorUserId: string
) {
  const propertyRef = adminDb.collection('llcs').doc(llcId).collection('properties').doc(propertyId);
  const propertyDoc = await propertyRef.get();

  if (!propertyDoc.exists) {
    throw new Error('Property not found');
  }

  const auditRef = adminDb.collection('llcs').doc(llcId).collection('auditLogs').doc();
  const batch = adminDb.batch();

  batch.update(propertyRef, {
    status: 'inactive',
    updatedAt: FieldValue.serverTimestamp(),
  });

  batch.set(auditRef, {
    actorUserId,
    action: 'update',
    entityType: 'property',
    entityId: propertyId,
    entityPath: `llcs/${llcId}/properties/${propertyId}`,
    changes: {
      before: { status: propertyDoc.data()?.status },
      after: { status: 'inactive' },
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();
  return { id: propertyId, status: 'inactive' };
}
