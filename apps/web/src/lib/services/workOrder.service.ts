import { adminDb } from '@/lib/firebase/admin';
import { FieldValue, Timestamp as FirestoreTimestamp } from 'firebase-admin/firestore';
import {
  WorkOrder,
  WorkOrderSummary,
  WorkOrderNote,
  WorkOrderPhoto,
  WorkOrderStatusChange,
  CreateWorkOrderInput,
  UpdateWorkOrderInput,
  AssignWorkOrderInput,
  CompleteWorkOrderInput,
  AddWorkOrderNoteInput,
  AddWorkOrderPhotoInput,
  WorkOrderFilterOptions,
  WorkOrderStatus,
} from '@shared/types';
import { generateId } from '@shared/types';

/**
 * Get a work order by ID.
 */
export async function getWorkOrder(
  llcId: string,
  workOrderId: string
): Promise<WorkOrder | null> {
  const doc = await adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('workOrders')
    .doc(workOrderId)
    .get();

  if (!doc.exists) {
    return null;
  }

  return { id: doc.id, ...doc.data() } as WorkOrder;
}

/**
 * List work orders for an LLC with optional filters.
 */
export async function listWorkOrders(
  llcId: string,
  options?: WorkOrderFilterOptions
): Promise<WorkOrderSummary[]> {
  let query = adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('workOrders')
    .orderBy('createdAt', 'desc');

  // Apply filters
  if (options?.propertyId) {
    query = query.where('propertyId', '==', options.propertyId);
  }
  if (options?.status) {
    const statuses = Array.isArray(options.status) ? options.status : [options.status];
    if (statuses.length === 1) {
      query = query.where('status', '==', statuses[0]);
    }
  }
  if (options?.priority) {
    const priorities = Array.isArray(options.priority) ? options.priority : [options.priority];
    if (priorities.length === 1) {
      query = query.where('priority', '==', priorities[0]);
    }
  }
  if (options?.assignedEmployeeId) {
    query = query.where('assignedEmployeeIds', 'array-contains', options.assignedEmployeeId);
  }

  const snapshot = await query.limit(100).get();

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      llcId,
      propertyId: data.propertyId,
      unitId: data.unitId,
      title: data.title,
      category: data.category,
      priority: data.priority,
      status: data.status,
      assignedEmployeeIds: data.assignedEmployeeIds || [],
      scheduledDate: data.scheduledDate,
      createdAt: data.createdAt,
    } as WorkOrderSummary;
  });
}

/**
 * List work orders across multiple LLCs (for employees/managers).
 */
export async function listWorkOrdersAcrossLlcs(
  llcIds: string[],
  options?: WorkOrderFilterOptions & { assignedToUserId?: string }
): Promise<WorkOrderSummary[]> {
  const allWorkOrders: WorkOrderSummary[] = [];

  for (const llcId of llcIds) {
    const workOrders = await listWorkOrders(llcId, options);
    allWorkOrders.push(...workOrders);
  }

  // Sort by createdAt descending
  allWorkOrders.sort((a, b) => {
    const aTime = (a.createdAt as { seconds: number }).seconds || 0;
    const bTime = (b.createdAt as { seconds: number }).seconds || 0;
    return bTime - aTime;
  });

  return allWorkOrders.slice(0, 100);
}

/**
 * Create a new work order.
 */
export async function createWorkOrder(
  llcId: string,
  input: CreateWorkOrderInput,
  createdByUserId: string
): Promise<WorkOrder> {
  const id = generateId();
  const now = FieldValue.serverTimestamp();

  const workOrderData = {
    llcId,
    propertyId: input.propertyId,
    unitId: input.unitId || null,
    title: input.title,
    description: input.description || null,
    category: input.category,
    priority: input.priority,
    status: 'open' as WorkOrderStatus,
    requestedByTenantId: input.requestedByTenantId || null,
    requestedByUserId: createdByUserId,
    requestSource: input.requestSource || 'staff',
    assignedEmployeeIds: [],
    scheduledDate: input.scheduledDate || null,
    scheduledTimeSlot: null,
    estimatedDuration: input.estimatedDuration || null,
    estimatedCost: input.estimatedCost || null,
    actualCost: null,
    laborCost: null,
    materialsCost: null,
    completedDate: null,
    completedByUserId: null,
    completionNotes: null,
    notes: [],
    photos: [],
    statusHistory: [
      {
        id: generateId(),
        fromStatus: null,
        toStatus: 'open',
        changedByUserId: createdByUserId,
        createdAt: FirestoreTimestamp.now(),
      },
    ],
    createdByUserId,
    createdAt: now,
  };

  await adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('workOrders')
    .doc(id)
    .set(workOrderData);

  return {
    id,
    ...workOrderData,
    createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
  } as unknown as WorkOrder;
}

