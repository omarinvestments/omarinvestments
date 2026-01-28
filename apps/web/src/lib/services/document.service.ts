import { adminDb, adminStorage } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { DocumentType } from '@shared/types';

export interface CreateDocumentInput {
  title: string;
  type: DocumentType;
  fileName: string;
  storagePath: string;
  contentType: string;
  sizeBytes: number;
}

export interface DocumentRecord {
  id: string;
  caseId: string;
  llcId: string;
  title: string;
  type: DocumentType;
  fileName: string;
  storagePath: string;
  contentType: string;
  sizeBytes: number;
  uploadedByUserId: string;
  createdAt: string;
}

/**
 * Create a document metadata record (after file is uploaded to Storage).
 */
export async function createDocument(
  llcId: string,
  caseId: string,
  input: CreateDocumentInput,
  actorUserId: string
): Promise<DocumentRecord> {
  const docRef = adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('cases')
    .doc(caseId)
    .collection('documents')
    .doc();

  const auditRef = adminDb.collection('llcs').doc(llcId).collection('auditLogs').doc();

  const docData = {
    caseId,
    llcId,
    title: input.title,
    type: input.type,
    fileName: input.fileName,
    storagePath: input.storagePath,
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
    uploadedByUserId: actorUserId,
    createdAt: FieldValue.serverTimestamp(),
  };

  const batch = adminDb.batch();
  batch.set(docRef, docData);
  batch.set(auditRef, {
    actorUserId,
    action: 'create',
    entityType: 'case_document',
    entityId: docRef.id,
    entityPath: `llcs/${llcId}/cases/${caseId}/documents/${docRef.id}`,
    changes: { after: { title: input.title, fileName: input.fileName } },
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return {
    id: docRef.id,
    caseId,
    llcId,
    title: input.title,
    type: input.type as DocumentType,
    fileName: input.fileName,
    storagePath: input.storagePath,
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
    uploadedByUserId: actorUserId,
    createdAt: new Date().toISOString(),
  };
}

/**
 * List documents for a case.
 */
export async function listDocuments(llcId: string, caseId: string): Promise<DocumentRecord[]> {
  const snap = await adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('cases')
    .doc(caseId)
    .collection('documents')
    .orderBy('createdAt', 'desc')
    .get();

  return snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      caseId,
      llcId,
      title: d.title,
      type: d.type as DocumentType,
      fileName: d.fileName,
      storagePath: d.storagePath,
      contentType: d.contentType,
      sizeBytes: d.sizeBytes,
      uploadedByUserId: d.uploadedByUserId,
      createdAt: d.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    };
  });
}

/**
 * Delete a document record and its storage file.
 */
export async function deleteDocument(
  llcId: string,
  caseId: string,
  documentId: string,
  actorUserId: string
): Promise<void> {
  const docRef = adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('cases')
    .doc(caseId)
    .collection('documents')
    .doc(documentId);

  const docSnap = await docRef.get();
  if (!docSnap.exists) {
    throw new Error('NOT_FOUND: Document not found');
  }

  const docData = docSnap.data();
  if (!docData) {
    throw new Error('NOT_FOUND: Document data is empty');
  }

  // Delete file from Storage
  try {
    const bucket = adminStorage.bucket();
    await bucket.file(docData.storagePath).delete();
  } catch {
    // File may already be deleted; continue with metadata cleanup
  }

  const auditRef = adminDb.collection('llcs').doc(llcId).collection('auditLogs').doc();
  const batch = adminDb.batch();

  batch.delete(docRef);
  batch.set(auditRef, {
    actorUserId,
    action: 'delete',
    entityType: 'case_document',
    entityId: documentId,
    entityPath: `llcs/${llcId}/cases/${caseId}/documents/${documentId}`,
    changes: { before: { title: docData.title, fileName: docData.fileName } },
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();
}

/**
 * Generate a signed upload URL for a case document.
 */
export async function generateUploadUrl(
  llcId: string,
  caseId: string,
  fileName: string,
  contentType: string
): Promise<{ uploadUrl: string; storagePath: string }> {
  const storagePath = `llcs/${llcId}/cases/${caseId}/documents/${Date.now()}_${fileName}`;
  const bucket = adminStorage.bucket();
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
 * Generate a signed download URL for a case document.
 */
export async function generateDownloadUrl(storagePath: string): Promise<string> {
  const bucket = adminStorage.bucket();
  const file = bucket.file(storagePath);

  const [downloadUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + 60 * 60 * 1000, // 1 hour
  });

  return downloadUrl;
}
