import { Timestamp } from './common';
import { LeaseStatus } from '../constants/statuses';

/**
 * Lease - agreement between LLC and tenant(s) for a unit
 */
export interface Lease {
  id: string;
  llcId: string;
  propertyId: string;
  unitId: string;
  tenantIds: string[];
  tenantUserIds?: string[]; // Firebase UIDs for Firestore rules
  startDate: string; // ISO date
  endDate: string; // ISO date
  rentAmount: number; // Monthly rent in cents
  dueDay: number; // Day of month (1-28)
  depositAmount: number; // Security deposit in cents
  status: LeaseStatus;
  terms?: LeaseTerms;
  renewalOf?: string; // Previous lease ID if renewal
  lastChargeGeneratedPeriod?: string; // YYYY-MM - last period for which rent charge was generated
  notes?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface LeaseTerms {
  petPolicy?: 'allowed' | 'not_allowed' | 'case_by_case';
  petDeposit?: number;
  parkingSpaces?: number;
  utilitiesIncluded?: string[];
  specialTerms?: string;
}

/**
 * Document types for lease-related documents
 */
export type LeaseDocumentType =
  | 'lease_agreement'
  | 'addendum'
  | 'move_in_checklist'
  | 'move_out_checklist'
  | 'notice'
  | 'other';

/**
 * Lease Document - file attached to a lease
 */
export interface LeaseDocument {
  id: string;
  llcId: string;
  leaseId: string;
  type: LeaseDocumentType;
  title: string;
  fileName: string;
  storagePath: string; // Path in Firebase Storage
  contentType: string; // MIME type
  sizeBytes: number;
  generatedFromTemplate?: string; // Template ID if generated
  uploadedByUserId: string;
  createdAt: Timestamp;
}

/**
 * Lease Template - reusable document template with placeholders
 */
export interface LeaseTemplate {
  id: string;
  llcId: string;
  name: string;
  type: LeaseDocumentType;
  description?: string;
  templateContent: string; // HTML with {{placeholders}}
  isDefault: boolean; // Default template for this type
  createdByUserId: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
