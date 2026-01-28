import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { TaskStatus, TaskPriority } from '@shared/types';

export interface CreateTaskInput {
  title: string;
  description?: string;
  dueDate: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedToUserId?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  dueDate?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedToUserId?: string;
}

export interface TaskRecord {
  id: string;
  caseId: string;
  llcId: string;
  title: string;
  description?: string;
  dueDate: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedToUserId?: string;
  completedAt?: string;
  completedByUserId?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Create a task within a case.
 */
export async function createTask(
  llcId: string,
  caseId: string,
  input: CreateTaskInput,
  actorUserId: string
): Promise<TaskRecord> {
  const taskRef = adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('cases')
    .doc(caseId)
    .collection('tasks')
    .doc();

  const auditRef = adminDb.collection('llcs').doc(llcId).collection('auditLogs').doc();

  const taskData = {
    caseId,
    llcId,
    title: input.title,
    description: input.description || null,
    dueDate: input.dueDate,
    status: input.status || 'pending',
    priority: input.priority || 'medium',
    assignedToUserId: input.assignedToUserId || null,
    createdAt: FieldValue.serverTimestamp(),
  };

  const batch = adminDb.batch();
  batch.set(taskRef, taskData);
  batch.set(auditRef, {
    actorUserId,
    action: 'create',
    entityType: 'case_task',
    entityId: taskRef.id,
    entityPath: `llcs/${llcId}/cases/${caseId}/tasks/${taskRef.id}`,
    changes: { after: { title: input.title, dueDate: input.dueDate } },
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return {
    id: taskRef.id,
    caseId,
    llcId,
    title: input.title,
    description: input.description,
    dueDate: input.dueDate,
    status: (input.status || 'pending') as TaskStatus,
    priority: (input.priority || 'medium') as TaskPriority,
    assignedToUserId: input.assignedToUserId,
    createdAt: new Date().toISOString(),
  };
}

/**
 * List tasks for a case.
 */
export async function listTasks(llcId: string, caseId: string): Promise<TaskRecord[]> {
  const snap = await adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('cases')
    .doc(caseId)
    .collection('tasks')
    .orderBy('dueDate', 'asc')
    .get();

  return snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      caseId,
      llcId,
      title: d.title,
      description: d.description || undefined,
      dueDate: d.dueDate,
      status: d.status as TaskStatus,
      priority: d.priority as TaskPriority,
      assignedToUserId: d.assignedToUserId || undefined,
      completedAt: d.completedAt?.toDate?.()?.toISOString() || undefined,
      completedByUserId: d.completedByUserId || undefined,
      createdAt: d.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: d.updatedAt?.toDate?.()?.toISOString() || undefined,
    };
  });
}

/**
 * Get a single task.
 */
export async function getTask(
  llcId: string,
  caseId: string,
  taskId: string
): Promise<TaskRecord | null> {
  const doc = await adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('cases')
    .doc(caseId)
    .collection('tasks')
    .doc(taskId)
    .get();

  if (!doc.exists) return null;

  const d = doc.data()!;
  return {
    id: doc.id,
    caseId,
    llcId,
    title: d.title,
    description: d.description || undefined,
    dueDate: d.dueDate,
    status: d.status as TaskStatus,
    priority: d.priority as TaskPriority,
    assignedToUserId: d.assignedToUserId || undefined,
    completedAt: d.completedAt?.toDate?.()?.toISOString() || undefined,
    completedByUserId: d.completedByUserId || undefined,
    createdAt: d.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt: d.updatedAt?.toDate?.()?.toISOString() || undefined,
  };
}

/**
 * Update a task. Tracks completion metadata.
 */
export async function updateTask(
  llcId: string,
  caseId: string,
  taskId: string,
  input: UpdateTaskInput,
  actorUserId: string
): Promise<TaskRecord> {
  const taskRef = adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('cases')
    .doc(caseId)
    .collection('tasks')
    .doc(taskId);

  const taskDoc = await taskRef.get();
  if (!taskDoc.exists) {
    throw new Error('NOT_FOUND: Task not found');
  }

  const currentData = taskDoc.data()!;
  const updateData: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.dueDate !== undefined) updateData.dueDate = input.dueDate;
  if (input.priority !== undefined) updateData.priority = input.priority;
  if (input.assignedToUserId !== undefined) updateData.assignedToUserId = input.assignedToUserId;

  if (input.status !== undefined) {
    updateData.status = input.status;
    // Track completion
    if (input.status === 'completed' && currentData.status !== 'completed') {
      updateData.completedAt = FieldValue.serverTimestamp();
      updateData.completedByUserId = actorUserId;
    } else if (input.status !== 'completed' && currentData.status === 'completed') {
      updateData.completedAt = null;
      updateData.completedByUserId = null;
    }
  }

  const auditRef = adminDb.collection('llcs').doc(llcId).collection('auditLogs').doc();
  const batch = adminDb.batch();

  batch.update(taskRef, updateData);
  batch.set(auditRef, {
    actorUserId,
    action: 'update',
    entityType: 'case_task',
    entityId: taskId,
    entityPath: `llcs/${llcId}/cases/${caseId}/tasks/${taskId}`,
    changes: {
      before: { status: currentData.status, title: currentData.title },
      after: updateData,
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  const updated = await getTask(llcId, caseId, taskId);
  if (!updated) throw new Error('INTERNAL_ERROR: Failed to read updated task');
  return updated;
}

/**
 * Delete a task.
 */
export async function deleteTask(
  llcId: string,
  caseId: string,
  taskId: string,
  actorUserId: string
): Promise<void> {
  const taskRef = adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('cases')
    .doc(caseId)
    .collection('tasks')
    .doc(taskId);

  const taskDoc = await taskRef.get();
  if (!taskDoc.exists) {
    throw new Error('NOT_FOUND: Task not found');
  }

  const auditRef = adminDb.collection('llcs').doc(llcId).collection('auditLogs').doc();
  const batch = adminDb.batch();

  batch.delete(taskRef);
  batch.set(auditRef, {
    actorUserId,
    action: 'delete',
    entityType: 'case_task',
    entityId: taskId,
    entityPath: `llcs/${llcId}/cases/${caseId}/tasks/${taskId}`,
    changes: { before: { title: taskDoc.data()?.title } },
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();
}
