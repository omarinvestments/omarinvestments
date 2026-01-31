import { adminDb } from '@/lib/firebase/admin';
import { FieldValue, Timestamp as FirestoreTimestamp } from 'firebase-admin/firestore';
import {
  GlobalTask,
  GlobalTaskSummary,
  CreateGlobalTaskInput,
  UpdateGlobalTaskInput,
  CompleteGlobalTaskInput,
  GlobalTaskFilterOptions,
  GlobalTaskStatus,
} from '@shared/types';
import { generateId } from '@shared/types';

const COLLECTION = 'globalTasks';

/**
 * Get a global task by ID.
 */
export async function getGlobalTask(taskId: string): Promise<GlobalTask | null> {
  const doc = await adminDb.collection(COLLECTION).doc(taskId).get();
  if (!doc.exists) {
    return null;
  }
  return { id: doc.id, ...doc.data() } as GlobalTask;
}

/**
 * List global tasks with filters.
 */
export async function listGlobalTasks(
  options?: GlobalTaskFilterOptions
): Promise<GlobalTaskSummary[]> {
  let query = adminDb.collection(COLLECTION).orderBy('dueDate', 'asc');

  // Apply filters
  if (options?.llcId) {
    query = query.where('llcId', '==', options.llcId);
  }
  if (options?.propertyId) {
    query = query.where('propertyId', '==', options.propertyId);
  }
  if (options?.entityType) {
    query = query.where('entityType', '==', options.entityType);
  }
  if (options?.assignedToUserId) {
    query = query.where('assignedToUserId', '==', options.assignedToUserId);
  }
  if (options?.status) {
    const statuses = Array.isArray(options.status) ? options.status : [options.status];
    if (statuses.length === 1) {
      query = query.where('status', '==', statuses[0]);
    }
  }

  const snapshot = await query.limit(100).get();

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title,
      dueDate: data.dueDate,
      status: data.status,
      priority: data.priority,
      entityType: data.entityType,
      llcId: data.llcId,
      propertyId: data.propertyId,
      assignedToUserId: data.assignedToUserId,
      assignedToUserName: data.assignedToUserName,
      createdAt: data.createdAt,
    } as GlobalTaskSummary;
  });
}

/**
 * List tasks for a specific user (assigned to them or created by them).
 */
export async function listUserTasks(
  userId: string,
  options?: { includeCompleted?: boolean }
): Promise<GlobalTaskSummary[]> {
  // Get tasks assigned to user
  let assignedQuery = adminDb
    .collection(COLLECTION)
    .where('assignedToUserId', '==', userId)
    .orderBy('dueDate', 'asc');

  if (!options?.includeCompleted) {
    assignedQuery = assignedQuery.where('status', 'in', ['pending', 'in_progress']);
  }

  const snapshot = await assignedQuery.limit(100).get();

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title,
      dueDate: data.dueDate,
      status: data.status,
      priority: data.priority,
      entityType: data.entityType,
      llcId: data.llcId,
      propertyId: data.propertyId,
      assignedToUserId: data.assignedToUserId,
      assignedToUserName: data.assignedToUserName,
      createdAt: data.createdAt,
    } as GlobalTaskSummary;
  });
}

/**
 * List tasks accessible to a user (based on their LLC/property access).
 */
export async function listAccessibleTasks(
  llcIds: string[],
  propertyIds: string[],
  options?: GlobalTaskFilterOptions
): Promise<GlobalTaskSummary[]> {
  const allTasks: GlobalTaskSummary[] = [];

  // Fetch tasks for each accessible LLC
  for (const llcId of llcIds) {
    const tasks = await listGlobalTasks({ ...options, llcId });
    allTasks.push(...tasks);
  }

  // Also fetch property-specific tasks
  for (const propertyId of propertyIds) {
    const tasks = await listGlobalTasks({ ...options, propertyId });
    // Avoid duplicates
    for (const task of tasks) {
      if (!allTasks.find(t => t.id === task.id)) {
        allTasks.push(task);
      }
    }
  }

  // Sort by due date
  allTasks.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return allTasks.slice(0, 100);
}

/**
 * Create a new global task.
 */
