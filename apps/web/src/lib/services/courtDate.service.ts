import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type {
  CourtDateType,
  CourtDateStatus,
  CourtDateOutcome,
} from '@shared/types';

export interface CreateCourtDateInput {
  type: CourtDateType;
  date: string; // YYYY-MM-DD
  time?: string;
  judge?: string;
  courtroom?: string;
  description?: string;
  status?: CourtDateStatus;
  outcome?: CourtDateOutcome;
  outcomeNotes?: string;
}

export interface UpdateCourtDateInput {
  type?: CourtDateType;
  date?: string;
  time?: string;
  judge?: string;
  courtroom?: string;
  description?: string;
  status?: CourtDateStatus;
  outcome?: CourtDateOutcome;
  outcomeNotes?: string;
}

export interface CourtDateRecord {
  id: string;
  caseId: string;
  llcId: string;
  type: CourtDateType;
  date: string;
  time?: string;
  judge?: string;
  courtroom?: string;
  description?: string;
  status: CourtDateStatus;
  outcome?: CourtDateOutcome;
  outcomeNotes?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Create a new court date for a case.
 */
export async function createCourtDate(
  llcId: string,
  caseId: string,
  input: CreateCourtDateInput,
  actorUserId: string
): Promise<CourtDateRecord> {
  const caseRef = adminDb.collection('llcs').doc(llcId).collection('cases').doc(caseId);
  const caseDoc = await caseRef.get();

  if (!caseDoc.exists) {
    throw new Error('NOT_FOUND: Case not found');
  }

  const courtDateRef = caseRef.collection('courtDates').doc();
  const auditRef = adminDb.collection('llcs').doc(llcId).collection('auditLogs').doc();

  const courtDateData = {
    caseId,
    llcId,
    type: input.type,
    date: input.date,
    time: input.time || null,
    judge: input.judge || null,
    courtroom: input.courtroom || null,
    description: input.description || null,
    status: input.status || 'scheduled',
    outcome: input.outcome || null,
    outcomeNotes: input.outcomeNotes || null,
    createdAt: FieldValue.serverTimestamp(),
  };

  const batch = adminDb.batch();
  batch.set(courtDateRef, courtDateData);
  batch.set(auditRef, {
    actorUserId,
    action: 'create',
    entityType: 'courtDate',
    entityId: courtDateRef.id,
    entityPath: `llcs/${llcId}/cases/${caseId}/courtDates/${courtDateRef.id}`,
    changes: { after: { type: input.type, date: input.date } },
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  // Update nextHearingDate on the case
  await updateCaseNextHearingDate(llcId, caseId);

  return {
    id: courtDateRef.id,
    caseId,
    llcId,
    type: input.type,
    date: input.date,
    time: input.time,
    judge: input.judge,
    courtroom: input.courtroom,
    description: input.description,
    status: input.status || 'scheduled',
    outcome: input.outcome,
    outcomeNotes: input.outcomeNotes,
    createdAt: new Date().toISOString(),
  };
}

/**
 * List court dates for a case.
 */
export async function listCourtDates(
  llcId: string,
  caseId: string
): Promise<CourtDateRecord[]> {
  const snap = await adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('cases')
    .doc(caseId)
    .collection('courtDates')
    .orderBy('date', 'asc')
    .get();

  return snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      caseId,
      llcId,
      type: d.type as CourtDateType,
      date: d.date,
      time: d.time || undefined,
      judge: d.judge || undefined,
      courtroom: d.courtroom || undefined,
      description: d.description || undefined,
      status: d.status as CourtDateStatus,
      outcome: d.outcome || undefined,
      outcomeNotes: d.outcomeNotes || undefined,
      createdAt: d.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: d.updatedAt?.toDate?.()?.toISOString() || undefined,
    };
  });
}

/**
 * Get a single court date.
 */
