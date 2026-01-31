import { z } from 'zod';
import {
  BUSINESS_ROLES,
  ASSIGNMENT_STATUSES,
} from '../constants/permissions';
import {
  WORK_ORDER_CATEGORIES,
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_STATUSES,
} from '../types/workOrder';
import {
  GLOBAL_TASK_STATUSES,
  GLOBAL_TASK_PRIORITIES,
  TASK_ENTITY_TYPES,
} from '../types/globalTask';

// ============================================
// RBAC Schemas
// ============================================

/**
 * Business role schema (manager | employee)
 */
export const businessRoleSchema = z.enum([
  BUSINESS_ROLES.admin,
  BUSINESS_ROLES.manager,
  BUSINESS_ROLES.employee,
]);

/**
 * Assignable role schema (excludes admin - admin is LLC-scoped)
 */
export const assignableRoleSchema = z.enum([
  BUSINESS_ROLES.manager,
  BUSINESS_ROLES.employee,
]);

/**
 * Assignment status schema
 */
export const assignmentStatusSchema = z.enum([
  ASSIGNMENT_STATUSES.active,
  ASSIGNMENT_STATUSES.disabled,
]);

/**
 * Employee capabilities schema
 */
export const employeeCapabilitiesSchema = z.object({
  workOrderAccess: z.boolean().default(true),
  taskAccess: z.boolean().default(true),
  paymentProcessing: z.boolean().default(false),
});

/**
 * Create user assignment schema
 */
export const createUserAssignmentSchema = z.object({
  userId: z.string().min(1),
  role: assignableRoleSchema,
  llcIds: z.array(z.string()).min(1),
  propertyIds: z.array(z.string()).default([]),
  capabilities: employeeCapabilitiesSchema.partial().optional(),
  notes: z.string().max(500).optional(),
});

/**
 * Update user assignment schema
 */
export const updateUserAssignmentSchema = z.object({
  role: assignableRoleSchema.optional(),
  llcIds: z.array(z.string()).min(1).optional(),
  propertyIds: z.array(z.string()).optional(),
  capabilities: employeeCapabilitiesSchema.partial().optional(),
  status: assignmentStatusSchema.optional(),
  notes: z.string().max(500).optional(),
});

/**
 * Invite LLC admin schema
 */
export const inviteLlcAdminSchema = z.object({
  email: z.string().email(),
});

/**
 * User type schema
 */
export const userTypeSchema = z.enum(['staff', 'tenant']);

/**
 * User status schema
 */
export const userStatusSchema = z.enum(['active', 'pending', 'disabled']);

/**
 * Tenant link schema
 */
export const tenantLinkSchema = z.object({
  llcId: z.string().min(1),
  tenantId: z.string().min(1),
  llcName: z.string().optional(),
});

/**
 * Update user schema (super-admin only)
 */
export const updateUserSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  phoneNumber: z.string().max(20).optional(),
  userType: userTypeSchema.optional(),
  status: userStatusSchema.optional(),
  isSuperAdmin: z.boolean().optional(),
  tenantLinks: z.array(tenantLinkSchema).optional(),
});

/**
 * @deprecated Use updateUserSchema instead
 */
export const updatePlatformUserSchema = updateUserSchema;

// ============================================
// Work Order Schemas
// ============================================

export const workOrderCategorySchema = z.enum([
  WORK_ORDER_CATEGORIES.plumbing,
  WORK_ORDER_CATEGORIES.electrical,
  WORK_ORDER_CATEGORIES.hvac,
  WORK_ORDER_CATEGORIES.appliance,
  WORK_ORDER_CATEGORIES.structural,
  WORK_ORDER_CATEGORIES.landscaping,
  WORK_ORDER_CATEGORIES.cleaning,
  WORK_ORDER_CATEGORIES.general,
  WORK_ORDER_CATEGORIES.emergency,
]);

export const workOrderPrioritySchema = z.enum([
  WORK_ORDER_PRIORITIES.low,
  WORK_ORDER_PRIORITIES.medium,
  WORK_ORDER_PRIORITIES.high,
  WORK_ORDER_PRIORITIES.urgent,
]);

export const workOrderStatusSchema = z.enum([
  WORK_ORDER_STATUSES.open,
  WORK_ORDER_STATUSES.assigned,
  WORK_ORDER_STATUSES.in_progress,
  WORK_ORDER_STATUSES.pending_review,
  WORK_ORDER_STATUSES.completed,
  WORK_ORDER_STATUSES.canceled,
]);

