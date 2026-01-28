import { adminDb } from '@/lib/firebase/admin';
import { getStorage } from 'firebase-admin/storage';
import { FieldValue } from 'firebase-admin/firestore';
import { LeaseDocumentType } from '@shared/types';

export interface CreateLeaseDocumentInput {
  type: LeaseDocumentType;
  title: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  generatedFromTemplate?: string;
}

export interface LeaseDocumentWithId {
  id: string;
  llcId: string;
  leaseId: string;
  type: LeaseDocumentType;
  title: string;
  fileName: string;
  storagePath: string;
  contentType: string;
  sizeBytes: number;
  generatedFromTemplate?: string;
  uploadedByUserId: string;
  createdAt: string;
  downloadUrl?: string;
}

/**
 * Generate a signed upload URL for uploading a document to Firebase Storage.
 */
export async function generateUploadUrl(
  llcId: string,
  leaseId: string,
  fileName: string,
  contentType: string
): Promise<{ uploadUrl: string; storagePath: string }> {
  const bucket = getStorage().bucket();
  const storagePath = `llcs/${llcId}/leases/${leaseId}/documents/${Date.now()}_${fileName}`;
  const file = bucket.file(storagePath);

  const [uploadUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    contentType,
  });

  return { uploadUrl, storagePath };
}

/**
 * Generate a signed download URL for a document.
 */
export async function generateDownloadUrl(storagePath: string): Promise<string> {
  const bucket = getStorage().bucket();
  const file = bucket.file(storagePath);

  const [downloadUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + 60 * 60 * 1000, // 1 hour
  });

  return downloadUrl;
}

/**
 * Create a lease document record after upload is complete.
 */
export async function createLeaseDocument(
  llcId: string,
  leaseId: string,
  storagePath: string,
  input: CreateLeaseDocumentInput,
  actorUserId: string
): Promise<LeaseDocumentWithId> {
  // Verify lease exists
  const leaseDoc = await adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('leases')
    .doc(leaseId)
    .get();

  if (!leaseDoc.exists) {
    throw new Error('NOT_FOUND: Lease not found');
  }

  const docRef = adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('leases')
    .doc(leaseId)
    .collection('documents')
    .doc();

  const docData = {
    llcId,
    leaseId,
    type: input.type,
    title: input.title,
    fileName: input.fileName,
    storagePath,
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
    generatedFromTemplate: input.generatedFromTemplate || null,
    uploadedByUserId: actorUserId,
    createdAt: FieldValue.serverTimestamp(),
  };

  const auditRef = adminDb.collection('llcs').doc(llcId).collection('auditLogs').doc();

  const batch = adminDb.batch();
  batch.set(docRef, docData);
  batch.set(auditRef, {
    actorUserId,
    action: 'create',
    entityType: 'lease_document',
    entityId: docRef.id,
    entityPath: `llcs/${llcId}/leases/${leaseId}/documents/${docRef.id}`,
    changes: {
      after: {
        type: input.type,
        title: input.title,
        fileName: input.fileName,
      },
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return {
    id: docRef.id,
    llcId,
    leaseId,
    type: input.type,
    title: input.title,
    fileName: input.fileName,
    storagePath,
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
    generatedFromTemplate: input.generatedFromTemplate,
    uploadedByUserId: actorUserId,
    createdAt: new Date().toISOString(),
  };
}

/**
 * List all documents for a lease.
 */
export async function listLeaseDocuments(
  llcId: string,
  leaseId: string
): Promise<LeaseDocumentWithId[]> {
  const snapshot = await adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('leases')
    .doc(leaseId)
    .collection('documents')
    .orderBy('createdAt', 'desc')
    .get();

  const documents: LeaseDocumentWithId[] = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    let downloadUrl: string | undefined;

    try {
      downloadUrl = await generateDownloadUrl(data.storagePath);
    } catch {
      // File may have been deleted from storage
    }

    documents.push({
      id: doc.id,
      llcId: data.llcId,
      leaseId: data.leaseId,
      type: data.type as LeaseDocumentType,
      title: data.title,
      fileName: data.fileName,
      storagePath: data.storagePath,
      contentType: data.contentType,
      sizeBytes: data.sizeBytes,
      generatedFromTemplate: data.generatedFromTemplate || undefined,
      uploadedByUserId: data.uploadedByUserId,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      downloadUrl,
    });
  }

  return documents;
}

/**
 * Get a single document.
 */
export async function getLeaseDocument(
  llcId: string,
  leaseId: string,
  documentId: string
): Promise<LeaseDocumentWithId | null> {
  const docRef = await adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('leases')
    .doc(leaseId)
    .collection('documents')
    .doc(documentId)
    .get();

  if (!docRef.exists) {
    return null;
  }

  const data = docRef.data();
  if (!data) {
    return null;
  }

  let downloadUrl: string | undefined;
  try {
    downloadUrl = await generateDownloadUrl(data.storagePath);
  } catch {
    // File may have been deleted
  }

  return {
    id: docRef.id,
    llcId: data.llcId,
    leaseId: data.leaseId,
    type: data.type as LeaseDocumentType,
    title: data.title,
    fileName: data.fileName,
    storagePath: data.storagePath,
    contentType: data.contentType,
    sizeBytes: data.sizeBytes,
    generatedFromTemplate: data.generatedFromTemplate || undefined,
    uploadedByUserId: data.uploadedByUserId,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    downloadUrl,
  };
}

/**
 * Delete a document (removes from Firestore and Storage).
 */
export async function deleteLeaseDocument(
  llcId: string,
  leaseId: string,
  documentId: string,
  actorUserId: string
): Promise<void> {
  const docRef = adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('leases')
    .doc(leaseId)
    .collection('documents')
    .doc(documentId);

  const docSnapshot = await docRef.get();

  if (!docSnapshot.exists) {
    throw new Error('NOT_FOUND: Document not found');
  }

  const data = docSnapshot.data();
  if (!data) {
    throw new Error('NOT_FOUND: Document data not found');
  }

  // Delete from Storage
  try {
    const bucket = getStorage().bucket();
    await bucket.file(data.storagePath).delete();
  } catch {
    // File may already be deleted, continue with Firestore deletion
  }

  const auditRef = adminDb.collection('llcs').doc(llcId).collection('auditLogs').doc();

  const batch = adminDb.batch();
  batch.delete(docRef);
  batch.set(auditRef, {
    actorUserId,
    action: 'delete',
    entityType: 'lease_document',
    entityId: documentId,
    entityPath: `llcs/${llcId}/leases/${leaseId}/documents/${documentId}`,
    changes: {
      before: {
        type: data.type,
        title: data.title,
        fileName: data.fileName,
      },
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();
}
