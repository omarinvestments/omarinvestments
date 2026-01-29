import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  CaseType,
  CaseStatus,
  CaseVisibility,
  Plaintiff,
  OpposingParty,
  OpposingCounsel,
  CaseResolution,
} from '@shared/types';

export interface CreateCaseInput {
  propertyId?: string;
  unitId?: string;
  tenantId?: string;
  court: string;
  jurisdiction: string;
  docketNumber?: string;
  caseType: CaseType;
  status?: CaseStatus;
  visibility?: CaseVisibility;
  plaintiff?: Plaintiff;
  opposingParty?: OpposingParty;
  opposingCounsel?: OpposingCounsel;
  ourCounsel?: string;
  caseManagers?: string[];
  filingDate?: string;
  nextHearingDate?: string;
  resolution?: CaseResolution | null;
  description?: string;
  tags?: string[];
}

export interface UpdateCaseInput {
  court?: string;
  jurisdiction?: string;
  docketNumber?: string;
  caseType?: CaseType;
  status?: CaseStatus;
  visibility?: CaseVisibility;
  plaintiff?: Plaintiff;
  opposingParty?: OpposingParty;
  opposingCounsel?: OpposingCounsel;
  ourCounsel?: string;
  caseManagers?: string[];
  filingDate?: string;
  nextHearingDate?: string;
  resolution?: CaseResolution | null;
  description?: string;
  tags?: string[];
}

export interface CaseRecord {
  id: string;
  llcId: string;
  propertyId?: string;
  unitId?: string;
  tenantId?: string;
  court: string;
  jurisdiction: string;
  docketNumber?: string;
  caseType: CaseType;
  status: CaseStatus;
  visibility: CaseVisibility;
  plaintiff?: Plaintiff;
  opposingParty?: OpposingParty;
  opposingCounsel?: OpposingCounsel;
  ourCounsel?: string;
  caseManagers: string[];
  filingDate?: string;
  nextHearingDate?: string;
  resolution?: CaseResolution;
  description?: string;
  tags: string[];
  createdAt: string;
  updatedAt?: string;
}

/**
 * Create a new legal case.
 */
export async function createCase(
  llcId: string,
  input: CreateCaseInput,
  actorUserId: string
): Promise<CaseRecord> {
  const caseRef = adminDb.collection('llcs').doc(llcId).collection('cases').doc();
  const auditRef = adminDb.collection('llcs').doc(llcId).collection('auditLogs').doc();

  const caseData = {
    llcId,
    propertyId: input.propertyId || null,
    unitId: input.unitId || null,
    tenantId: input.tenantId || null,
    court: input.court,
    jurisdiction: input.jurisdiction,
    docketNumber: input.docketNumber || null,
    caseType: input.caseType,
    status: input.status || 'open',
    visibility: input.visibility || 'llcWide',
    plaintiff: input.plaintiff || null,
    opposingParty: input.opposingParty || null,
    opposingCounsel: input.opposingCounsel || null,
    ourCounsel: input.ourCounsel || null,
    caseManagers: input.caseManagers || [],
    filingDate: input.filingDate || null,
    nextHearingDate: input.nextHearingDate || null,
    resolution: input.resolution || null,
    description: input.description || null,
    tags: input.tags || [],
    createdAt: FieldValue.serverTimestamp(),
  };

  const batch = adminDb.batch();
  batch.set(caseRef, caseData);
  batch.set(auditRef, {
    actorUserId,
    action: 'create',
    entityType: 'case',
    entityId: caseRef.id,
    entityPath: `llcs/${llcId}/cases/${caseRef.id}`,
    changes: { after: { court: input.court, caseType: input.caseType } },
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return {
    id: caseRef.id,
    llcId,
    propertyId: input.propertyId,
    unitId: input.unitId,
    tenantId: input.tenantId,
    court: input.court,
    jurisdiction: input.jurisdiction,
    docketNumber: input.docketNumber,
    caseType: input.caseType as CaseType,
    status: (input.status || 'open') as CaseStatus,
    visibility: (input.visibility || 'llcWide') as CaseVisibility,
    plaintiff: input.plaintiff,
    opposingParty: input.opposingParty,
    opposingCounsel: input.opposingCounsel,
    ourCounsel: input.ourCounsel,
    caseManagers: input.caseManagers || [],
    filingDate: input.filingDate,
    nextHearingDate: input.nextHearingDate,
    resolution: input.resolution || undefined,
    description: input.description,
    tags: input.tags || [],
    createdAt: new Date().toISOString(),
  };
}

/**
 * List cases for an LLC.
 */
export async function listCases(llcId: string): Promise<CaseRecord[]> {
  const snap = await adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('cases')
    .orderBy('createdAt', 'desc')
    .get();

  return snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      llcId,
      propertyId: d.propertyId || undefined,
      unitId: d.unitId || undefined,
      tenantId: d.tenantId || undefined,
      court: d.court,
      jurisdiction: d.jurisdiction,
      docketNumber: d.docketNumber || undefined,
      caseType: d.caseType as CaseType,
      status: d.status as CaseStatus,
      visibility: d.visibility as CaseVisibility,
      plaintiff: d.plaintiff || undefined,
      opposingParty: d.opposingParty || undefined,
      opposingCounsel: d.opposingCounsel || undefined,
      ourCounsel: d.ourCounsel || undefined,
      caseManagers: d.caseManagers || [],
      filingDate: d.filingDate || undefined,
      nextHearingDate: d.nextHearingDate || undefined,
      resolution: d.resolution || undefined,
      description: d.description || undefined,
      tags: d.tags || [],
      createdAt: d.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: d.updatedAt?.toDate?.()?.toISOString() || undefined,
    };
  });
}

