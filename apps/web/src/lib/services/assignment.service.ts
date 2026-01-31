import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  UserAssignment,
  CreateUserAssignmentInput,
  UpdateUserAssignmentInput,
  EmployeeCapabilities,
  DEFAULT_CAPABILITIES,
} from '@shared/types';
import { generateId } from '@shared/types';

const COLLECTION = 'userAssignments';

/**
 * Get a user assignment by ID.
 */
export async function getAssignment(assignmentId: string): Promise<UserAssignment | null> {
  const doc = await adminDb.collection(COLLECTION).doc(assignmentId).get();
  if (!doc.exists) {
    return null;
  }
  return { id: doc.id, ...doc.data() } as UserAssignment;
}

/**
 * List assignments for a specific user.
 */
export async function listUserAssignments(userId: string): Promise<UserAssignment[]> {
  const snapshot = await adminDb
    .collection(COLLECTION)
    .where('userId', '==', userId)
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserAssignment[];
}

/**
 * List all active assignments for a user.
 */
export async function listActiveUserAssignments(userId: string): Promise<UserAssignment[]> {
  const snapshot = await adminDb
    .collection(COLLECTION)
    .where('userId', '==', userId)
    .where('status', '==', 'active')
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserAssignment[];
}

/**
 * List all assignments (for super-admin).
 */
export async function listAllAssignments(options?: {
  role?: 'manager' | 'employee';
  status?: 'active' | 'disabled';
  llcId?: string;
  limit?: number;
}): Promise<UserAssignment[]> {
  let query = adminDb.collection(COLLECTION).orderBy('createdAt', 'desc');

  if (options?.role) {
    query = query.where('role', '==', options.role);
  }
  if (options?.status) {
    query = query.where('status', '==', options.status);
  }
  if (options?.llcId) {
    query = query.where('llcIds', 'array-contains', options.llcId);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserAssignment[];
}

/**
 * List assignments that grant access to a specific LLC.
 */
export async function listAssignmentsForLlc(llcId: string): Promise<UserAssignment[]> {
  const snapshot = await adminDb
    .collection(COLLECTION)
    .where('llcIds', 'array-contains', llcId)
    .where('status', '==', 'active')
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserAssignment[];
}

/**
 * List assignments that grant access to a specific property.
 */
export async function listAssignmentsForProperty(propertyId: string): Promise<UserAssignment[]> {
  const snapshot = await adminDb
    .collection(COLLECTION)
    .where('propertyIds', 'array-contains', propertyId)
    .where('status', '==', 'active')
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserAssignment[];
}

/**
 * Create a new user assignment.
 */
export async function createAssignment(
  input: CreateUserAssignmentInput,
  assignedByUserId: string
): Promise<UserAssignment> {
  const id = generateId();

  // Merge default capabilities with provided ones
  const defaultCaps = DEFAULT_CAPABILITIES[input.role];
  const capabilities: EmployeeCapabilities = {
    ...defaultCaps,
    ...input.capabilities,
  };

  const now = FieldValue.serverTimestamp();
  const assignmentData = {
    userId: input.userId,
    role: input.role,
    llcIds: input.llcIds,
    propertyIds: input.propertyIds,
    capabilities,
    status: 'active',
    assignedByUserId,
    notes: input.notes,
    createdAt: now,
  };

  await adminDb.collection(COLLECTION).doc(id).set(assignmentData);

  return {
    id,
    ...assignmentData,
    status: 'active',
    createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
  } as UserAssignment;
}

/**
 * Update an existing assignment.
 */
export async function updateAssignment(
  assignmentId: string,
  updates: UpdateUserAssignmentInput
): Promise<UserAssignment> {
  const doc = adminDb.collection(COLLECTION).doc(assignmentId);

  const existing = await doc.get();
  if (!existing.exists) {
    throw new Error('Assignment not found');
  }

  const existingData = existing.data() as UserAssignment;
  const updateData: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (updates.role !== undefined) {
    updateData.role = updates.role;
  }
  if (updates.llcIds !== undefined) {
    updateData.llcIds = updates.llcIds;
  }
  if (updates.propertyIds !== undefined) {
    updateData.propertyIds = updates.propertyIds;
  }
  if (updates.status !== undefined) {
    updateData.status = updates.status;
  }
  if (updates.notes !== undefined) {
    updateData.notes = updates.notes;
  }
  if (updates.capabilities !== undefined) {
    // Merge with existing capabilities
    updateData.capabilities = {
      ...existingData.capabilities,
      ...updates.capabilities,
    };
  }

  await doc.update(updateData);

  const updated = await getAssignment(assignmentId);
  if (!updated) {
    throw new Error('Failed to retrieve updated assignment');
  }
  return updated;
}

/**
 * Disable an assignment (soft delete).
 */
export async function disableAssignment(assignmentId: string): Promise<UserAssignment> {
  return updateAssignment(assignmentId, { status: 'disabled' });
}

/**
 * Re-enable a disabled assignment.
 */
export async function enableAssignment(assignmentId: string): Promise<UserAssignment> {
  return updateAssignment(assignmentId, { status: 'active' });
}

/**
 * Delete an assignment (hard delete).
 */
export async function deleteAssignment(assignmentId: string): Promise<void> {
  await adminDb.collection(COLLECTION).doc(assignmentId).delete();
}

/**
 * Check if a user has an active assignment with a specific role.
 */
export async function hasRoleAssignment(
  userId: string,
  role: 'manager' | 'employee'
): Promise<boolean> {
  const snapshot = await adminDb
    .collection(COLLECTION)
    .where('userId', '==', userId)
    .where('role', '==', role)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  return !snapshot.empty;
}

/**
 * Get users with assignments for a specific LLC.
 * Returns assignment details with user info.
 */
export async function getAssignedUsersForLlc(
  llcId: string
): Promise<{ assignment: UserAssignment; email?: string; displayName?: string }[]> {
  const assignments = await listAssignmentsForLlc(llcId);

  // Fetch user info for each assignment
  const results = await Promise.all(
    assignments.map(async assignment => {
      const userDoc = await adminDb.collection('platformUsers').doc(assignment.userId).get();
      const userData = userDoc.exists ? userDoc.data() : null;
      return {
        assignment,
        email: userData?.email,
        displayName: userData?.displayName,
      };
    })
  );

  return results;
}
