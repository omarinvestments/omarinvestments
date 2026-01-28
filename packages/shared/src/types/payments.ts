import { Timestamp } from './common';
import { ChargeStatus, ChargeType, PaymentStatus } from '../constants/statuses';

/**
 * Charge - amount owed by tenant
 */
export interface Charge {
  id: string;
  llcId: string;
  leaseId: string;
  tenantUserId?: string; // For Firestore rules
  period: string; // YYYY-MM
  type: ChargeType;
  description?: string;
  amount: number; // In cents
  paidAmount: number; // Amount paid so far in cents (for partial payments)
  status: ChargeStatus;
  dueDate: string; // ISO date
  linkedChargeId?: string; // For late fees linked to original rent charge
  lateFeeAppliedAt?: Timestamp; // When late fee was applied to this charge
  lateFeeChargeId?: string; // ID of the late fee charge created for this charge
  voidedAt?: Timestamp; // When the charge was voided
  voidedBy?: string; // User who voided the charge
  voidReason?: string; // Reason for voiding
  stripeInvoiceId?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Payment - money received from tenant
 */
export interface Payment {
  id: string;
  llcId: string;
  leaseId: string;
  tenantId: string;
  tenantUserId?: string; // For Firestore rules
  amount: number; // In cents
  currency: string;
  status: PaymentStatus;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  paymentMethod?: PaymentMethod;
  appliedTo: PaymentApplication[];
  receiptUrl?: string;
  failureReason?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface PaymentApplication {
  chargeId: string;
  amount: number; // In cents
}

export interface PaymentMethod {
  type: 'card' | 'us_bank_account';
  last4?: string;
  brand?: string; // For cards
  bankName?: string; // For bank accounts
}

/**
 * Stripe event tracking for idempotency
 */
export interface StripeEvent {
  id: string;
  type: string;
  processedAt: Timestamp;
}
