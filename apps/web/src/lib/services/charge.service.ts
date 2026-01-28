import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { ChargeType, ChargeStatus } from '@shared/types';

export interface CreateChargeInput {
  leaseId: string;
  period: string; // YYYY-MM
  type: ChargeType;
  description?: string;
  amount: number; // In cents
  dueDate: string; // ISO date
  linkedChargeId?: string; // For late fees linked to original charge
}

export interface ChargeWithId {
  id: string;
  llcId: string;
  leaseId: string;
  tenantUserId?: string;
  period: string;
  type: ChargeType;
  description?: string;
  amount: number;
  paidAmount: number;
  status: ChargeStatus;
  dueDate: string;
  linkedChargeId?: string;
  voidedAt?: string;
  voidedBy?: string;
  voidReason?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ChargeBalance {
  totalCharges: number;
  totalPaid: number;
  balance: number;
  overdueAmount: number;
  openCharges: number;
}

/**
 * Create a new charge for a lease.
 */
export async function createCharge(
  llcId: string,
  input: CreateChargeInput,
  actorUserId: string
): Promise<ChargeWithId> {
  // Verify lease exists and get tenant info
  const leaseDoc = await adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('leases')
    .doc(input.leaseId)
    .get();

  if (!leaseDoc.exists) {
    throw new Error('NOT_FOUND: Lease not found');
  }

  const leaseData = leaseDoc.data();

  const chargeRef = adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('charges')
    .doc();

  const chargeData = {
    llcId,
    leaseId: input.leaseId,
    tenantUserIds: leaseData?.tenantUserIds || [],
    period: input.period,
    type: input.type,
    description: input.description || null,
    amount: input.amount,
    paidAmount: 0,
    status: 'open' as ChargeStatus,
    dueDate: input.dueDate,
    linkedChargeId: input.linkedChargeId || null,
    createdAt: FieldValue.serverTimestamp(),
  };

  const auditRef = adminDb.collection('llcs').doc(llcId).collection('auditLogs').doc();

  const batch = adminDb.batch();
  batch.set(chargeRef, chargeData);
  batch.set(auditRef, {
    actorUserId,
    action: 'create',
    entityType: 'charge',
    entityId: chargeRef.id,
    entityPath: `llcs/${llcId}/charges/${chargeRef.id}`,
    changes: {
      after: {
        leaseId: input.leaseId,
        type: input.type,
        amount: input.amount,
        period: input.period,
      },
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return {
    id: chargeRef.id,
    llcId,
    leaseId: input.leaseId,
    period: input.period,
    type: input.type,
    description: input.description,
    amount: input.amount,
    paidAmount: 0,
    status: 'open',
    dueDate: input.dueDate,
    linkedChargeId: input.linkedChargeId,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Get a single charge by ID.
 */
export async function getCharge(
  llcId: string,
  chargeId: string
): Promise<ChargeWithId | null> {
  const chargeDoc = await adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('charges')
    .doc(chargeId)
    .get();

  if (!chargeDoc.exists) {
    return null;
  }

  const data = chargeDoc.data();
  if (!data) {
    return null;
  }
  return {
    id: chargeDoc.id,
    llcId: data.llcId,
    leaseId: data.leaseId,
    tenantUserId: data.tenantUserId,
    period: data.period,
    type: data.type as ChargeType,
    description: data.description || undefined,
    amount: data.amount,
    paidAmount: data.paidAmount || 0,
    status: data.status as ChargeStatus,
    dueDate: data.dueDate,
    linkedChargeId: data.linkedChargeId || undefined,
    voidedAt: data.voidedAt?.toDate?.()?.toISOString() || undefined,
    voidedBy: data.voidedBy || undefined,
    voidReason: data.voidReason || undefined,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || undefined,
  };
}

/**
 * List charges for a lease.
 */
export async function listChargesForLease(
  llcId: string,
  leaseId: string,
  status?: ChargeStatus
): Promise<ChargeWithId[]> {
  let query = adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('charges')
    .where('leaseId', '==', leaseId)
    .orderBy('dueDate', 'desc') as FirebaseFirestore.Query;

  if (status) {
    query = query.where('status', '==', status);
  }

  const snapshot = await query.get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      llcId: data.llcId,
      leaseId: data.leaseId,
      tenantUserId: data.tenantUserId,
      period: data.period,
      type: data.type as ChargeType,
      description: data.description || undefined,
      amount: data.amount,
      paidAmount: data.paidAmount || 0,
      status: data.status as ChargeStatus,
      dueDate: data.dueDate,
      linkedChargeId: data.linkedChargeId || undefined,
      voidedAt: data.voidedAt?.toDate?.()?.toISOString() || undefined,
      voidedBy: data.voidedBy || undefined,
      voidReason: data.voidReason || undefined,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || undefined,
    };
  });
}

/**
 * List all charges for an LLC with optional filters.
 */
export async function listCharges(
  llcId: string,
  filters?: {
    status?: ChargeStatus;
    type?: ChargeType;
    leaseId?: string;
    fromDate?: string;
    toDate?: string;
  }
): Promise<ChargeWithId[]> {
  let query = adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('charges')
    .orderBy('dueDate', 'desc') as FirebaseFirestore.Query;

  if (filters?.status) {
    query = query.where('status', '==', filters.status);
  }
  if (filters?.type) {
    query = query.where('type', '==', filters.type);
  }
  if (filters?.leaseId) {
    query = query.where('leaseId', '==', filters.leaseId);
  }

  const snapshot = await query.get();

  let charges = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      llcId: data.llcId,
      leaseId: data.leaseId,
      tenantUserId: data.tenantUserId,
      period: data.period,
      type: data.type as ChargeType,
      description: data.description || undefined,
      amount: data.amount,
      paidAmount: data.paidAmount || 0,
      status: data.status as ChargeStatus,
      dueDate: data.dueDate,
      linkedChargeId: data.linkedChargeId || undefined,
      voidedAt: data.voidedAt?.toDate?.()?.toISOString() || undefined,
      voidedBy: data.voidedBy || undefined,
      voidReason: data.voidReason || undefined,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || undefined,
    };
  });

