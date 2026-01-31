import { Timestamp } from './common';

/**
 * Work Order Categories
 */
export const WORK_ORDER_CATEGORIES = {
  plumbing: 'plumbing',
  electrical: 'electrical',
  hvac: 'hvac',
  appliance: 'appliance',
  structural: 'structural',
  landscaping: 'landscaping',
  cleaning: 'cleaning',
  general: 'general',
  emergency: 'emergency',
} as const;

export type WorkOrderCategory = (typeof WORK_ORDER_CATEGORIES)[keyof typeof WORK_ORDER_CATEGORIES];

/**
 * Work Order Priorities
 */
export const WORK_ORDER_PRIORITIES = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  urgent: 'urgent',
} as const;

export type WorkOrderPriority = (typeof WORK_ORDER_PRIORITIES)[keyof typeof WORK_ORDER_PRIORITIES];

/**
 * Work Order Statuses
 */
export const WORK_ORDER_STATUSES = {
  open: 'open',
  assigned: 'assigned',
  in_progress: 'in_progress',
  pending_review: 'pending_review',
  completed: 'completed',
  canceled: 'canceled',
} as const;

export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[keyof typeof WORK_ORDER_STATUSES];

/**
 * Work Order - Full schema
 * Stored at: /llcs/{llcId}/workOrders/{workOrderId}
 */
export interface WorkOrder {
  id: string;
  llcId: string;
  propertyId: string;
  unitId?: string;

  // Core details
  title: string;
  description?: string;
  category: WorkOrderCategory;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;

  // Source
  requestedByTenantId?: string; // If tenant-initiated
  requestedByUserId?: string; // If staff-initiated
  requestSource: 'tenant' | 'staff' | 'inspection';

  // Assignment
  assignedEmployeeIds: string[];

  // Scheduling
  scheduledDate?: string; // ISO date string
  scheduledTimeSlot?: string; // e.g., "9:00 AM - 12:00 PM"
  estimatedDuration?: number; // Minutes

  // Costs
  estimatedCost?: number; // Cents
  actualCost?: number; // Cents
  laborCost?: number; // Cents
  materialsCost?: number; // Cents

  // Completion
  completedDate?: string; // ISO date string
  completedByUserId?: string;
  completionNotes?: string;

  // Tracking
  notes: WorkOrderNote[];
  photos: WorkOrderPhoto[];
  statusHistory: WorkOrderStatusChange[];

  // Metadata
  createdByUserId: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Work Order Note
 */
export interface WorkOrderNote {
  id: string;
  content: string;
  authorUserId: string;
  authorName?: string;
  isInternal: boolean; // Internal notes not visible to tenants
  createdAt: Timestamp;
}

/**
 * Work Order Photo
 */
export interface WorkOrderPhoto {
  id: string;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  uploadedByUserId: string;
  type: 'before' | 'during' | 'after' | 'receipt' | 'other';
  createdAt: Timestamp;
}

/**
 * Work Order Status Change
 */
export interface WorkOrderStatusChange {
  id: string;
  fromStatus: WorkOrderStatus | null;
  toStatus: WorkOrderStatus;
  changedByUserId: string;
  reason?: string;
  createdAt: Timestamp;
}

/**
 * Work Order Summary (for lists)
 */
export interface WorkOrderSummary {
  id: string;
  llcId: string;
  propertyId: string;
  propertyName?: string;
  unitId?: string;
  unitLabel?: string;
  title: string;
  category: WorkOrderCategory;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  assignedEmployeeIds: string[];
  scheduledDate?: string;
  createdAt: Timestamp;
}

/**
 * Create Work Order Input
 */
export interface CreateWorkOrderInput {
  propertyId: string;
  unitId?: string;
  title: string;
  description?: string;
  category: WorkOrderCategory;
  priority: WorkOrderPriority;
  requestedByTenantId?: string;
  requestSource?: 'tenant' | 'staff' | 'inspection';
  scheduledDate?: string;
  scheduledTimeSlot?: string;
  estimatedDuration?: number;
  estimatedCost?: number;
}

/**
 * Update Work Order Input
 */
export interface UpdateWorkOrderInput {
  title?: string;
  description?: string;
  category?: WorkOrderCategory;
  priority?: WorkOrderPriority;
  scheduledDate?: string;
  scheduledTimeSlot?: string;
  estimatedDuration?: number;
  estimatedCost?: number;
  actualCost?: number;
  laborCost?: number;
  materialsCost?: number;
}

/**
 * Assign Work Order Input
 */
export interface AssignWorkOrderInput {
  employeeIds: string[];
  scheduledDate?: string;
  scheduledTimeSlot?: string;
  notes?: string;
}

/**
 * Complete Work Order Input
 */
export interface CompleteWorkOrderInput {
  completionNotes?: string;
  actualCost?: number;
  laborCost?: number;
  materialsCost?: number;
}

/**
 * Add Work Order Note Input
 */
export interface AddWorkOrderNoteInput {
  content: string;
  isInternal?: boolean;
}

/**
 * Add Work Order Photo Input
 */
export interface AddWorkOrderPhotoInput {
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  type: 'before' | 'during' | 'after' | 'receipt' | 'other';
}

/**
 * Work Order Filter Options
 */
export interface WorkOrderFilterOptions {
  llcId?: string;
  propertyId?: string;
  unitId?: string;
  status?: WorkOrderStatus | WorkOrderStatus[];
  priority?: WorkOrderPriority | WorkOrderPriority[];
  category?: WorkOrderCategory | WorkOrderCategory[];
  assignedEmployeeId?: string;
  scheduledDateFrom?: string;
  scheduledDateTo?: string;
  createdDateFrom?: string;
  createdDateTo?: string;
}

/**
 * Display labels
 */
export const WORK_ORDER_CATEGORY_LABELS: Record<WorkOrderCategory, string> = {
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  hvac: 'HVAC',
  appliance: 'Appliance',
  structural: 'Structural',
  landscaping: 'Landscaping',
  cleaning: 'Cleaning',
  general: 'General',
  emergency: 'Emergency',
};

export const WORK_ORDER_PRIORITY_LABELS: Record<WorkOrderPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  open: 'Open',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  pending_review: 'Pending Review',
  completed: 'Completed',
  canceled: 'Canceled',
};

/**
 * Status colors for UI
 */
export const WORK_ORDER_STATUS_COLORS: Record<WorkOrderStatus, string> = {
  open: 'bg-yellow-100 text-yellow-800',
  assigned: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  pending_review: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  canceled: 'bg-gray-100 text-gray-500',
};

export const WORK_ORDER_PRIORITY_COLORS: Record<WorkOrderPriority, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};
