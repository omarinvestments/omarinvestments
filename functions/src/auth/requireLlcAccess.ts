import { collections } from '../firebase/admin';
import { MemberRole } from '@shared/types';

export interface LlcMember {
  userId: string;
  role: MemberRole;
  propertyScopes?: string[];
  caseScopes?: string[];
  status: 'active' | 'invited' | 'disabled';
}

/**
 * Check if user is an active member of the LLC
 */
export async function requireLlcAccess(
  userId: string,
  llcId: string
): Promise<LlcMember | null> {
  const memberDoc = await collections.llcMembers(llcId).doc(userId).get();

  if (!memberDoc.exists) {
    return null;
  }

  const member = memberDoc.data() as LlcMember;

  if (member.status !== 'active') {
    return null;
  }

  return member;
}

/**
 * Check if user has one of the required roles
 */
export async function requireRole(
  userId: string,
  llcId: string,
  allowedRoles: MemberRole[]
): Promise<LlcMember | null> {
  const member = await requireLlcAccess(userId, llcId);

  if (!member) {
    return null;
  }

  if (!allowedRoles.includes(member.role)) {
    return null;
  }

  return member;
}

/**
 * Check if user can access a specific case (for restricted cases)
 */
export async function requireCaseAccess(
  userId: string,
  llcId: string,
  caseId: string
): Promise<boolean> {
  const member = await requireLlcAccess(userId, llcId);

  if (!member) {
    return false;
  }

  // Admin and legal roles have full case access
  if (member.role === 'admin' || member.role === 'legal') {
    return true;
  }

  // Check case scopes for other roles
  if (member.caseScopes && member.caseScopes.includes(caseId)) {
    return true;
  }

  return false;
}
