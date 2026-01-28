import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { LLCSettings } from '@shared/types';

// Default settings for new LLCs
const DEFAULT_SETTINGS: LLCSettings = {
  timezone: 'America/Chicago',
  currency: 'usd',
  lateFeeEnabled: false,
};

export interface CreateLlcInput {
  legalName: string;
  einLast4?: string;
  settings?: Partial<LLCSettings>;
}

export interface UpdateLlcInput {
  legalName?: string;
  einLast4?: string;
  settings?: Partial<LLCSettings>;
}

/**
 * Create a new LLC and add the creator as admin member
 */
export async function createLlc(input: CreateLlcInput, creatorUserId: string) {
  const llcRef = adminDb.collection('llcs').doc();
  const membersRef = llcRef.collection('members').doc(creatorUserId);
  const auditRef = llcRef.collection('auditLogs').doc();

  const llcData = {
    legalName: input.legalName,
    einLast4: input.einLast4 || null,
    stripeConnectedAccountId: null,
    settings: { ...DEFAULT_SETTINGS, ...input.settings },
    status: 'active',
    createdAt: FieldValue.serverTimestamp(),
    createdBy: creatorUserId,
  };

  const memberData = {
    userId: creatorUserId,
    role: 'admin',
    propertyScopes: [],
    caseScopes: [],
    status: 'active',
    createdAt: FieldValue.serverTimestamp(),
  };

  const auditData = {
    actorUserId: creatorUserId,
    action: 'create',
    entityType: 'llc',
    entityId: llcRef.id,
    entityPath: `llcs/${llcRef.id}`,
    changes: { after: { legalName: input.legalName } },
    createdAt: FieldValue.serverTimestamp(),
  };

  // Atomic write: LLC + member + audit log
  const batch = adminDb.batch();
  batch.set(llcRef, llcData);
  batch.set(membersRef, memberData);
  batch.set(auditRef, auditData);
  await batch.commit();

  return { id: llcRef.id, ...llcData };
}

/**
 * Update an existing LLC's details or settings
 */
export async function updateLlc(llcId: string, input: UpdateLlcInput, actorUserId: string) {
  const llcRef = adminDb.collection('llcs').doc(llcId);
  const llcDoc = await llcRef.get();

  if (!llcDoc.exists) {
    throw new Error('LLC not found');
  }

  const currentData = llcDoc.data();
  const updateData: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.legalName !== undefined) {
    updateData.legalName = input.legalName;
  }

  if (input.einLast4 !== undefined) {
    updateData.einLast4 = input.einLast4;
  }

  if (input.settings) {
    // Merge settings (don't overwrite entire object)
    const currentSettings = currentData?.settings || DEFAULT_SETTINGS;
    updateData.settings = { ...currentSettings, ...input.settings };
  }

  // Write update + audit log atomically
  const auditRef = llcRef.collection('auditLogs').doc();
  const batch = adminDb.batch();

  batch.update(llcRef, updateData);
  batch.set(auditRef, {
    actorUserId,
    action: 'update',
    entityType: 'llc',
    entityId: llcId,
    entityPath: `llcs/${llcId}`,
    changes: {
      before: { legalName: currentData?.legalName, settings: currentData?.settings },
      after: updateData,
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return { id: llcId, ...currentData, ...updateData };
}

/**
 * Copy an LLC's structure to create a new entity.
 * Copies settings but NOT data (properties, tenants, etc.)
 */
export async function copyLlc(
  sourceLlcId: string,
  newLegalName: string,
  creatorUserId: string
) {
  const sourceRef = adminDb.collection('llcs').doc(sourceLlcId);
  const sourceDoc = await sourceRef.get();

  if (!sourceDoc.exists) {
    throw new Error('Source LLC not found');
  }

  const sourceData = sourceDoc.data();

  // Create a new LLC with the source's settings but a new name
  return createLlc(
    {
      legalName: newLegalName,
      settings: sourceData?.settings,
    },
    creatorUserId
  );
}

/**
 * Archive an LLC (soft delete - sets status to 'archived')
 */
export async function archiveLlc(llcId: string, actorUserId: string) {
  const llcRef = adminDb.collection('llcs').doc(llcId);
  const llcDoc = await llcRef.get();

  if (!llcDoc.exists) {
    throw new Error('LLC not found');
  }

  const currentData = llcDoc.data();

  if (currentData?.status === 'archived') {
    throw new Error('LLC is already archived');
  }

  const auditRef = llcRef.collection('auditLogs').doc();
  const batch = adminDb.batch();

  batch.update(llcRef, {
    status: 'archived',
    archivedAt: FieldValue.serverTimestamp(),
    archivedBy: actorUserId,
    updatedAt: FieldValue.serverTimestamp(),
  });

  batch.set(auditRef, {
    actorUserId,
    action: 'update',
    entityType: 'llc',
    entityId: llcId,
    entityPath: `llcs/${llcId}`,
    changes: {
      before: { status: currentData?.status },
      after: { status: 'archived' },
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return { id: llcId, status: 'archived' };
}

/**
 * Restore an archived LLC
 */
export async function restoreLlc(llcId: string, actorUserId: string) {
  const llcRef = adminDb.collection('llcs').doc(llcId);
  const llcDoc = await llcRef.get();

  if (!llcDoc.exists) {
    throw new Error('LLC not found');
  }

  if (llcDoc.data()?.status !== 'archived') {
    throw new Error('LLC is not archived');
  }

  const auditRef = llcRef.collection('auditLogs').doc();
  const batch = adminDb.batch();

  batch.update(llcRef, {
    status: 'active',
    archivedAt: FieldValue.delete(),
    archivedBy: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  batch.set(auditRef, {
    actorUserId,
    action: 'update',
    entityType: 'llc',
    entityId: llcId,
    entityPath: `llcs/${llcId}`,
    changes: {
      before: { status: 'archived' },
      after: { status: 'active' },
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return { id: llcId, status: 'active' };
}

/**
 * Get a single LLC by ID
 */
export async function getLlc(llcId: string) {
  const llcRef = adminDb.collection('llcs').doc(llcId);
  const llcDoc = await llcRef.get();

  if (!llcDoc.exists) {
    return null;
  }

  return { id: llcDoc.id, ...llcDoc.data() };
}

/**
 * List all LLCs where the user is an active member
 */
export async function listUserLlcs(userId: string) {
  // Query all LLC member documents for this user
  const memberQuery = await adminDb
    .collectionGroup('members')
    .where('userId', '==', userId)
    .where('status', '==', 'active')
    .get();

  if (memberQuery.empty) {
    return [];
  }

  // Extract LLC IDs from the member document paths
  const llcIds = memberQuery.docs.map((doc) => {
    // Path: llcs/{llcId}/members/{userId}
    const pathParts = doc.ref.path.split('/');
    return pathParts[1]; // llcId
  });

  // Fetch all LLC documents
  const llcRefs = llcIds.map((id) => adminDb.collection('llcs').doc(id as string));
  const llcDocs = await adminDb.getAll(...llcRefs);

  return llcDocs
    .filter((doc) => doc.exists && doc.data()?.status !== 'archived')
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
      memberRole: memberQuery.docs
        .find((m) => m.ref.path.includes(doc.id))
        ?.data()?.role,
    }));
}
