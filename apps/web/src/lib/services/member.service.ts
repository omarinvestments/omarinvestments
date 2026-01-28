import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { MemberRole, MemberStatus } from '@shared/types';

export interface InviteMemberInput {
  email: string;
  role: MemberRole;
  propertyScopes?: string[];
  caseScopes?: string[];
}

export interface UpdateMemberInput {
  role?: MemberRole;
  propertyScopes?: string[];
  caseScopes?: string[];
  status?: MemberStatus;
}

export interface MemberWithProfile {
  userId: string;
  email: string;
  displayName: string | null;
  role: MemberRole;
  status: MemberStatus;
  propertyScopes: string[];
  caseScopes: string[];
  invitedBy?: string;
  invitedAt?: string;
  joinedAt?: string;
  createdAt: string;
}

/**
 * Invite a member to an LLC by email.
 * The user must already have a Firebase Auth account.
 */
export async function inviteMember(
  llcId: string,
  input: InviteMemberInput,
  actorUserId: string
): Promise<MemberWithProfile> {
  // Look up user by email in Firebase Auth
  const userRecord = await adminAuth.getUserByEmail(input.email);

  // Check if already a member
  const existingDoc = await adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('members')
    .doc(userRecord.uid)
    .get();

  if (existingDoc.exists) {
    const existingData = existingDoc.data();
    if (existingData?.status === 'disabled') {
      throw new Error('MEMBER_DISABLED: This user is a disabled member. Reactivate them instead.');
    }
    throw new Error('ALREADY_MEMBER: This user is already a member of this LLC.');
  }

  const memberData = {
    userId: userRecord.uid,
    role: input.role,
    propertyScopes: input.propertyScopes || [],
    caseScopes: input.caseScopes || [],
    status: 'invited' as MemberStatus,
    invitedBy: actorUserId,
    invitedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  };

  const memberRef = adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('members')
    .doc(userRecord.uid);

  const auditRef = adminDb.collection('llcs').doc(llcId).collection('auditLogs').doc();

  const batch = adminDb.batch();
  batch.set(memberRef, memberData);
  batch.set(auditRef, {
    actorUserId,
    action: 'create',
    entityType: 'member',
    entityId: userRecord.uid,
    entityPath: `llcs/${llcId}/members/${userRecord.uid}`,
    changes: { after: { email: input.email, role: input.role } },
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return {
    userId: userRecord.uid,
    email: userRecord.email || input.email,
    displayName: userRecord.displayName || null,
    role: input.role,
    status: 'invited',
    propertyScopes: input.propertyScopes || [],
    caseScopes: input.caseScopes || [],
    invitedBy: actorUserId,
    createdAt: new Date().toISOString(),
  };
}

/**
 * List all members of an LLC with their profile info.
 */
export async function listMembers(llcId: string): Promise<MemberWithProfile[]> {
  const membersSnap = await adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('members')
    .orderBy('createdAt', 'asc')
    .get();

  if (membersSnap.empty) {
    return [];
  }

  // Fetch user profiles from Firebase Auth
  const members: MemberWithProfile[] = [];

  for (const doc of membersSnap.docs) {
    const data = doc.data();
    let email = '';
    let displayName: string | null = null;

    try {
      const userRecord = await adminAuth.getUser(doc.id);
      email = userRecord.email || '';
      displayName = userRecord.displayName || null;
    } catch {
      // User may have been deleted from Auth
      email = data.email || 'unknown';
    }

    members.push({
      userId: doc.id,
      email,
      displayName,
      role: data.role as MemberRole,
      status: data.status as MemberStatus,
      propertyScopes: data.propertyScopes || [],
      caseScopes: data.caseScopes || [],
      invitedBy: data.invitedBy || undefined,
      invitedAt: data.invitedAt?.toDate?.()?.toISOString() || undefined,
      joinedAt: data.joinedAt?.toDate?.()?.toISOString() || undefined,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    });
  }

  return members;
}

/**
 * Get a single member with profile info.
 */
export async function getMember(llcId: string, userId: string): Promise<MemberWithProfile | null> {
  const memberDoc = await adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('members')
    .doc(userId)
    .get();

  if (!memberDoc.exists) {
    return null;
  }

  const data = memberDoc.data();
  if (!data) {
    return null;
  }
  let email = '';
  let displayName: string | null = null;

  try {
    const userRecord = await adminAuth.getUser(userId);
    email = userRecord.email || '';
    displayName = userRecord.displayName || null;
  } catch {
    email = data.email || 'unknown';
  }

  return {
    userId,
    email,
    displayName,
    role: data.role as MemberRole,
    status: data.status as MemberStatus,
    propertyScopes: data.propertyScopes || [],
    caseScopes: data.caseScopes || [],
    invitedBy: data.invitedBy || undefined,
    invitedAt: data.invitedAt?.toDate?.()?.toISOString() || undefined,
    joinedAt: data.joinedAt?.toDate?.()?.toISOString() || undefined,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  };
}

/**
 * Update a member's role, scopes, or status.
 * Cannot demote the last active admin.
 */
export async function updateMember(
  llcId: string,
  userId: string,
  input: UpdateMemberInput,
  actorUserId: string
): Promise<MemberWithProfile> {
  const memberRef = adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('members')
    .doc(userId);

  const memberDoc = await memberRef.get();

  if (!memberDoc.exists) {
    throw new Error('NOT_FOUND: Member not found');
  }
  
  const currentData = memberDoc.data();

  if (!currentData) {
    throw new Error('NOT_FOUND: No member data found for this LLC.');
  }

  // If changing role from admin or disabling an admin, check last-admin constraint
  const isDemotingAdmin =
    currentData.role === 'admin' && input.role !== undefined && input.role !== 'admin';
  const isDisablingAdmin =
    currentData.role === 'admin' && input.status === 'disabled';

  if (isDemotingAdmin || isDisablingAdmin) {
    await assertNotLastAdmin(llcId, userId);
  }

  const updateData: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.role !== undefined) {
    updateData.role = input.role;
  }
  if (input.propertyScopes !== undefined) {
    updateData.propertyScopes = input.propertyScopes;
  }
  if (input.caseScopes !== undefined) {
    updateData.caseScopes = input.caseScopes;
  }
  if (input.status !== undefined) {
    updateData.status = input.status;
    // If activating an invited member, set joinedAt
    if (input.status === 'active' && currentData.status === 'invited') {
      updateData.joinedAt = FieldValue.serverTimestamp();
    }
  }

  const auditRef = adminDb.collection('llcs').doc(llcId).collection('auditLogs').doc();
  const batch = adminDb.batch();

  batch.update(memberRef, updateData);
  batch.set(auditRef, {
    actorUserId,
    action: 'update',
    entityType: 'member',
    entityId: userId,
    entityPath: `llcs/${llcId}/members/${userId}`,
    changes: {
      before: { role: currentData.role, status: currentData.status },
      after: updateData,
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  // Return updated member
  const updated = await getMember(llcId, userId);
  if (!updated) {
    throw new Error('INTERNAL_ERROR: Failed to read updated member');
  }
  return updated;
}

/**
 * Remove a member from an LLC (hard delete).
 * Cannot remove the last active admin.
 */
export async function removeMember(
  llcId: string,
  userId: string,
  actorUserId: string
): Promise<void> {
  const memberRef = adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('members')
    .doc(userId);

  const memberDoc = await memberRef.get();

  if (!memberDoc.exists) {
    throw new Error('NOT_FOUND: Member not found');
  }

  const currentData = memberDoc.data();

  if (!currentData) {
    throw new Error('NOT_FOUND: No member data found for this LLC.');
  }

  // Cannot remove last admin
  if (currentData.role === 'admin' && currentData.status === 'active') {
    await assertNotLastAdmin(llcId, userId);
  }

  const auditRef = adminDb.collection('llcs').doc(llcId).collection('auditLogs').doc();
  const batch = adminDb.batch();

  batch.delete(memberRef);
  batch.set(auditRef, {
    actorUserId,
    action: 'delete',
    entityType: 'member',
    entityId: userId,
    entityPath: `llcs/${llcId}/members/${userId}`,
    changes: { before: { role: currentData.role, status: currentData.status } },
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();
}

/**
 * Assert that the given userId is NOT the last active admin of the LLC.
 * Throws if they are.
 */
async function assertNotLastAdmin(llcId: string, userId: string): Promise<void> {
  const adminsSnap = await adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('members')
    .where('role', '==', 'admin')
    .where('status', '==', 'active')
    .get();

  const otherAdmins = adminsSnap.docs.filter((doc) => doc.id !== userId);

  if (otherAdmins.length === 0) {
    throw new Error('LAST_ADMIN: Cannot remove or demote the last active admin of this LLC.');
  }
}

export interface PendingInvitation {
  llcId: string;
  llcName: string;
  role: MemberRole;
  invitedBy?: string;
  invitedByEmail?: string;
  invitedAt?: string;
}

/**
 * List all pending invitations for a user across all LLCs.
 * Uses a collection group query on 'members'.
 */
export async function listPendingInvitations(userId: string): Promise<PendingInvitation[]> {
  // Collection group query to find all member docs for this user with status 'invited'
  const invitesSnap = await adminDb
    .collectionGroup('members')
    .where('userId', '==', userId)
    .where('status', '==', 'invited')
    .get();

  if (invitesSnap.empty) {
    return [];
  }

  const invitations: PendingInvitation[] = [];

  for (const doc of invitesSnap.docs) {
    const data = doc.data();
    // Extract llcId from the document path: llcs/{llcId}/members/{userId}
    const pathParts = doc.ref.path.split('/');
    const llcId = pathParts[1]; // Path is always llcs/{llcId}/members/{userId}
    if (!llcId) {
      throw new Error('INVALID_PATH: Unable to extract LLC ID from member document path.');
    }

    // Fetch LLC name
    const llcDoc = await adminDb.collection('llcs').doc(llcId).get();
    const llcName = llcDoc.data()?.name || 'Unknown LLC';

    // Fetch inviter's email if available
    let invitedByEmail: string | undefined;
    if (data.invitedBy) {
      try {
        const inviterRecord = await adminAuth.getUser(data.invitedBy);
        invitedByEmail = inviterRecord.email || undefined;
      } catch {
        // Inviter may have been deleted
      }
    }

    invitations.push({
      llcId,
      llcName,
      role: data.role as MemberRole,
      invitedBy: data.invitedBy || undefined,
      invitedByEmail,
      invitedAt: data.invitedAt?.toDate?.()?.toISOString() || undefined,
    });
  }

  return invitations;
}

/**
 * Accept an invitation to join an LLC.
 * Changes status from 'invited' to 'active' and sets joinedAt.
 */
export async function acceptInvitation(
  llcId: string,
  userId: string
): Promise<MemberWithProfile> {
  const memberRef = adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('members')
    .doc(userId);

  const memberDoc = await memberRef.get();

  if (!memberDoc.exists) {
    throw new Error('NOT_FOUND: No invitation found for this LLC.');
  }

  const data = memberDoc.data();
  if (!data) {
    throw new Error('NOT_FOUND: No invitation data found for this LLC.');
  }

  if (data.status !== 'invited') {
    throw new Error('INVALID_STATUS: This invitation has already been processed.');
  }

  const updateData = {
    status: 'active' as MemberStatus,
    joinedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  const auditRef = adminDb.collection('llcs').doc(llcId).collection('auditLogs').doc();
  const batch = adminDb.batch();

  batch.update(memberRef, updateData);
  batch.set(auditRef, {
    actorUserId: userId,
    action: 'update',
    entityType: 'member',
    entityId: userId,
    entityPath: `llcs/${llcId}/members/${userId}`,
    changes: {
      before: { status: 'invited' },
      after: { status: 'active', action: 'accepted_invitation' },
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  const updated = await getMember(llcId, userId);
  if (!updated) {
    throw new Error('INTERNAL_ERROR: Failed to read updated member');
  }
  return updated;
}

/**
 * Decline an invitation to join an LLC.
 * Removes the member record entirely.
 */
export async function declineInvitation(
  llcId: string,
  userId: string
): Promise<void> {
  const memberRef = adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('members')
    .doc(userId);

  const memberDoc = await memberRef.get();

  if (!memberDoc.exists) {
    throw new Error('NOT_FOUND: No invitation found for this LLC.');
  }

  const data = memberDoc.data();

  if (!data) {
    throw new Error('NOT_FOUND: No invitation data found for this LLC.');
  }

  if (data.status !== 'invited') {
    throw new Error('INVALID_STATUS: This invitation has already been processed.');
  }

  const auditRef = adminDb.collection('llcs').doc(llcId).collection('auditLogs').doc();
  const batch = adminDb.batch();

  batch.delete(memberRef);
  batch.set(auditRef, {
    actorUserId: userId,
    action: 'delete',
    entityType: 'member',
    entityId: userId,
    entityPath: `llcs/${llcId}/members/${userId}`,
    changes: {
      before: { status: 'invited', role: data.role },
      after: { action: 'declined_invitation' },
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();
}
