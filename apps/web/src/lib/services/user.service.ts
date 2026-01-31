import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { User, UserType, UserStatus, TenantLink } from '@shared/types';

const COLLECTION = 'users';

/**
 * Get a user by ID.
 */
export async function getUser(userId: string): Promise<User | null> {
  const doc = await adminDb.collection(COLLECTION).doc(userId).get();
  if (!doc.exists) {
    return null;
  }
  return { id: doc.id, ...doc.data() } as User;
}

/**
 * Get or create a user record.
 * Creates the record from Firebase Auth if it doesn't exist.
 * Default userType is 'tenant' (safer default - must be promoted to staff).
 */
export async function getOrCreateUser(
  userId: string,
  options?: {
    userType?: UserType;
    tenantLinks?: TenantLink[];
  }
): Promise<User> {
  const existing = await getUser(userId);
  if (existing) {
    return existing;
  }

  // Fetch from Firebase Auth
  const authUser = await adminAuth.getUser(userId);

  const now = FieldValue.serverTimestamp();
  const userData = {
    email: authUser.email || '',
    displayName: authUser.displayName || undefined,
    phoneNumber: authUser.phoneNumber || undefined,
    photoURL: authUser.photoURL || undefined,
    userType: options?.userType || 'tenant' as UserType,
    status: 'active' as UserStatus,
    isSuperAdmin: false,
    tenantLinks: options?.tenantLinks || [],
    createdAt: now,
  };

  await adminDb.collection(COLLECTION).doc(userId).set(userData);

  return {
    id: userId,
    ...userData,
    createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
  } as User;
}

/**
 * Create a user record for a new staff member.
 */
export async function createStaffUser(userId: string): Promise<User> {
  return getOrCreateUser(userId, { userType: 'staff' });
}

/**
 * Create a user record for a new tenant.
 */
export async function createTenantUser(
  userId: string,
  tenantLinks?: TenantLink[]
): Promise<User> {
  return getOrCreateUser(userId, { userType: 'tenant', tenantLinks });
}

/**
 * List all users with optional filters.
 */
