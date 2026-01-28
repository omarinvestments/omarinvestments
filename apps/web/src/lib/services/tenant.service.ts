import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export interface CreateResidentialTenantInput {
  type: 'residential';
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  ssn4?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  notes?: string;
}

export interface CreateCommercialTenantInput {
  type: 'commercial';
  businessName: string;
  dba?: string;
  businessType: string;
  einLast4?: string;
  stateOfIncorporation?: string;
  primaryContact: {
    name: string;
    title?: string;
    email?: string;
    phone?: string;
  };
  email: string;
  phone?: string;
  notes?: string;
}

export type CreateTenantInput = CreateResidentialTenantInput | CreateCommercialTenantInput;

export interface TenantData {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  [key: string]: unknown;
}

export interface UpdateTenantInput {
  type: 'residential' | 'commercial';
  email?: string;
  phone?: string;
  notes?: string;
  // Residential fields
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  ssn4?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  // Commercial fields
  businessName?: string;
  dba?: string;
  businessType?: string;
  einLast4?: string;
  stateOfIncorporation?: string;
  primaryContact?: {
    name: string;
    title?: string;
    email?: string;
    phone?: string;
  };
}

/**
 * Create a new global tenant
 */
export async function createTenant(
  input: CreateTenantInput,
  actorUserId: string
) {
  const tenantRef = adminDb.collection('tenants').doc();

  const baseTenantData = {
    type: input.type,
    email: input.email,
    phone: input.phone || null,
    notes: input.notes || null,
    stripeCustomerId: null,
    userId: null,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: actorUserId,
    updates: [],
  };

  let tenantData: Record<string, unknown>;

  if (input.type === 'residential') {
    tenantData = {
      ...baseTenantData,
      firstName: input.firstName,
      lastName: input.lastName,
      dateOfBirth: input.dateOfBirth || null,
      ssn4: input.ssn4 || null,
      emergencyContact: input.emergencyContact || null,
    };
  } else {
    tenantData = {
      ...baseTenantData,
      businessName: input.businessName,
      dba: input.dba || null,
      businessType: input.businessType,
      einLast4: input.einLast4 || null,
      stateOfIncorporation: input.stateOfIncorporation || null,
      primaryContact: input.primaryContact,
    };
  }

  await tenantRef.set(tenantData);
  return { id: tenantRef.id, ...tenantData };
}

/**
 * Update an existing tenant
 */
export async function updateTenant(
  tenantId: string,
  input: UpdateTenantInput,
  actorUserId: string
) {
  const tenantRef = adminDb.collection('tenants').doc(tenantId);
  const tenantDoc = await tenantRef.get();

  if (!tenantDoc.exists) {
    throw new Error('Tenant not found');
  }

  const currentData = tenantDoc.data();
  const updateData: Record<string, unknown> = {};

  // Shared fields
  if (input.email !== undefined) updateData.email = input.email;
  if (input.phone !== undefined) updateData.phone = input.phone;
  if (input.notes !== undefined) updateData.notes = input.notes;

  // Type-specific fields
  if (input.type === 'residential') {
    if (input.firstName !== undefined) updateData.firstName = input.firstName;
    if (input.lastName !== undefined) updateData.lastName = input.lastName;
    if (input.dateOfBirth !== undefined) updateData.dateOfBirth = input.dateOfBirth;
    if (input.ssn4 !== undefined) updateData.ssn4 = input.ssn4;
    if (input.emergencyContact !== undefined) updateData.emergencyContact = input.emergencyContact;
  } else {
    if (input.businessName !== undefined) updateData.businessName = input.businessName;
    if (input.dba !== undefined) updateData.dba = input.dba;
    if (input.businessType !== undefined) updateData.businessType = input.businessType;
    if (input.einLast4 !== undefined) updateData.einLast4 = input.einLast4;
    if (input.stateOfIncorporation !== undefined) updateData.stateOfIncorporation = input.stateOfIncorporation;
    if (input.primaryContact !== undefined) updateData.primaryContact = input.primaryContact;
  }

  // Add update record to the updates array
  const updateRecord = {
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: actorUserId,
  };

  await tenantRef.update({
    ...updateData,
    updates: FieldValue.arrayUnion(updateRecord),
  });

  return { id: tenantId, ...currentData, ...updateData };
}

/**
 * Get a single tenant by ID
 */
