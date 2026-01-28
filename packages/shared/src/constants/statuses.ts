/**
 * Property statuses
 */
export const PROPERTY_STATUSES = {
  active: 'active',
  inactive: 'inactive',
  sold: 'sold',
} as const;

export type PropertyStatus = (typeof PROPERTY_STATUSES)[keyof typeof PROPERTY_STATUSES];

export const PROPERTY_TYPES = {
  residential: 'residential',
  commercial: 'commercial',
  mixed: 'mixed',
} as const;

export type PropertyType = (typeof PROPERTY_TYPES)[keyof typeof PROPERTY_TYPES];

/**
 * Unit statuses
 */
export const UNIT_STATUSES = {
  available: 'available',
  occupied: 'occupied',
  maintenance: 'maintenance',
  unavailable: 'unavailable',
} as const;

export type UnitStatus = (typeof UNIT_STATUSES)[keyof typeof UNIT_STATUSES];

/**
 * Lease statuses
 */
export const LEASE_STATUSES = {
  draft: 'draft',
  active: 'active',
  ended: 'ended',
  eviction: 'eviction',
  terminated: 'terminated',
} as const;

export type LeaseStatus = (typeof LEASE_STATUSES)[keyof typeof LEASE_STATUSES];

/**
 * Charge statuses and types
 */
export const CHARGE_STATUSES = {
  open: 'open',
  paid: 'paid',
  partial: 'partial',
  void: 'void',
} as const;

export type ChargeStatus = (typeof CHARGE_STATUSES)[keyof typeof CHARGE_STATUSES];

export const CHARGE_TYPES = {
  rent: 'rent',
  late_fee: 'late_fee',
  utility: 'utility',
  deposit: 'deposit',
  pet_deposit: 'pet_deposit',
  pet_rent: 'pet_rent',
  parking: 'parking',
  damage: 'damage',
  other: 'other',
} as const;

export type ChargeType = (typeof CHARGE_TYPES)[keyof typeof CHARGE_TYPES];

/**
 * Payment statuses
 */
export const PAYMENT_STATUSES = {
  requires_payment_method: 'requires_payment_method',
  requires_confirmation: 'requires_confirmation',
  processing: 'processing',
  succeeded: 'succeeded',
  failed: 'failed',
  canceled: 'canceled',
  refunded: 'refunded',
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[keyof typeof PAYMENT_STATUSES];

/**
 * Bill statuses
 */
export const BILL_STATUSES = {
  draft: 'draft',
  submitted: 'submitted',
  approved: 'approved',
  paid: 'paid',
  void: 'void',
} as const;

export type BillStatus = (typeof BILL_STATUSES)[keyof typeof BILL_STATUSES];

/**
 * Case statuses
 */
export const CASE_STATUSES = {
  open: 'open',
  stayed: 'stayed',
  settled: 'settled',
  judgment: 'judgment',
  closed: 'closed',
} as const;

export type CaseStatus = (typeof CASE_STATUSES)[keyof typeof CASE_STATUSES];

export const CASE_VISIBILITIES = {
  restricted: 'restricted',
  llcWide: 'llcWide',
} as const;

export type CaseVisibility = (typeof CASE_VISIBILITIES)[keyof typeof CASE_VISIBILITIES];

/**
 * Task statuses and priorities
 */
export const TASK_STATUSES = {
  pending: 'pending',
  in_progress: 'in_progress',
  completed: 'completed',
  canceled: 'canceled',
} as const;

export type TaskStatus = (typeof TASK_STATUSES)[keyof typeof TASK_STATUSES];

export const TASK_PRIORITIES = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  urgent: 'urgent',
} as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[keyof typeof TASK_PRIORITIES];
