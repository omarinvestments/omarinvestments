import { Timestamp } from './common';
import { CaseStatus, CaseVisibility, TaskStatus, TaskPriority } from '../constants/statuses';

/**
 * Plaintiff - who is bringing the case
 */
export interface PlaintiffIndividual {
  type: 'individual';
  name: string;
}

export interface PlaintiffLlc {
  type: 'llc';
  llcId: string;
  llcName: string;
}

export type Plaintiff = PlaintiffIndividual | PlaintiffLlc;

/**
 * Opposing party - who the case is against
 */
export interface OpposingPartyTenant {
  type: 'tenant';
  tenantId: string;
  tenantName: string;
  propertyAddress?: string;
  tenantStatus?: 'active' | 'past';
  email?: string;
  phone?: string;
}

export interface OpposingPartyOther {
  type: 'other';
  name: string;
}

export type OpposingParty = OpposingPartyTenant | OpposingPartyOther;

/**
 * Opposing counsel contact information
 */
export interface OpposingCounsel {
  name: string;
  email?: string;
  phone?: string;
  firmName?: string;
  address?: string;
}

/**
 * Case resolution - how the case was resolved
 */
export interface CaseResolution {
  type: ResolutionType;
  date: string; // ISO date
  amount?: number; // in cents (for settlements/judgments)
  terms?: string; // description of settlement/judgment terms
  notes?: string;
}

export type ResolutionType =
  | 'settlement'
  | 'judgment_plaintiff'
  | 'judgment_defendant'
  | 'default_judgment'
  | 'dismissal'
  | 'voluntary_dismissal'
  | 'other';

/**
 * Legal case - lawsuit, eviction, dispute, etc.
 */
export interface Case {
  id: string;
  llcId: string;
  propertyId?: string;
  unitId?: string;
  tenantId?: string;
  court: string;
  jurisdiction: string;
  docketNumber?: string;
  caseType: CaseType;
  status: CaseStatus;
  visibility: CaseVisibility;
  plaintiff?: Plaintiff;
  opposingParty?: OpposingParty;
  opposingCounsel?: OpposingCounsel;
  ourCounsel?: string;
  caseManagers: string[]; // user IDs who can edit/archive this case
  filingDate?: string; // ISO date
  nextHearingDate?: string; // ISO date (auto-computed from courtDates)
  resolution?: CaseResolution; // how the case was resolved
  description?: string;
  tags?: string[];
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export type CaseType =
  | 'eviction'
  | 'collections'
  | 'property_damage'
  | 'contract_dispute'
  | 'personal_injury'
  | 'code_violation'
  | 'other';

/**
 * Case task - deadline or action item
 */
export interface CaseTask {
  id: string;
  caseId: string;
  llcId: string;
  title: string;
  description?: string;
  dueDate: string; // ISO date
  status: TaskStatus;
  priority: TaskPriority;
  assignedToUserId?: string;
  completedAt?: Timestamp;
  completedByUserId?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Case document - file attached to a case
 */
export interface CaseDocument {
  id: string;
  caseId: string;
  llcId: string;
  title: string;
  description?: string;
  type: DocumentType;
  fileName: string;
  storagePath: string;
  contentType: string;
  sizeBytes: number;
  uploadedByUserId: string;
  createdAt: Timestamp;
}

export type DocumentType =
  | 'filing'
  | 'evidence'
  | 'notice'
  | 'correspondence'
  | 'court_order'
  | 'settlement'
  | 'other';

/**
 * Court date - hearing, trial, motion, etc.
 */
export interface CourtDate {
  id: string;
  caseId: string;
  llcId: string;
  type: CourtDateType;
  date: string; // ISO date
  time?: string; // e.g., "9:00 AM"
  judge?: string;
  courtroom?: string; // location/room number
  description?: string; // details about what this appearance is for
  status: CourtDateStatus;
  outcome?: CourtDateOutcome;
  outcomeNotes?: string; // details about what happened
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export type CourtDateType =
  | 'hearing'
  | 'trial'
  | 'motion'
  | 'status_conference'
  | 'pretrial_conference'
  | 'mediation'
  | 'settlement_conference'
  | 'arraignment'
  | 'sentencing'
  | 'other';

export type CourtDateStatus =
  | 'scheduled'
  | 'completed'
  | 'cancelled'
  | 'continued'
  | 'rescheduled';

export type CourtDateOutcome =
  | 'continued'
  | 'dismissed'
  | 'dismissed_with_prejudice'
  | 'dismissed_without_prejudice'
  | 'judgment_plaintiff'
  | 'judgment_defendant'
  | 'default_judgment'
  | 'settled'
  | 'stipulation'
  | 'motion_granted'
  | 'motion_denied'
  | 'taken_under_advisement'
  | 'other';