export const workOrderPhotoTypeSchema = z.enum([
  'before',
  'during',
  'after',
  'receipt',
  'other',
]);

export const workOrderRequestSourceSchema = z.enum([
  'tenant',
  'staff',
  'inspection',
]);

/**
 * Create work order schema
 */
export const createWorkOrderSchema = z.object({
  propertyId: z.string().min(1),
  unitId: z.string().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  category: workOrderCategorySchema,
  priority: workOrderPrioritySchema,
  requestedByTenantId: z.string().optional(),
  requestSource: workOrderRequestSourceSchema.optional().default('staff'),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  scheduledTimeSlot: z.string().max(50).optional(),
  estimatedDuration: z.number().int().positive().optional(),
  estimatedCost: z.number().int().min(0).optional(),
});

/**
 * Update work order schema
 */
export const updateWorkOrderSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  category: workOrderCategorySchema.optional(),
  priority: workOrderPrioritySchema.optional(),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  scheduledTimeSlot: z.string().max(50).optional(),
  estimatedDuration: z.number().int().positive().optional(),
  estimatedCost: z.number().int().min(0).optional(),
  actualCost: z.number().int().min(0).optional(),
  laborCost: z.number().int().min(0).optional(),
  materialsCost: z.number().int().min(0).optional(),
});

/**
 * Assign work order schema
 */
export const assignWorkOrderSchema = z.object({
  employeeIds: z.array(z.string()).min(1),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  scheduledTimeSlot: z.string().max(50).optional(),
  notes: z.string().max(500).optional(),
});

/**
 * Complete work order schema
 */
export const completeWorkOrderSchema = z.object({
  completionNotes: z.string().max(2000).optional(),
  actualCost: z.number().int().min(0).optional(),
  laborCost: z.number().int().min(0).optional(),
  materialsCost: z.number().int().min(0).optional(),
});

/**
 * Add work order note schema
 */
export const addWorkOrderNoteSchema = z.object({
  content: z.string().min(1).max(2000),
  isInternal: z.boolean().default(false),
});

/**
 * Add work order photo schema
 */
export const addWorkOrderPhotoSchema = z.object({
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  caption: z.string().max(200).optional(),
  type: workOrderPhotoTypeSchema,
});

/**
 * Update work order status schema
 */
export const updateWorkOrderStatusSchema = z.object({
  status: workOrderStatusSchema,
  reason: z.string().max(500).optional(),
});

// ============================================
// Global Task Schemas
// ============================================

export const globalTaskStatusSchema = z.enum([
  GLOBAL_TASK_STATUSES.pending,
  GLOBAL_TASK_STATUSES.in_progress,
  GLOBAL_TASK_STATUSES.completed,
  GLOBAL_TASK_STATUSES.canceled,
]);

export const globalTaskPrioritySchema = z.enum([
  GLOBAL_TASK_PRIORITIES.low,
  GLOBAL_TASK_PRIORITIES.medium,
  GLOBAL_TASK_PRIORITIES.high,
  GLOBAL_TASK_PRIORITIES.urgent,
]);

export const taskEntityTypeSchema = z.enum([
  TASK_ENTITY_TYPES.workOrder,
  TASK_ENTITY_TYPES.property,
  TASK_ENTITY_TYPES.unit,
  TASK_ENTITY_TYPES.tenant,
  TASK_ENTITY_TYPES.lease,
  TASK_ENTITY_TYPES.llc,
  TASK_ENTITY_TYPES.general,
]);

/**
 * Create global task schema
 */
export const createGlobalTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  priority: globalTaskPrioritySchema,
  entityType: taskEntityTypeSchema.optional().default('general'),
  entityId: z.string().optional(),
  llcId: z.string().optional(),
  propertyId: z.string().optional(),
  assignedToUserId: z.string().optional(),
});

/**
 * Update global task schema
 */
export const updateGlobalTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  priority: globalTaskPrioritySchema.optional(),
  assignedToUserId: z.string().optional().nullable(),
});

/**
 * Complete global task schema
 */
export const completeGlobalTaskSchema = z.object({
  completionNotes: z.string().max(2000).optional(),
});

/**
 * Update global task status schema
 */
export const updateGlobalTaskStatusSchema = z.object({
  status: globalTaskStatusSchema,
});