/**
 * Update a work order.
 */
export async function updateWorkOrder(
  llcId: string,
  workOrderId: string,
  updates: UpdateWorkOrderInput
): Promise<WorkOrder> {
  const doc = adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('workOrders')
    .doc(workOrderId);

  const updateData: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  // Apply updates
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.category !== undefined) updateData.category = updates.category;
  if (updates.priority !== undefined) updateData.priority = updates.priority;
  if (updates.scheduledDate !== undefined) updateData.scheduledDate = updates.scheduledDate;
  if (updates.scheduledTimeSlot !== undefined) updateData.scheduledTimeSlot = updates.scheduledTimeSlot;
  if (updates.estimatedDuration !== undefined) updateData.estimatedDuration = updates.estimatedDuration;
  if (updates.estimatedCost !== undefined) updateData.estimatedCost = updates.estimatedCost;
  if (updates.actualCost !== undefined) updateData.actualCost = updates.actualCost;
  if (updates.laborCost !== undefined) updateData.laborCost = updates.laborCost;
  if (updates.materialsCost !== undefined) updateData.materialsCost = updates.materialsCost;

  await doc.update(updateData);

  const updated = await getWorkOrder(llcId, workOrderId);
  if (!updated) {
    throw new Error('Failed to retrieve updated work order');
  }
  return updated;
}

/**
 * Update work order status.
 */
