import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { ChargeStatus } from '@shared/types';

export interface LateFeeSettings {
  lateFeeEnabled: boolean;
  lateFeeType?: 'flat' | 'percentage';
  lateFeeAmount?: number;
  lateFeeMaxAmount?: number;
  lateFeeGraceDays?: number;
}

export interface OverdueCharge {
  id: string;
  leaseId: string;
  period: string;
  type: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  daysOverdue: number;
  lateFeeAppliedAt?: string;
  lateFeeChargeId?: string;
}

/**
 * Get late fee settings for an LLC.
 */
export async function getLateFeeSettings(llcId: string): Promise<LateFeeSettings> {
  const llcDoc = await adminDb.collection('llcs').doc(llcId).get();

  if (!llcDoc.exists) {
    throw new Error('NOT_FOUND: LLC not found');
  }

  const data = llcDoc.data();
  const settings = data?.settings || {};

  return {
    lateFeeEnabled: settings.lateFeeEnabled || false,
    lateFeeType: settings.lateFeeType || 'flat',
    lateFeeAmount: settings.lateFeeAmount,
    lateFeeMaxAmount: settings.lateFeeMaxAmount,
    lateFeeGraceDays: settings.lateFeeGraceDays ?? 5,
  };
}

/**
 * Update late fee settings for an LLC.
 */
