import { adminDb } from '@/lib/firebase/admin';

export type AlertType = 'lease_expiring' | 'charge_overdue' | 'case_hearing' | 'task_due';
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
 * Get all alerts across all user's LLCs
 */
export async function getOwnerAlerts(userId: string): Promise<Alert[]> {
  const userLlcs = await getUserLlcs(userId);

  if (userLlcs.length === 0) {
    return [];
  }

  // Fetch alerts for all LLCs in parallel
  const alertPromises = userLlcs.map(llc => getLlcAlerts(llc.id, llc.legalName));
  const alertArrays = await Promise.all(alertPromises);

  // Flatten and sort by severity (critical first) then by due date
  const allAlerts = alertArrays.flat();

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