export async function getTenant(tenantId: string) {
  const tenantRef = adminDb.collection('tenants').doc(tenantId);
  const tenantDoc = await tenantRef.get();

  if (!tenantDoc.exists) {
    return null;
  }

  return { id: tenantDoc.id, ...tenantDoc.data() };
}

/**
 * Get multiple tenants by their IDs
 */
export async function getTenantsByIds(tenantIds: string[]) {
  if (tenantIds.length === 0) {
    return [];
  }

  // Firestore 'in' queries support max 30 items
  const chunks: string[][] = [];
  for (let i = 0; i < tenantIds.length; i += 30) {
    chunks.push(tenantIds.slice(i, i + 30));
  }

  const results: Array<{ id: string; [key: string]: unknown }> = [];

  for (const chunk of chunks) {
    const snapshot = await adminDb
      .collection('tenants')
      .where('__name__', 'in', chunk)
      .get();

    snapshot.docs.forEach((doc) => {
      results.push({ id: doc.id, ...doc.data() });
    });
  }

  return results;
}

/**
 * List all tenants created by a specific user
 */
export async function listTenants(createdByUserId: string) {
  const snapshot = await adminDb
    .collection('tenants')
    .where('createdBy', '==', createdByUserId)
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * List all tenants (admin-level access for searching across all tenants)
 */
export async function listAllTenants(limit = 100) {
  const snapshot = await adminDb
    .collection('tenants')
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * Search tenants by name or email
 */
export async function searchTenants(query: string, limit = 50) {
  const lowerQuery = query.toLowerCase();

  // Firestore doesn't support full-text search, so we'll fetch and filter client-side
  // For production, consider using Algolia, Elasticsearch, or Firebase Extensions
  const snapshot = await adminDb
    .collection('tenants')
    .orderBy('createdAt', 'desc')
    .limit(500) // Fetch more to filter
    .get();

  const results = snapshot.docs
    .map((doc): TenantData => ({ id: doc.id, ...doc.data() }))
    .filter((tenant) => {
      const email = (tenant.email || '').toLowerCase();
      const firstName = (tenant.firstName || '').toLowerCase();
      const lastName = (tenant.lastName || '').toLowerCase();
      const businessName = (tenant.businessName || '').toLowerCase();
      const fullName = `${firstName} ${lastName}`.trim();

      return (
        email.includes(lowerQuery) ||
        firstName.includes(lowerQuery) ||
        lastName.includes(lowerQuery) ||
        fullName.includes(lowerQuery) ||
        businessName.includes(lowerQuery)
      );
    })
    .slice(0, limit);

  return results;
}

/**
 * Delete a tenant (hard delete)
 * Note: Should verify no active leases reference this tenant before calling
 */
export async function deleteTenant(
  tenantId: string,
  actorUserId: string
) {
  const tenantRef = adminDb.collection('tenants').doc(tenantId);
  const tenantDoc = await tenantRef.get();

  if (!tenantDoc.exists) {
    throw new Error('Tenant not found');
  }

  // Check if any leases reference this tenant
  const leasesSnapshot = await adminDb
    .collectionGroup('leases')
    .where('tenantIds', 'array-contains', tenantId)
    .where('status', 'in', ['draft', 'active'])
    .limit(1)
    .get();

  if (!leasesSnapshot.empty) {
    throw new Error('Cannot delete tenant with active leases. Remove lease associations first.');
  }

  await tenantRef.delete();
  return { id: tenantId, deleted: true, deletedBy: actorUserId };
}

// ============================================
// Legacy functions for backward compatibility
// These can be removed after migration is complete
// ============================================

/**
 * @deprecated Use getTenant(tenantId) instead
 */
export async function getTenantLegacy(llcId: string, tenantId: string) {
  // First try global collection
  const globalTenant = await getTenant(tenantId);
  if (globalTenant) {
    return globalTenant;
  }

  // Fall back to legacy LLC-scoped collection
  const tenantRef = adminDb.collection('llcs').doc(llcId).collection('tenants').doc(tenantId);
  const tenantDoc = await tenantRef.get();

  if (!tenantDoc.exists) {
    return null;
  }

  return { id: tenantDoc.id, ...tenantDoc.data() };
}

/**
 * @deprecated Use listTenants(createdByUserId) instead
 */
export async function listTenantsLegacy(llcId: string) {
  const snapshot = await adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('tenants')
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}