  // Apply date filters client-side
  const fromDate = filters?.fromDate;
  const toDate = filters?.toDate;
  if (fromDate) {
    charges = charges.filter((c) => c.dueDate >= fromDate);
  }
  if (toDate) {
    charges = charges.filter((c) => c.dueDate <= toDate);
  }

  return charges;
}

/**
 * Get open (unpaid) charges for a lease.
 */
export async function getOpenChargesForLease(
  llcId: string,
  leaseId: string
): Promise<ChargeWithId[]> {
  const snapshot = await adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('charges')
    .where('leaseId', '==', leaseId)
    .where('status', 'in', ['open', 'partial'])
    .orderBy('dueDate', 'asc')
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      llcId: data.llcId,
      leaseId: data.leaseId,
      tenantUserId: data.tenantUserId,
      period: data.period,
      type: data.type as ChargeType,
      description: data.description || undefined,
      amount: data.amount,
      paidAmount: data.paidAmount || 0,
      status: data.status as ChargeStatus,
      dueDate: data.dueDate,
      linkedChargeId: data.linkedChargeId || undefined,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || undefined,
    };
  });
}

/**
 * Calculate the balance for a lease (total owed minus total paid).
 */
export async function getChargeBalance(
  llcId: string,
  leaseId: string
): Promise<ChargeBalance> {
  const charges = await listChargesForLease(llcId, leaseId);
  const today = new Date().toISOString().slice(0, 10);

  let totalCharges = 0;
  let totalPaid = 0;
  let overdueAmount = 0;
  let openCharges = 0;

  for (const charge of charges) {
    if (charge.status === 'void') continue;

    totalCharges += charge.amount;
    totalPaid += charge.paidAmount;

    if (charge.status === 'open' || charge.status === 'partial') {
      openCharges++;
      const remaining = charge.amount - charge.paidAmount;
      if (charge.dueDate < today) {
        overdueAmount += remaining;
      }
    }
  }

  return {
    totalCharges,
    totalPaid,
    balance: totalCharges - totalPaid,
    overdueAmount,
    openCharges,
  };
}