export async function updateWorkOrderStatus(
  llcId: string,
  workOrderId: string,
  newStatus: WorkOrderStatus,
  changedByUserId: string,
  reason?: string
): Promise<WorkOrder> {
  const doc = adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('workOrders')
    .doc(workOrderId);

  const existing = await doc.get();
  if (!existing.exists) {
    throw new Error('Work order not found');
  }

  const currentStatus = existing.data()?.status as WorkOrderStatus;

  const statusChange: WorkOrderStatusChange = {
    id: generateId(),
    fromStatus: currentStatus,
    toStatus: newStatus,
    changedByUserId,
    reason,
    createdAt: FirestoreTimestamp.now(),
  };

  await doc.update({
    status: newStatus,
    statusHistory: FieldValue.arrayUnion(statusChange),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updated = await getWorkOrder(llcId, workOrderId);
  if (!updated) {
    throw new Error('Failed to retrieve updated work order');
  }
  return updated;
}

/**
 * Assign employees to a work order.
 */
export async function assignWorkOrder(
  llcId: string,
  workOrderId: string,
  input: AssignWorkOrderInput,
  assignedByUserId: string
): Promise<WorkOrder> {
  const doc = adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('workOrders')
    .doc(workOrderId);

  const existing = await doc.get();
  if (!existing.exists) {
    throw new Error('Work order not found');
  }

  const currentStatus = existing.data()?.status as WorkOrderStatus;
  const updateData: Record<string, unknown> = {
    assignedEmployeeIds: input.employeeIds,
    updatedAt: FieldValue.serverTimestamp(),
  };

  // Update scheduling if provided
  if (input.scheduledDate) updateData.scheduledDate = input.scheduledDate;
  if (input.scheduledTimeSlot) updateData.scheduledTimeSlot = input.scheduledTimeSlot;

  // Change status to assigned if currently open
  if (currentStatus === 'open') {
    updateData.status = 'assigned';
    const statusChange: WorkOrderStatusChange = {
      id: generateId(),
      fromStatus: currentStatus,
      toStatus: 'assigned',
      changedByUserId: assignedByUserId,
      reason: input.notes,
      createdAt: FirestoreTimestamp.now(),
    };
    updateData.statusHistory = FieldValue.arrayUnion(statusChange);
  }

  await doc.update(updateData);

  const updated = await getWorkOrder(llcId, workOrderId);
  if (!updated) {
    throw new Error('Failed to retrieve updated work order');
  }
  return updated;
}

/**
 * Complete a work order.
 */
export async function completeWorkOrder(
  llcId: string,
  workOrderId: string,
  input: CompleteWorkOrderInput,
  completedByUserId: string
): Promise<WorkOrder> {
  const doc = adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('workOrders')
    .doc(workOrderId);

  const existing = await doc.get();
  if (!existing.exists) {
    throw new Error('Work order not found');
  }

  const currentStatus = existing.data()?.status as WorkOrderStatus;

  const statusChange: WorkOrderStatusChange = {
    id: generateId(),
    fromStatus: currentStatus,
    toStatus: 'completed',
    changedByUserId: completedByUserId,
    createdAt: FirestoreTimestamp.now(),
  };

  const updateData: Record<string, unknown> = {
    status: 'completed',
    completedDate: new Date().toISOString().split('T')[0],
    completedByUserId,
    completionNotes: input.completionNotes || null,
    statusHistory: FieldValue.arrayUnion(statusChange),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.actualCost !== undefined) updateData.actualCost = input.actualCost;
  if (input.laborCost !== undefined) updateData.laborCost = input.laborCost;
  if (input.materialsCost !== undefined) updateData.materialsCost = input.materialsCost;

  await doc.update(updateData);

  const updated = await getWorkOrder(llcId, workOrderId);
  if (!updated) {
    throw new Error('Failed to retrieve updated work order');
  }
  return updated;
}

/**
 * Add a note to a work order.
 */
export async function addWorkOrderNote(
  llcId: string,
  workOrderId: string,
  input: AddWorkOrderNoteInput,
  authorUserId: string,
  authorName?: string
): Promise<WorkOrder> {
  const doc = adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('workOrders')
    .doc(workOrderId);

  const note: WorkOrderNote = {
    id: generateId(),
    content: input.content,
    authorUserId,
    authorName,
    isInternal: input.isInternal ?? false,
    createdAt: FirestoreTimestamp.now(),
  };

  await doc.update({
    notes: FieldValue.arrayUnion(note),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updated = await getWorkOrder(llcId, workOrderId);
  if (!updated) {
    throw new Error('Failed to retrieve updated work order');
  }
  return updated;
}

/**
 * Add a photo to a work order.
 */
export async function addWorkOrderPhoto(
  llcId: string,
  workOrderId: string,
  input: AddWorkOrderPhotoInput,
  uploadedByUserId: string
): Promise<WorkOrder> {
  const doc = adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('workOrders')
    .doc(workOrderId);

  const photo: WorkOrderPhoto = {
    id: generateId(),
    url: input.url,
    thumbnailUrl: input.thumbnailUrl,
    caption: input.caption,
    uploadedByUserId,
    type: input.type,
    createdAt: FirestoreTimestamp.now(),
  };

  await doc.update({
    photos: FieldValue.arrayUnion(photo),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updated = await getWorkOrder(llcId, workOrderId);
  if (!updated) {
    throw new Error('Failed to retrieve updated work order');
  }
  return updated;
}

/**
 * Delete a work order (soft delete via status change to canceled).
 */
export async function cancelWorkOrder(
  llcId: string,
  workOrderId: string,
  canceledByUserId: string,
  reason?: string
): Promise<WorkOrder> {
  return updateWorkOrderStatus(llcId, workOrderId, 'canceled', canceledByUserId, reason);
}

/**
 * Get work order counts by status for an LLC.
 */
export async function getWorkOrderCounts(
  llcId: string
): Promise<Record<WorkOrderStatus, number>> {
  const snapshot = await adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('workOrders')
    .get();

  const counts: Record<WorkOrderStatus, number> = {
    open: 0,
    assigned: 0,
    in_progress: 0,
    pending_review: 0,
    completed: 0,
    canceled: 0,
  };

  for (const doc of snapshot.docs) {
    const status = doc.data().status as WorkOrderStatus;
    if (counts[status] !== undefined) {
      counts[status]++;
    }
  }

  return counts;
}