export async function listUsers(options?: {
  limit?: number;
  userType?: UserType;
  superAdminsOnly?: boolean;
  status?: UserStatus;
}): Promise<User[]> {
  let query = adminDb.collection(COLLECTION).orderBy('email', 'asc');

  if (options?.userType) {
    query = query.where('userType', '==', options.userType);
  }

  if (options?.superAdminsOnly) {
    query = query.where('isSuperAdmin', '==', true);
  }

  if (options?.status) {
    query = query.where('status', '==', options.status);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as User[];
}

/**
 * Search users by email.
 */
export async function searchUsersByEmail(
  emailPrefix: string,
  limit = 10
): Promise<User[]> {
  // Firestore doesn't have true prefix matching, but we can use range query
  const endPrefix = emailPrefix.slice(0, -1) + String.fromCharCode(emailPrefix.charCodeAt(emailPrefix.length - 1) + 1);

  const snapshot = await adminDb
    .collection(COLLECTION)
    .where('email', '>=', emailPrefix)
    .where('email', '<', endPrefix)
    .limit(limit)
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as User[];
}

/**
 * Update a user.
 */
export async function updateUser(
  userId: string,
  updates: {
    displayName?: string;
    phoneNumber?: string;
    userType?: UserType;
    status?: UserStatus;
    isSuperAdmin?: boolean;
    tenantLinks?: TenantLink[];
  }
): Promise<User> {
  const doc = adminDb.collection(COLLECTION).doc(userId);

  // Ensure user exists
  const existing = await doc.get();
  if (!existing.exists) {
    // Create from Auth with default type
    await getOrCreateUser(userId);
  }

  await doc.update({
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updated = await getUser(userId);
  if (!updated) {
    throw new Error('Failed to retrieve updated user');
  }
  return updated;
}

/**
 * Set super-admin status for a user.
 * Also ensures userType is 'staff'.
 */
export async function setSuperAdmin(userId: string, isSuperAdmin: boolean): Promise<User> {
  return updateUser(userId, {
    isSuperAdmin,
    userType: isSuperAdmin ? 'staff' : undefined, // Promote to staff if becoming super-admin
  });
}

/**
 * Promote a user to staff.
 */
export async function promoteToStaff(userId: string): Promise<User> {
  return updateUser(userId, { userType: 'staff' });
}

/**
 * Add a tenant link to a user.
 */
export async function addTenantLink(userId: string, link: TenantLink): Promise<User> {
  const user = await getUser(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const existingLinks = user.tenantLinks || [];

  // Check if link already exists
  const exists = existingLinks.some(
    l => l.llcId === link.llcId && l.tenantId === link.tenantId
  );

  if (!exists) {
    existingLinks.push(link);
    await updateUser(userId, { tenantLinks: existingLinks });
  }

  return (await getUser(userId))!;
}

/**
 * Remove a tenant link from a user.
 */
export async function removeTenantLink(
  userId: string,
  llcId: string,
  tenantId: string
): Promise<User> {
  const user = await getUser(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const updatedLinks = (user.tenantLinks || []).filter(
    l => !(l.llcId === llcId && l.tenantId === tenantId)
  );

  return updateUser(userId, { tenantLinks: updatedLinks });
}

/**
 * Check if a user is super-admin.
 */
export async function checkIsSuperAdmin(userId: string): Promise<boolean> {
  const user = await getUser(userId);
  return user?.isSuperAdmin === true;
}

/**
 * Check if a user is staff.
 */
export async function isStaffUser(userId: string): Promise<boolean> {
  const user = await getUser(userId);
  return user?.userType === 'staff';
}

/**
 * Check if a user is a tenant.
 */
export async function isTenantUser(userId: string): Promise<boolean> {
  const user = await getUser(userId);
  return user?.userType === 'tenant';
}

/**
 * Update last login timestamp.
 * Creates the user if they don't exist.
 */
export async function updateLastLogin(userId: string): Promise<void> {
  const doc = adminDb.collection(COLLECTION).doc(userId);
  const existing = await doc.get();

  if (!existing.exists) {
    // Auto-create user on first login
    await getOrCreateUser(userId);
  }

  await doc.update({
    lastLoginAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Sync user from Firebase Auth.
 * Useful for updating email/displayName if changed in Auth.
 */
export async function syncFromAuth(userId: string): Promise<User> {
  const authUser = await adminAuth.getUser(userId);
  const existing = await getUser(userId);

  const updates = {
    email: authUser.email || '',
    displayName: authUser.displayName || undefined,
    phoneNumber: authUser.phoneNumber || undefined,
    photoURL: authUser.photoURL || undefined,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (existing) {
    await adminDb.collection(COLLECTION).doc(userId).update(updates);
  } else {
    await adminDb.collection(COLLECTION).doc(userId).set({
      ...updates,
      userType: 'tenant' as UserType,
      status: 'active' as UserStatus,
      isSuperAdmin: false,
      tenantLinks: [],
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  const updated = await getUser(userId);
  if (!updated) {
    throw new Error('Failed to retrieve updated user');
  }
  return updated;
}

// ============================================================================
// Backward Compatibility - Deprecated Functions
// These map to the old platformUser.service.ts API
// ============================================================================

/** @deprecated Use getUser instead */
export const getPlatformUser = getUser;

/** @deprecated Use getOrCreateUser instead */
export async function getOrCreatePlatformUser(userId: string): Promise<User> {
  // Default to staff for backward compatibility with existing admin flows
  return getOrCreateUser(userId, { userType: 'staff' });
}

/** @deprecated Use listUsers instead */
export async function listPlatformUsers(options?: {
  limit?: number;
  superAdminsOnly?: boolean;
}): Promise<User[]> {
  return listUsers({
    limit: options?.limit,
    superAdminsOnly: options?.superAdminsOnly,
    userType: 'staff', // Only return staff users for backward compatibility
  });
}

/** @deprecated Use searchUsersByEmail instead */
export const searchPlatformUsersByEmail = searchUsersByEmail;

/** @deprecated Use updateUser instead */
export async function updatePlatformUser(
  userId: string,
  updates: {
    displayName?: string;
    isSuperAdmin?: boolean;
  }
): Promise<User> {
  return updateUser(userId, updates);
}

/** @deprecated Use checkIsSuperAdmin instead */
export const isSuperAdmin = checkIsSuperAdmin;