export async function createGlobalTask(
  input: CreateGlobalTaskInput,
  createdByUserId: string,
  createdByUserName?: string
): Promise<GlobalTask> {
  const id = generateId();
  const now = FieldValue.serverTimestamp();

  const taskData = {
    title: input.title,
    description: input.description || null,
    dueDate: input.dueDate,
    status: 'pending' as GlobalTaskStatus,
    priority: input.priority,
    entityType: input.entityType || 'general',
    entityId: input.entityId || null,
    llcId: input.llcId || null,
    propertyId: input.propertyId || null,
    assignedToUserId: input.assignedToUserId || null,
    assignedToUserName: null, // Will be populated when assigned
    completedAt: null,
    completedByUserId: null,
    completionNotes: null,
    createdByUserId,
    createdByUserName,
    createdAt: now,
  };

  await adminDb.collection(COLLECTION).doc(id).set(taskData);

  return {
    id,
    ...taskData,
    createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
  } as unknown as GlobalTask;
}

/**
 * Update a global task.
 */
export async function updateGlobalTask(
  taskId: string,
  updates: UpdateGlobalTaskInput
): Promise<GlobalTask> {
  const doc = adminDb.collection(COLLECTION).doc(taskId);

  const updateData: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.dueDate !== undefined) updateData.dueDate = updates.dueDate;
  if (updates.priority !== undefined) updateData.priority = updates.priority;
  if (updates.assignedToUserId !== undefined) {
    updateData.assignedToUserId = updates.assignedToUserId;
    // Clear name if unassigning
    if (!updates.assignedToUserId) {
      updateData.assignedToUserName = null;
    }
  }

  await doc.update(updateData);

  const updatedTask = await getGlobalTask(taskId);
  if (!updatedTask) {
    throw new Error(`Task with ID ${taskId} not found after update`);
  }
  return updatedTask;
}

/**
 * Update task status.
 */
export async function updateGlobalTaskStatus(
  taskId: string,
  newStatus: GlobalTaskStatus
): Promise<GlobalTask> {
  const doc = adminDb.collection(COLLECTION).doc(taskId);

  await doc.update({
    status: newStatus,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updatedTask = await getGlobalTask(taskId);
  if (!updatedTask) {
    throw new Error(`Task with ID ${taskId} not found after update`);
  }
  return updatedTask;
}

/**
 * Complete a global task.
 */
export async function completeGlobalTask(
  taskId: string,
  input: CompleteGlobalTaskInput,
  completedByUserId: string
): Promise<GlobalTask> {
  const doc = adminDb.collection(COLLECTION).doc(taskId);

  await doc.update({
    status: 'completed',
    completedAt: FirestoreTimestamp.now(),
    completedByUserId,
    completionNotes: input.completionNotes || null,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const completedTask = await getGlobalTask(taskId);
  if (!completedTask) {
    throw new Error(`Task with ID ${taskId} not found after completion`);
  }
  return completedTask;
}

/**
 * Delete a global task.
 */
export async function deleteGlobalTask(taskId: string): Promise<void> {
  await adminDb.collection(COLLECTION).doc(taskId).delete();
}

/**
 * Get task counts by status.
 */
export async function getTaskCounts(
  llcId?: string
): Promise<Record<GlobalTaskStatus, number>> {
  let query = adminDb.collection(COLLECTION);

  if (llcId) {
    query = query.where('llcId', '==', llcId) as never;
  }

  const snapshot = await query.get();

  const counts: Record<GlobalTaskStatus, number> = {
    pending: 0,
    in_progress: 0,
    completed: 0,
    canceled: 0,
  };

  for (const doc of snapshot.docs) {
    const status = doc.data().status as GlobalTaskStatus;
    if (counts[status] !== undefined) {
      counts[status]++;
    }
  }

  return counts;
}

/**
 * Get overdue tasks.
 */
export async function getOverdueTasks(
  llcIds?: string[]
): Promise<GlobalTaskSummary[]> {
  const today = new Date().toISOString().split('T')[0];

  const query = adminDb
    .collection(COLLECTION)
    .where('status', 'in', ['pending', 'in_progress'])
    .where('dueDate', '<', today)
    .orderBy('dueDate', 'asc');

  const snapshot = await query.limit(50).get();

  let tasks = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title,
      dueDate: data.dueDate,
      status: data.status,
      priority: data.priority,
      entityType: data.entityType,
      llcId: data.llcId,
      propertyId: data.propertyId,
      assignedToUserId: data.assignedToUserId,
      assignedToUserName: data.assignedToUserName,
      createdAt: data.createdAt,
    } as GlobalTaskSummary;
  });

  // Filter by LLC access if provided
  if (llcIds && llcIds.length > 0) {
    tasks = tasks.filter(t => !t.llcId || llcIds.includes(t.llcId));
  }

  return tasks;
}
