import { adminDb } from '@/lib/firebase/admin';

export type AlertType = 'lease_expiring' | 'charge_overdue' | 'payment_due' | 'case_hearing' | 'task_due' | 'mortgage_payment_due';
export type AlertSeverity = 'warning' | 'critical';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  llcId: string;
  llcName: string;
  entityType: string;
  entityId: string;
  dueDate?: string;
  amount?: number;
}

/**
 * Get all LLCs accessible to a user
 */
async function getUserLlcs(userId: string): Promise<{ id: string; legalName: string }[]> {
  const membershipsSnapshot = await adminDb
    .collectionGroup('members')
    .where('userId', '==', userId)
    .where('status', '==', 'active')
    .get();

  const llcs: { id: string; legalName: string }[] = [];

  for (const memberDoc of membershipsSnapshot.docs) {
    const llcRef = memberDoc.ref.parent.parent;
    if (llcRef) {
      const llcDoc = await llcRef.get();
      if (llcDoc.exists && llcDoc.data()?.status === 'active') {
        llcs.push({
          id: llcDoc.id,
          legalName: llcDoc.data()?.legalName || 'Unknown',
        });
      }
    }
  }

  return llcs;
}

/**
 * Get alerts for a single LLC
 */
async function getLlcAlerts(llcId: string, llcName: string): Promise<Alert[]> {
  const alerts: Alert[] = [];
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const futureDate30 = thirtyDaysFromNow.toISOString().slice(0, 10);
  const sixtyDaysFromNow = new Date();
  sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);
  const futureDate60 = sixtyDaysFromNow.toISOString().slice(0, 10);
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const futureDate7 = sevenDaysFromNow.toISOString().slice(0, 10);
  const fiveDaysFromNow = new Date();
  fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);
  const futureDate5 = fiveDaysFromNow.toISOString().slice(0, 10);

  const llcRef = adminDb.collection('llcs').doc(llcId);

  // Fetch all alert sources in parallel
  const [leasesSnap, chargesSnap, casesSnap, tasksSnap] = await Promise.all([
    // Active leases expiring within 60 days
    llcRef.collection('leases').where('status', '==', 'active').get(),
    // Open/partial charges
    llcRef.collection('charges').where('status', 'in', ['open', 'partial']).get(),
    // Open cases with upcoming hearings
    llcRef.collection('cases').where('status', 'in', ['open', 'stayed']).get(),
    // Pending tasks (query all cases for tasks)
    adminDb.collectionGroup('tasks').where('status', 'in', ['pending', 'in_progress']).get(),
  ]);

  // Process expiring leases
  for (const doc of leasesSnap.docs) {
    const lease = doc.data();
    if (lease.endDate >= today && lease.endDate <= futureDate60) {
      const daysUntilExpiry = Math.ceil(
        (new Date(lease.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );

      alerts.push({
        id: `lease-${doc.id}`,
        type: 'lease_expiring',
        severity: daysUntilExpiry <= 30 ? 'critical' : 'warning',
        title: 'Lease Expiring',
        description: `Lease expires in ${daysUntilExpiry} days`,
        llcId,
        llcName,
        entityType: 'lease',
        entityId: doc.id,
        dueDate: lease.endDate,
      });
    }
  }

  // Process overdue charges
  for (const doc of chargesSnap.docs) {
    const charge = doc.data();
    if (charge.dueDate < today) {
      const daysOverdue = Math.ceil(
        (new Date().getTime() - new Date(charge.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      const outstanding = (charge.amount || 0) - (charge.paidAmount || 0);

      alerts.push({
        id: `charge-${doc.id}`,
        type: 'charge_overdue',
        severity: daysOverdue > 30 ? 'critical' : 'warning',
        title: 'Overdue Charge',
        description: `$${(outstanding / 100).toFixed(2)} overdue by ${daysOverdue} days`,
        llcId,
        llcName,
        entityType: 'charge',
        entityId: doc.id,
        dueDate: charge.dueDate,
        amount: outstanding,
      });
    }
  }

  // Process upcoming payments due within 5 days
  for (const doc of chargesSnap.docs) {
    const charge = doc.data();
    // Due date is today or in the future, but within 5 days
    if (charge.dueDate >= today && charge.dueDate <= futureDate5) {
      const daysUntilDue = Math.ceil(
        (new Date(charge.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      const outstanding = (charge.amount || 0) - (charge.paidAmount || 0);

      // Only alert if there's an outstanding balance
      if (outstanding > 0) {
        alerts.push({
          id: `payment-${doc.id}`,
          type: 'payment_due',
          severity: daysUntilDue <= 2 ? 'critical' : 'warning',
          title: 'Payment Due',
          description: daysUntilDue === 0
            ? `$${(outstanding / 100).toFixed(2)} due today`
            : `$${(outstanding / 100).toFixed(2)} due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}`,
          llcId,
          llcName,
          entityType: 'charge',
          entityId: doc.id,
          dueDate: charge.dueDate,
          amount: outstanding,
        });
      }
    }
  }

  // Process upcoming case hearings
  for (const doc of casesSnap.docs) {
    const caseData = doc.data();
    if (caseData.nextHearingDate && caseData.nextHearingDate >= today && caseData.nextHearingDate <= futureDate30) {
      const daysUntilHearing = Math.ceil(
        (new Date(caseData.nextHearingDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );

      alerts.push({
        id: `case-${doc.id}`,
        type: 'case_hearing',
        severity: daysUntilHearing <= 7 ? 'critical' : 'warning',
        title: 'Upcoming Hearing',
        description: `${caseData.caseType || 'Case'} hearing in ${daysUntilHearing} days`,
        llcId,
        llcName,
        entityType: 'case',
        entityId: doc.id,
        dueDate: caseData.nextHearingDate,
      });
    }
  }

  // Process due tasks (filter to this LLC)
  for (const doc of tasksSnap.docs) {
    const task = doc.data();
    const caseRef = doc.ref.parent.parent;
    if (!caseRef) continue;

    // Check if this task belongs to a case in this LLC
    const casePath = caseRef.path;
    if (!casePath.startsWith(`llcs/${llcId}/`)) continue;

    if (task.dueDate && task.dueDate >= today && task.dueDate <= futureDate7) {
      const daysUntilDue = Math.ceil(
        (new Date(task.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );

      alerts.push({
        id: `task-${doc.id}`,
        type: 'task_due',
        severity: daysUntilDue <= 2 ? 'critical' : 'warning',
        title: 'Task Due',
        description: task.title || `Task due in ${daysUntilDue} days`,
        llcId,
        llcName,
        entityType: 'task',
        entityId: doc.id,
        dueDate: task.dueDate,
      });
    }
  }

  return alerts;
}

/**
 * Check if user is a super-admin
 */
async function isSuperAdmin(userId: string): Promise<boolean> {
  const userDoc = await adminDb.collection('users').doc(userId).get();
  return userDoc.exists && userDoc.data()?.isSuperAdmin === true;
}

/**
 * Get mortgage payment alerts (super-admin only)
 */
async function getMortgageAlerts(): Promise<Alert[]> {
  const alerts: Alert[] = [];
  const today = new Date();
  const fiveDaysFromNow = new Date();
  fiveDaysFromNow.setDate(today.getDate() + 5);
  const futureDateStr = fiveDaysFromNow.toISOString().slice(0, 10);

  const mortgagesSnap = await adminDb
    .collection('mortgages')
    .where('status', '==', 'active')
    .where('nextPaymentDate', '<=', futureDateStr)
    .get();

  for (const doc of mortgagesSnap.docs) {
    const mortgage = doc.data();
    const daysUntil = Math.ceil(
      (new Date(mortgage.nextPaymentDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Format amount for display
    const amount = mortgage.totalPayment || 0;
    const formattedAmount = '$' + (amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2 });

    alerts.push({
      id: `mortgage-${doc.id}`,
      type: 'mortgage_payment_due',
      severity: daysUntil <= 2 ? 'critical' : 'warning',
      title: daysUntil <= 0 ? 'Mortgage Payment Due TODAY' : `Mortgage Payment Due in ${daysUntil} days`,
      description: `${mortgage.propertyAddress} - ${formattedAmount} to ${mortgage.lender}`,
      llcId: mortgage.llcId,
      llcName: mortgage.llcName,
      entityType: 'mortgage',
      entityId: doc.id,
      dueDate: mortgage.nextPaymentDate,
      amount: mortgage.totalPayment,
    });
  }

  return alerts;
}

/**
 * Get all alerts across all user's LLCs
 */
export async function getOwnerAlerts(userId: string): Promise<Alert[]> {
  const userLlcs = await getUserLlcs(userId);
  const allAlerts: Alert[] = [];

  // Fetch LLC alerts if user has access to any LLCs
  if (userLlcs.length > 0) {
    const alertPromises = userLlcs.map(llc => getLlcAlerts(llc.id, llc.legalName));
    const alertArrays = await Promise.all(alertPromises);
    allAlerts.push(...alertArrays.flat());
  }

  // Fetch mortgage alerts for super-admins
  const superAdmin = await isSuperAdmin(userId);
  if (superAdmin) {
    const mortgageAlerts = await getMortgageAlerts();
    allAlerts.push(...mortgageAlerts);
  }

  // Sort by severity (critical first) then by due date
  allAlerts.sort((a, b) => {
    // Critical first
    if (a.severity === 'critical' && b.severity !== 'critical') return -1;
    if (a.severity !== 'critical' && b.severity === 'critical') return 1;

    // Then by due date (earliest first)
    if (a.dueDate && b.dueDate) {
      return a.dueDate.localeCompare(b.dueDate);
    }
    return 0;
  });

  return allAlerts;
}
