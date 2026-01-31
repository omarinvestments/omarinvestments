import { Timestamp } from './common';
import { BillStatus } from '../constants/statuses';

/**
 * Vendor - company or person providing services
 */
export interface Vendor {
  id: string;
  llcId: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxIdRef?: string; // Reference to secure storage, never raw TIN
  category?: VendorCategory;
  notes?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export type VendorCategory =
  | 'maintenance'
  | 'utilities'
  | 'landscaping'
  | 'cleaning'
  | 'legal'
  | 'insurance'
  | 'contractor'
  | 'other';

/**
 * Bill - expense to be paid
 */
export interface Bill {
  id: string;
  llcId: string;
  vendorId?: string;
  utilityAccountId?: string;
  propertyId: string;
  description: string;
  amount: number; // In cents
  dueDate: string; // ISO date
  status: BillStatus;
  invoiceNumber?: string;
  allocations?: BillAllocation[];
  attachments?: BillAttachment[];
  approvedByUserId?: string;
  approvedAt?: Timestamp;
  paidAt?: Timestamp;
  paidVia?: string;
  notes?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface BillAllocation {
  unitId: string;
  amount: number; // In cents
  tenantId?: string;
}

export interface BillAttachment {
  storagePath: string;
  fileName: string;
  contentType: string;
}

/**
 * Utility account - recurring utility service
 */
export interface UtilityAccount {
  id: string;
  llcId: string;
  propertyId: string;
  provider: string;
  accountNumber?: string; // Encrypted or tokenized
  serviceType: UtilityType;
  meterNumber?: string;
  notes?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export type UtilityType =
  | 'electric'
  | 'gas'
  | 'water'
  | 'sewer'
  | 'trash'
  | 'internet'
  | 'cable'
  | 'other';

// Note: Work Order types have been moved to ./workOrder.ts for enhanced functionality
// Import from '@shared/types' to access WorkOrder, WorkOrderCategory, WorkOrderStatus