export async function getCourtDate(
  llcId: string,
  caseId: string,
  courtDateId: string
): Promise<CourtDateRecord | null> {
  const doc = await adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('cases')
    .doc(caseId)
    .collection('courtDates')
    .doc(courtDateId)
    .get();

  if (!doc.exists) return null;

  const d = doc.data();
  if (!d) return null;

  return {
    id: doc.id,
    caseId,
    llcId,
    type: d.type as CourtDateType,
    date: d.date,
    time: d.time || undefined,
    judge: d.judge || undefined,
    courtroom: d.courtroom || undefined,
    description: d.description || undefined,
    status: d.status as CourtDateStatus,
    outcome: d.outcome || undefined,
    outcomeNotes: d.outcomeNotes || undefined,
    createdAt: d.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt: d.updatedAt?.toDate?.()?.toISOString() || undefined,
  };
}

/**
 * Update a court date.
 */
export async function updateCourtDate(
  llcId: string,
  caseId: string,
  courtDateId: string,
  input: UpdateCourtDateInput,
  actorUserId: string
): Promise<CourtDateRecord> {
  const courtDateRef = adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('cases')
    .doc(caseId)
    .collection('courtDates')
    .doc(courtDateId);

  const courtDateDoc = await courtDateRef.get();

  if (!courtDateDoc.exists) {
    throw new Error('NOT_FOUND: Court date not found');
  }

  const currentData = courtDateDoc.data();
  const updateData: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.type !== undefined) updateData.type = input.type;
  if (input.date !== undefined) updateData.date = input.date;
  if (input.time !== undefined) updateData.time = input.time;
  if (input.judge !== undefined) updateData.judge = input.judge;
  if (input.courtroom !== undefined) updateData.courtroom = input.courtroom;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.outcome !== undefined) updateData.outcome = input.outcome;
  if (input.outcomeNotes !== undefined) updateData.outcomeNotes = input.outcomeNotes;

  const auditRef = adminDb.collection('llcs').doc(llcId).collection('auditLogs').doc();
  const batch = adminDb.batch();

  batch.update(courtDateRef, updateData);
  batch.set(auditRef, {
    actorUserId,
    action: 'update',
    entityType: 'courtDate',
    entityId: courtDateId,
    entityPath: `llcs/${llcId}/cases/${caseId}/courtDates/${courtDateId}`,
    changes: {
      before: { date: currentData?.date, status: currentData?.status },
      after: updateData,
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  // Update nextHearingDate on the case if date changed
  if (input.date !== undefined || input.status !== undefined) {
    await updateCaseNextHearingDate(llcId, caseId);
  }

  const updated = await getCourtDate(llcId, caseId, courtDateId);
  if (!updated) throw new Error('INTERNAL_ERROR: Failed to read updated court date');
  return updated;
}

/**
 * Delete a court date.
 */
export async function deleteCourtDate(
  llcId: string,
  caseId: string,
  courtDateId: string,
  actorUserId: string
): Promise<void> {
  const courtDateRef = adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('cases')
    .doc(caseId)
    .collection('courtDates')
    .doc(courtDateId);

  const courtDateDoc = await courtDateRef.get();

  if (!courtDateDoc.exists) {
    throw new Error('NOT_FOUND: Court date not found');
  }

  const data = courtDateDoc.data();
  const auditRef = adminDb.collection('llcs').doc(llcId).collection('auditLogs').doc();
  const batch = adminDb.batch();

  batch.delete(courtDateRef);
  batch.set(auditRef, {
    actorUserId,
    action: 'delete',
    entityType: 'courtDate',
    entityId: courtDateId,
    entityPath: `llcs/${llcId}/cases/${caseId}/courtDates/${courtDateId}`,
    changes: { before: { date: data?.date, type: data?.type } },
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  // Update nextHearingDate on the case
  await updateCaseNextHearingDate(llcId, caseId);
}

/**
 * Update the nextHearingDate field on a case based on upcoming court dates.
 */
async function updateCaseNextHearingDate(llcId: string, caseId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Get upcoming scheduled court dates
  const snap = await adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('cases')
    .doc(caseId)
    .collection('courtDates')
    .where('status', '==', 'scheduled')
    .where('date', '>=', today)
    .orderBy('date', 'asc')
    .limit(1)
    .get();

  const nextHearingDate = snap.docs[0]?.data()?.date ?? null;

  await adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('cases')
    .doc(caseId)
    .update({
      nextHearingDate,
      updatedAt: FieldValue.serverTimestamp(),
    });
}
