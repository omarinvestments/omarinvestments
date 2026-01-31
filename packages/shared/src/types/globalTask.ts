import { Timestamp } from './common';

/**
 * Global Task Statuses
 */
export const GLOBAL_TASK_STATUSES = {
  pending: 'pending',
  in_progress: 'in_progress',
  completed: 'completed',
  canceled: 'canceled',
} as const;

export type GlobalTaskStatus = (typeof GLOBAL_TASK_STATUSES)[keyof typeof GLOBAL_TASK_STATUSES];

/**
 * Global Task Priorities
 */
export const GLOBAL_TASK_PRIORITIES = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  urgent: 'urgent',
} as const;

export type GlobalTaskPriority = (typeof GLOBAL_TASK_PRIORITIES)[keyof typeof GLOBAL_TASK_PRIORITIES];

/**
 * Entity types that tasks can be associated with
 */
export const TASK_ENTITY_TYPES = {
  workOrder: 'workOrder',
  property: 'property',
  unit: 'unit',
  tenant: 'tenant',
  lease: 'lease',
  llc: 'llc',
  general: 'general',
} as const;

export type TaskEntityType = (typeof TASK_ENTITY_TYPES)[keyof typeof TASK_ENTITY_TYPES];

/**
 * Global Task - Standalone tasks (not case-scoped)
 * Stored at: /globalTasks/{taskId}
 *
 * These tasks can be:
 * - Associated with work orders
 * - Linked to properties, units, tenants, leases
 * - General tasks without entity association
 */
export interface GlobalTask {
  id: string;
  title: string;
  description?: string;
  dueDate: string; // ISO date string
  status: GlobalTaskStatus;
  priority: GlobalTaskPriority;

  // Entity association (optional)
  entityType: TaskEntityType;
  entityId?: string; // ID of the associated entity

  // Scoping
  llcId?: string; // If LLC-scoped
  propertyId?: string; // If property-scoped

  // Assignment
  assignedToUserId?: string;
  assignedToUserName?: string; // Denormalized for display

  // Completion
  completedAt?: Timestamp;
  completedByUserId?: string;
  completionNotes?: string;

  // Metadata
  createdByUserId: string;
  createdByUserName?: string; // Denormalized for display
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Global Task Summary (for lists)
 */
export interface GlobalTaskSummary {
  id: string;
  title: string;
  dueDate: string;
  status: GlobalTaskStatus;
  priority: GlobalTaskPriority;
  entityType: TaskEntityType;
  llcId?: string;
  llcName?: string;
  propertyId?: string;
  propertyName?: string;
  assignedToUserId?: string;
  assignedToUserName?: string;
  createdAt: Timestamp;
}

/**
 * Create Global Task Input
 */
export interface CreateGlobalTaskInput {
  title: string;
  description?: string;
  dueDate: string;
  priority: GlobalTaskPriority;
  entityType?: TaskEntityType;
  entityId?: string;
  llcId?: string;
  propertyId?: string;
  assignedToUserId?: string;
}

/**
 * Update Global Task Input
 */
export interface UpdateGlobalTaskInput {
  title?: string;
  description?: string;
  dueDate?: string;
  priority?: GlobalTaskPriority;
  assignedToUserId?: string | null; // null to unassign
}

/**
 * Complete Global Task Input
 */
export interface CompleteGlobalTaskInput {
  completionNotes?: string;
}

/**
 * Global Task Filter Options
 */
export interface GlobalTaskFilterOptions {
  llcId?: string;
  propertyId?: string;
  entityType?: TaskEntityType;
  entityId?: string;
  status?: GlobalTaskStatus | GlobalTaskStatus[];
  priority?: GlobalTaskPriority | GlobalTaskPriority[];
  assignedToUserId?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  overdue?: boolean;
  createdByUserId?: string;
}

/**
 * Display labels
 */
export const GLOBAL_TASK_STATUS_LABELS: Record<GlobalTaskStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  canceled: 'Canceled',
};

export const GLOBAL_TASK_PRIORITY_LABELS: Record<GlobalTaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export const TASK_ENTITY_TYPE_LABELS: Record<TaskEntityType, string> = {
  workOrder: 'Work Order',
  property: 'Property',
  unit: 'Unit',
  tenant: 'Tenant',
  lease: 'Lease',
  llc: 'LLC',
  general: 'General',
};

/**
 * Status colors for UI
 */
export const GLOBAL_TASK_STATUS_COLORS: Record<GlobalTaskStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  canceled: 'bg-gray-100 text-gray-500',
};

export const GLOBAL_TASK_PRIORITY_COLORS: Record<GlobalTaskPriority, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};