/**
 * Void a charge (cannot void if already paid/partial).
 */
export async function voidCharge(
  llcId: string,
  chargeId: string,
  reason: string,
  actorUserId: string
): Promise<ChargeWithId> {
  const chargeRef = adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('charges')
    .doc(chargeId);

  const chargeDoc = await chargeRef.get();

  if (!chargeDoc.exists) {
    throw new Error('NOT_FOUND: Charge not found');
  }

  const data = chargeDoc.data();
  if (!data) {
    throw new Error('NOT_FOUND: Charge data not found');
  }

  if (data.status === 'paid') {
    throw new Error('INVALID_STATUS: Cannot void a fully paid charge');
  }

  if (data.status === 'partial') {
    throw new Error('INVALID_STATUS: Cannot void a partially paid charge. Refund payments first.');
  }

  if (data.status === 'void') {
    throw new Error('ALREADY_VOID: Charge is already voided');
  }

  const updateData = {
    status: 'void' as ChargeStatus,
    voidedAt: FieldValue.serverTimestamp(),
    voidedBy: actorUserId,
    voidReason: reason,
    updatedAt: FieldValue.serverTimestamp(),
  };

  const auditRef = adminDb.collection('llcs').doc(llcId).collection('auditLogs').doc();

  const batch = adminDb.batch();
  batch.update(chargeRef, updateData);
  batch.set(auditRef, {
    actorUserId,
    action: 'void',
    entityType: 'charge',
    entityId: chargeId,
    entityPath: `llcs/${llcId}/charges/${chargeId}`,
    changes: {
      before: { status: data.status },
      after: { status: 'void', voidReason: reason },
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return {
    id: chargeId,
    llcId: data.llcId,
    leaseId: data.leaseId,
    period: data.period,
    type: data.type as ChargeType,
    description: data.description || undefined,
    amount: data.amount,
    paidAmount: data.paidAmount || 0,
    status: 'void',
    dueDate: data.dueDate,
    linkedChargeId: data.linkedChargeId || undefined,
    voidedBy: actorUserId,
    voidReason: reason,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Update charge status based on payment.
 * Called internally when payments are applied.
 */
export async function updateChargePayment(
  llcId: string,
  chargeId: string,
  paymentAmount: number,
  actorUserId: string
): Promise<void> {
  const chargeRef = adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('charges')
    .doc(chargeId);

  const chargeDoc = await chargeRef.get();

  if (!chargeDoc.exists) {
    throw new Error('NOT_FOUND: Charge not found');
  }

  const data = chargeDoc.data();
  if (!data) {
    throw new Error('NOT_FOUND: Charge data not found');
  }
  const currentPaid = data.paidAmount || 0;
  const newPaidAmount = currentPaid + paymentAmount;

  let newStatus: ChargeStatus;
  if (newPaidAmount >= data.amount) {
    newStatus = 'paid';
  } else if (newPaidAmount > 0) {
    newStatus = 'partial';
  } else {
    newStatus = 'open';
  }

  const updateData = {
    paidAmount: newPaidAmount,
    status: newStatus,
    updatedAt: FieldValue.serverTimestamp(),
  };

  const auditRef = adminDb.collection('llcs').doc(llcId).collection('auditLogs').doc();

  const batch = adminDb.batch();
  batch.update(chargeRef, updateData);
  batch.set(auditRef, {
    actorUserId,
    action: 'update',
    entityType: 'charge',
    entityId: chargeId,
    entityPath: `llcs/${llcId}/charges/${chargeId}`,
    changes: {
      before: { paidAmount: currentPaid, status: data.status },
      after: { paidAmount: newPaidAmount, status: newStatus },
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();
}