export async function updateLateFeeSettings(
  llcId: string,
  settings: Partial<LateFeeSettings>,
  actorUserId: string
): Promise<LateFeeSettings> {
  const llcRef = adminDb.collection('llcs').doc(llcId);
  const llcDoc = await llcRef.get();

  if (!llcDoc.exists) {
    throw new Error('NOT_FOUND: LLC not found');
  }

  const currentSettings = llcDoc.data()?.settings || {};
  const updatedSettings = {
    ...currentSettings,
    lateFeeEnabled: settings.lateFeeEnabled ?? currentSettings.lateFeeEnabled,
    lateFeeType: settings.lateFeeType ?? currentSettings.lateFeeType,
    lateFeeAmount: settings.lateFeeAmount ?? currentSettings.lateFeeAmount,
    lateFeeMaxAmount: settings.lateFeeMaxAmount ?? currentSettings.lateFeeMaxAmount,
    lateFeeGraceDays: settings.lateFeeGraceDays ?? currentSettings.lateFeeGraceDays,
  };

  const auditRef = adminDb.collection('llcs').doc(llcId).collection('auditLogs').doc();

  const batch = adminDb.batch();
  batch.update(llcRef, {
    settings: updatedSettings,
    updatedAt: FieldValue.serverTimestamp(),
  });
  batch.set(auditRef, {
    actorUserId,
    action: 'update',
    entityType: 'llc_settings',
    entityId: llcId,
    entityPath: `llcs/${llcId}`,
    changes: {
      before: { lateFeeSettings: currentSettings },
      after: { lateFeeSettings: updatedSettings },
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return {
    lateFeeEnabled: updatedSettings.lateFeeEnabled,
    lateFeeType: updatedSettings.lateFeeType,
    lateFeeAmount: updatedSettings.lateFeeAmount,
    lateFeeMaxAmount: updatedSettings.lateFeeMaxAmount,
    lateFeeGraceDays: updatedSettings.lateFeeGraceDays,
  };
}

/**
 * Calculate the late fee amount for a charge based on LLC settings.
 */
export function calculateLateFee(
  chargeAmount: number,
  paidAmount: number,
  settings: LateFeeSettings
): number {
  if (!settings.lateFeeEnabled || !settings.lateFeeAmount) {
    return 0;
  }

  const remainingBalance = chargeAmount - paidAmount;
  if (remainingBalance <= 0) {
    return 0;
  }

  let lateFee: number;

  if (settings.lateFeeType === 'percentage') {
    // Calculate percentage of remaining balance
    lateFee = Math.round((remainingBalance * settings.lateFeeAmount) / 100);
    // Apply max cap if set
    if (settings.lateFeeMaxAmount && lateFee > settings.lateFeeMaxAmount) {
      lateFee = settings.lateFeeMaxAmount;
    }
  } else {
    // Flat fee
    lateFee = settings.lateFeeAmount;
  }

  return lateFee;
}

/**
 * Get all overdue charges for an LLC that haven't had late fees applied.
 * Considers the grace period from settings.
 */
export async function getOverdueCharges(llcId: string): Promise<OverdueCharge[]> {
  const settings = await getLateFeeSettings(llcId);
  const graceDays = settings.lateFeeGraceDays ?? 5;

  const today = new Date();
  const graceCutoff = new Date();
  graceCutoff.setDate(today.getDate() - graceDays);
  const graceCutoffStr = graceCutoff.toISOString().slice(0, 10);

  // Get open/partial charges with due date before grace cutoff
  const snapshot = await adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('charges')
    .where('status', 'in', ['open', 'partial'])
    .where('dueDate', '<', graceCutoffStr)
    .orderBy('dueDate', 'asc')
    .get();

  const overdueCharges: OverdueCharge[] = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();

    // Skip if late fee already applied
    if (data.lateFeeAppliedAt) {
      continue;
    }

    // Skip late fee charges themselves
    if (data.type === 'late_fee') {
      continue;
    }

    const dueDate = new Date(data.dueDate);
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    overdueCharges.push({
      id: doc.id,
      leaseId: data.leaseId,
      period: data.period,
      type: data.type,
      amount: data.amount,
      paidAmount: data.paidAmount || 0,
      dueDate: data.dueDate,
      daysOverdue,
      lateFeeAppliedAt: data.lateFeeAppliedAt?.toDate?.()?.toISOString(),
      lateFeeChargeId: data.lateFeeChargeId,
    });
  }

  return overdueCharges;
}

/**
 * Apply a late fee to a specific charge.
 * Creates a new late_fee charge linked to the original.
 */
export async function applyLateFee(
  llcId: string,
  chargeId: string,
  actorUserId: string
): Promise<{ lateFeeChargeId: string; lateFeeAmount: number }> {
  const settings = await getLateFeeSettings(llcId);

  if (!settings.lateFeeEnabled) {
    throw new Error('LATE_FEE_DISABLED: Late fees are not enabled for this LLC');
  }

  const chargeRef = adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('charges')
    .doc(chargeId);

  const chargeDoc = await chargeRef.get();

  if (!chargeDoc.exists) {
    throw new Error('NOT_FOUND: Charge not found');
  }

  const chargeData = chargeDoc.data();
  if (!chargeData) {
    throw new Error('NOT_FOUND: Charge data not found');
  }

  // Validate charge can have late fee applied
  if (chargeData.status === 'paid') {
    throw new Error('INVALID_STATUS: Cannot apply late fee to a paid charge');
  }

  if (chargeData.status === 'void') {
    throw new Error('INVALID_STATUS: Cannot apply late fee to a voided charge');
  }

  if (chargeData.type === 'late_fee') {
    throw new Error('INVALID_TYPE: Cannot apply late fee to a late fee charge');
  }

  if (chargeData.lateFeeAppliedAt) {
    throw new Error('ALREADY_APPLIED: Late fee has already been applied to this charge');
  }

  // Check grace period
  const today = new Date();
  const dueDate = new Date(chargeData.dueDate);
  const graceDays = settings.lateFeeGraceDays ?? 5;
  const graceCutoff = new Date(dueDate);
  graceCutoff.setDate(graceCutoff.getDate() + graceDays);

  if (today < graceCutoff) {
    throw new Error('GRACE_PERIOD: Charge is still within grace period');
  }

  // Calculate late fee
  const lateFeeAmount = calculateLateFee(chargeData.amount, chargeData.paidAmount || 0, settings);

  if (lateFeeAmount <= 0) {
    throw new Error('ZERO_FEE: Calculated late fee is zero');
  }

  // Create the late fee charge
  const lateFeeChargeRef = adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('charges')
    .doc();

  const lateFeeChargeData = {
    llcId,
    leaseId: chargeData.leaseId,
    tenantUserIds: chargeData.tenantUserIds || [],
    period: chargeData.period,
    type: 'late_fee',
    description: `Late fee for ${chargeData.type} charge (${chargeData.period})`,
    amount: lateFeeAmount,
    paidAmount: 0,
    status: 'open' as ChargeStatus,
    dueDate: today.toISOString().slice(0, 10),
    linkedChargeId: chargeId, // Link to original charge
    createdAt: FieldValue.serverTimestamp(),
  };

  const auditRef = adminDb.collection('llcs').doc(llcId).collection('auditLogs').doc();

  const batch = adminDb.batch();

  // Create late fee charge
  batch.set(lateFeeChargeRef, lateFeeChargeData);

  // Update original charge to mark late fee as applied
  batch.update(chargeRef, {
    lateFeeAppliedAt: FieldValue.serverTimestamp(),
    lateFeeChargeId: lateFeeChargeRef.id,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Audit log
  batch.set(auditRef, {
    actorUserId,
    action: 'create',
    entityType: 'charge',
    entityId: lateFeeChargeRef.id,
    entityPath: `llcs/${llcId}/charges/${lateFeeChargeRef.id}`,
    changes: {
      after: {
        type: 'late_fee',
        amount: lateFeeAmount,
        linkedChargeId: chargeId,
        originalChargeType: chargeData.type,
        originalChargePeriod: chargeData.period,
      },
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return {
    lateFeeChargeId: lateFeeChargeRef.id,
    lateFeeAmount,
  };
}