/**
 * Get a single case.
 */
export async function getCase(llcId: string, caseId: string): Promise<CaseRecord | null> {
  const doc = await adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('cases')
    .doc(caseId)
    .get();

  if (!doc.exists) return null;

  const d = doc.data();
  if (!d) return null;
  return {
    id: doc.id,
    llcId,
    propertyId: d.propertyId || undefined,
    unitId: d.unitId || undefined,
    tenantId: d.tenantId || undefined,
    court: d.court,
    jurisdiction: d.jurisdiction,
    docketNumber: d.docketNumber || undefined,
    caseType: d.caseType as CaseType,
    status: d.status as CaseStatus,
    visibility: d.visibility as CaseVisibility,
    plaintiff: d.plaintiff || undefined,
    opposingParty: d.opposingParty || undefined,
    opposingCounsel: d.opposingCounsel || undefined,
    ourCounsel: d.ourCounsel || undefined,
    caseManagers: d.caseManagers || [],
    filingDate: d.filingDate || undefined,
    nextHearingDate: d.nextHearingDate || undefined,
    resolution: d.resolution || undefined,
    description: d.description || undefined,
    tags: d.tags || [],
    createdAt: d.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt: d.updatedAt?.toDate?.()?.toISOString() || undefined,
  };
}

/**
 * Update a case.
 */
export async function updateCase(
  llcId: string,
  caseId: string,
  input: UpdateCaseInput,
  actorUserId: string
): Promise<CaseRecord> {
  const caseRef = adminDb.collection('llcs').doc(llcId).collection('cases').doc(caseId);
  const caseDoc = await caseRef.get();

  if (!caseDoc.exists) {
    throw new Error('NOT_FOUND: Case not found');
  }

  const currentData = caseDoc.data();
  if (!currentData) {
    throw new Error('INTERNAL_ERROR: Failed to read case data');
  }
  const updateData: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.court !== undefined) updateData.court = input.court;
  if (input.jurisdiction !== undefined) updateData.jurisdiction = input.jurisdiction;
  if (input.docketNumber !== undefined) updateData.docketNumber = input.docketNumber;
  if (input.caseType !== undefined) updateData.caseType = input.caseType;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.visibility !== undefined) updateData.visibility = input.visibility;
  if (input.plaintiff !== undefined) updateData.plaintiff = input.plaintiff;
  if (input.opposingParty !== undefined) updateData.opposingParty = input.opposingParty;
  if (input.opposingCounsel !== undefined) updateData.opposingCounsel = input.opposingCounsel;
  if (input.ourCounsel !== undefined) updateData.ourCounsel = input.ourCounsel;
  if (input.caseManagers !== undefined) updateData.caseManagers = input.caseManagers;
  if (input.filingDate !== undefined) updateData.filingDate = input.filingDate;
  if (input.nextHearingDate !== undefined) updateData.nextHearingDate = input.nextHearingDate;
  if (input.resolution !== undefined) updateData.resolution = input.resolution;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.tags !== undefined) updateData.tags = input.tags;

  const auditRef = adminDb.collection('llcs').doc(llcId).collection('auditLogs').doc();
  const batch = adminDb.batch();

  batch.update(caseRef, updateData);
  batch.set(auditRef, {
    actorUserId,
    action: 'update',
    entityType: 'case',
    entityId: caseId,
    entityPath: `llcs/${llcId}/cases/${caseId}`,
    changes: {
      before: { status: currentData.status, caseType: currentData.caseType },
      after: updateData,
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  const updated = await getCase(llcId, caseId);
  if (!updated) throw new Error('INTERNAL_ERROR: Failed to read updated case');
  return updated;
}

/**
 * Delete a case (hard delete). Only allowed for open cases with no tasks/documents.
 */
export async function deleteCase(
  llcId: string,
  caseId: string,
  actorUserId: string
): Promise<void> {
  const caseRef = adminDb.collection('llcs').doc(llcId).collection('cases').doc(caseId);
  const caseDoc = await caseRef.get();

  if (!caseDoc.exists) {
    throw new Error('NOT_FOUND: Case not found');
  }

  // Check for existing tasks, documents, or court dates
  const tasksSnap = await caseRef.collection('tasks').limit(1).get();
  if (!tasksSnap.empty) {
    throw new Error('HAS_CHILDREN: Cannot delete a case that has tasks. Remove tasks first.');
  }

  const docsSnap = await caseRef.collection('documents').limit(1).get();
  if (!docsSnap.empty) {
    throw new Error('HAS_CHILDREN: Cannot delete a case that has documents. Remove documents first.');
  }

  const courtDatesSnap = await caseRef.collection('courtDates').limit(1).get();
  if (!courtDatesSnap.empty) {
    throw new Error('HAS_CHILDREN: Cannot delete a case that has court dates. Remove court dates first.');
  }

  const auditRef = adminDb.collection('llcs').doc(llcId).collection('auditLogs').doc();
  const batch = adminDb.batch();

  batch.delete(caseRef);
  batch.set(auditRef, {
    actorUserId,
    action: 'delete',
    entityType: 'case',
    entityId: caseId,
    entityPath: `llcs/${llcId}/cases/${caseId}`,
    changes: { before: { court: caseDoc.data()?.court, status: caseDoc.data()?.status } },
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();
}
