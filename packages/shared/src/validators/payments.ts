import { z } from 'zod';
import { CHARGE_TYPES, CHARGE_STATUSES, PAYMENT_STATUSES } from '../constants/statuses';

export const chargeTypeSchema = z.enum([
  CHARGE_TYPES.rent,
  CHARGE_TYPES.late_fee,
  CHARGE_TYPES.utility,
  CHARGE_TYPES.deposit,
  CHARGE_TYPES.pet_deposit,
  CHARGE_TYPES.pet_rent,
  CHARGE_TYPES.parking,
  CHARGE_TYPES.damage,
  CHARGE_TYPES.other,
]);

export const chargeStatusSchema = z.enum([
  CHARGE_STATUSES.open,
  CHARGE_STATUSES.paid,
  CHARGE_STATUSES.partial,
  CHARGE_STATUSES.void,
]);

export const createChargeSchema = z.object({
  leaseId: z.string().min(1),
  period: z.string().regex(/^\d{4}-\d{2}$/), // YYYY-MM
  type: chargeTypeSchema,
  description: z.string().max(500).optional(),
  amount: z.number().positive(), // In cents
  dueDate: z.string().datetime(),
});

export const updateChargeSchema = z.object({
  description: z.string().max(500).optional(),
  amount: z.number().positive().optional(),
  dueDate: z.string().datetime().optional(),
  status: chargeStatusSchema.optional(),
});

export const paymentStatusSchema = z.enum([
  PAYMENT_STATUSES.requires_payment_method,
  PAYMENT_STATUSES.requires_confirmation,
  PAYMENT_STATUSES.processing,
  PAYMENT_STATUSES.succeeded,
  PAYMENT_STATUSES.failed,
  PAYMENT_STATUSES.canceled,
  PAYMENT_STATUSES.refunded,
]);

export const createPaymentIntentSchema = z.object({
  llcId: z.string().min(1),
  leaseId: z.string().min(1),
  tenantId: z.string().min(1),
  chargeIds: z.array(z.string()).min(1),
  amountCents: z.number().positive(),
  currency: z.string().default('usd'),
});

export const paymentApplicationSchema = z.object({
  chargeId: z.string().min(1),
  amount: z.number().positive(), // In cents
});

/**
 * Schema for manually recording a payment (cash, check, etc.)
 */
export const recordPaymentSchema = z.object({
  leaseId: z.string().min(1),
  tenantId: z.string().min(1),
  amount: z.number().positive(), // Total payment amount in cents
  paymentMethod: z.enum(['cash', 'check', 'money_order', 'bank_transfer', 'other']),
  checkNumber: z.string().max(50).optional(),
  memo: z.string().max(500).optional(),
  paymentDate: z.string().datetime().optional(), // ISO date, defaults to now
  chargeAllocations: z.array(paymentApplicationSchema).optional(), // How to apply payment to charges
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

/**
 * Schema for voiding a charge
 */
export const voidChargeSchema = z.object({
  reason: z.string().min(1).max(500),
});

export type VoidChargeInput = z.infer<typeof voidChargeSchema>;
