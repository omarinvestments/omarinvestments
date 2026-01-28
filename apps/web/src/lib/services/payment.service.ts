import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { PaymentStatus } from '@shared/types';
import { updateChargePayment, getOpenChargesForLease } from './charge.service';

export type ManualPaymentMethod = 'cash' | 'check' | 'money_order' | 'bank_transfer' | 'other';

export interface RecordPaymentInput {
  leaseId: string;
  tenantId: string;
  amount: number; // Total payment amount in cents
  paymentMethod: ManualPaymentMethod;
  checkNumber?: string;
  memo?: string;
  paymentDate?: string; // ISO date, defaults to now
  chargeAllocations?: {
    chargeId: string;
    amount: number;
  }[];
}

export interface PaymentWithId {
  id: string;
  llcId: string;
  leaseId: string;
  tenantId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: {
    type: ManualPaymentMethod | 'card' | 'us_bank_account';
    checkNumber?: string;
    last4?: string;
    brand?: string;
    bankName?: string;
  };
  appliedTo: {
    chargeId: string;
    amount: number;
  }[];
  memo?: string;
  receiptUrl?: string;
  stripePaymentIntentId?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Record a manual payment (cash, check, etc.) and apply it to charges.
 */
export async function recordPayment(
  llcId: string,
  input: RecordPaymentInput,
  actorUserId: string
): Promise<PaymentWithId> {
  // Verify lease exists
  const leaseDoc = await adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('leases')
    .doc(input.leaseId)
    .get();

  if (!leaseDoc.exists) {
    throw new Error('NOT_FOUND: Lease not found');
  }

  // If no allocations provided, auto-allocate to oldest open charges
  let allocations = input.chargeAllocations;
  if (!allocations || allocations.length === 0) {
    allocations = await autoAllocatePayment(llcId, input.leaseId, input.amount);
  }

  // Validate allocations don't exceed payment amount
  const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
  if (totalAllocated > input.amount) {
    throw new Error('INVALID_ALLOCATION: Total allocated exceeds payment amount');
  }

  const paymentRef = adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('payments')
    .doc();

  const paymentData = {
    llcId,
    leaseId: input.leaseId,
    tenantId: input.tenantId,
    amount: input.amount,
    currency: 'usd',
    status: 'succeeded' as PaymentStatus,
    paymentMethod: {
      type: input.paymentMethod,
      checkNumber: input.checkNumber || null,
    },
    appliedTo: allocations,
    memo: input.memo || null,
    paymentDate: input.paymentDate || new Date().toISOString(),
    recordedBy: actorUserId,
    createdAt: FieldValue.serverTimestamp(),
  };

  const auditRef = adminDb.collection('llcs').doc(llcId).collection('auditLogs').doc();

  const batch = adminDb.batch();
  batch.set(paymentRef, paymentData);
  batch.set(auditRef, {
    actorUserId,
    action: 'create',
    entityType: 'payment',
    entityId: paymentRef.id,
    entityPath: `llcs/${llcId}/payments/${paymentRef.id}`,
    changes: {
      after: {
        leaseId: input.leaseId,
        tenantId: input.tenantId,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
      },
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  // Apply payment to charges (update their paidAmount)
  for (const allocation of allocations) {
    await updateChargePayment(llcId, allocation.chargeId, allocation.amount, actorUserId);
  }

  return {
    id: paymentRef.id,
    llcId,
    leaseId: input.leaseId,
    tenantId: input.tenantId,
    amount: input.amount,
    currency: 'usd',
    status: 'succeeded',
    paymentMethod: {
      type: input.paymentMethod,
      checkNumber: input.checkNumber,
    },
    appliedTo: allocations,
    memo: input.memo,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Auto-allocate a payment to the oldest open charges (FIFO).
 */
async function autoAllocatePayment(
  llcId: string,
  leaseId: string,
  amount: number
): Promise<{ chargeId: string; amount: number }[]> {
  const openCharges = await getOpenChargesForLease(llcId, leaseId);
  const allocations: { chargeId: string; amount: number }[] = [];
  let remaining = amount;

  for (const charge of openCharges) {
    if (remaining <= 0) break;

    const chargeBalance = charge.amount - charge.paidAmount;
    const allocationAmount = Math.min(remaining, chargeBalance);

    if (allocationAmount > 0) {
      allocations.push({
        chargeId: charge.id,
        amount: allocationAmount,
      });
      remaining -= allocationAmount;
    }
  }

  return allocations;
}

/**
 * Get a single payment by ID.
 */
export async function getPayment(
  llcId: string,
  paymentId: string
): Promise<PaymentWithId | null> {
  const paymentDoc = await adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('payments')
    .doc(paymentId)
    .get();

  if (!paymentDoc.exists) {
    return null;
  }

  const data = paymentDoc.data()!;
  return {
    id: paymentDoc.id,
    llcId: data.llcId,
    leaseId: data.leaseId,
    tenantId: data.tenantId,
    amount: data.amount,
    currency: data.currency,
    status: data.status as PaymentStatus,
    paymentMethod: data.paymentMethod,
    appliedTo: data.appliedTo || [],
    memo: data.memo || undefined,
    receiptUrl: data.receiptUrl || undefined,
    stripePaymentIntentId: data.stripePaymentIntentId || undefined,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || undefined,
  };
}

/**
 * List payments for a lease.
 */
export async function listPaymentsForLease(
  llcId: string,
  leaseId: string
): Promise<PaymentWithId[]> {
  const snapshot = await adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('payments')
    .where('leaseId', '==', leaseId)
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      llcId: data.llcId,
      leaseId: data.leaseId,
      tenantId: data.tenantId,
      amount: data.amount,
      currency: data.currency,
      status: data.status as PaymentStatus,
      paymentMethod: data.paymentMethod,
      appliedTo: data.appliedTo || [],
      memo: data.memo || undefined,
      receiptUrl: data.receiptUrl || undefined,
      stripePaymentIntentId: data.stripePaymentIntentId || undefined,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || undefined,
    };
  });
}

/**
 * List all payments for an LLC with optional filters.
 */
export async function listPayments(
  llcId: string,
  filters?: {
    status?: PaymentStatus;
    leaseId?: string;
    tenantId?: string;
    fromDate?: string;
    toDate?: string;
  }
): Promise<PaymentWithId[]> {
  let query = adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('payments')
    .orderBy('createdAt', 'desc') as FirebaseFirestore.Query;

  if (filters?.status) {
    query = query.where('status', '==', filters.status);
  }
  if (filters?.leaseId) {
    query = query.where('leaseId', '==', filters.leaseId);
  }
  if (filters?.tenantId) {
    query = query.where('tenantId', '==', filters.tenantId);
  }

  const snapshot = await query.get();

  let payments = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      llcId: data.llcId,
      leaseId: data.leaseId,
      tenantId: data.tenantId,
      amount: data.amount,
      currency: data.currency,
      status: data.status as PaymentStatus,
      paymentMethod: data.paymentMethod,
      appliedTo: data.appliedTo || [],
      memo: data.memo || undefined,
      receiptUrl: data.receiptUrl || undefined,
      stripePaymentIntentId: data.stripePaymentIntentId || undefined,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || undefined,
    };
  });

  // Apply date filters client-side
  const fromDate = filters?.fromDate;
  const toDate = filters?.toDate;
  if (fromDate) {
    payments = payments.filter((p) => p.createdAt >= fromDate);
  }
  if (toDate) {
    payments = payments.filter((p) => p.createdAt <= toDate);
  }

  return payments;
}
