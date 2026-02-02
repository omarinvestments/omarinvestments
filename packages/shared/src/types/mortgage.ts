import { Timestamp } from './common';

/**
 * Mortgage status
 */
export type MortgageStatus = 'active' | 'paid_off' | 'defaulted' | 'refinanced';

/**
 * Payment frequency
 */
export type PaymentFrequency = 'monthly' | 'bi_weekly' | 'weekly';

/**
 * Mortgage type
 */
export type MortgageType = 'fixed' | 'adjustable' | 'interest_only' | 'balloon';

/**
 * Mortgage payment status
 */
export type MortgagePaymentStatus = 'pending' | 'completed' | 'late' | 'missed';

/**
 * Mortgage - loan secured by a property (global collection, not LLC-scoped)
 */
export interface Mortgage {
  id: string;

  // Property linkage (denormalized for queries)
  propertyId: string;
  llcId: string;
  propertyAddress: string;  // Denormalized for display
  llcName: string;          // Denormalized for display

  // Lender info
  lender: string;
  loanNumber?: string;

  // Loan terms
  mortgageType: MortgageType;
  originalAmount: number;      // In cents
  currentBalance: number;      // In cents
  interestRate: number;        // Annual rate as percentage (e.g., 6.5)
  termMonths: number;          // Total loan term (e.g., 360 for 30-year)

  // Payment info
  monthlyPayment: number;      // Principal + Interest in cents
  escrowAmount?: number;       // Taxes/Insurance in cents
  totalPayment: number;        // Monthly P+I+Escrow in cents
  paymentFrequency: PaymentFrequency;
  paymentDueDay: number;       // Day of month (1-28)

  // Key dates
  originationDate: string;     // ISO date - when loan started
  firstPaymentDate: string;    // ISO date
  maturityDate: string;        // ISO date - when loan ends
  nextPaymentDate: string;     // ISO date - next due date

  // Escrow details
  escrowIncluded: boolean;
  propertyTaxAnnual?: number;  // In cents
  insuranceAnnual?: number;    // In cents

  // Status
  status: MortgageStatus;

  // Notes & metadata
  notes?: string;
  createdByUserId: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Mortgage Payment - record of a mortgage payment
 */
export interface MortgagePayment {
  id: string;
  mortgageId: string;

  // Payment details
  paymentDate: string;         // ISO date - when paid
  dueDate: string;             // ISO date - when it was due
  amount: number;              // Total amount in cents
  principalAmount: number;     // Principal portion in cents
  interestAmount: number;      // Interest portion in cents
  escrowAmount?: number;       // Escrow portion in cents

  // Balance after payment
  remainingBalance: number;    // In cents

  // Status
  status: MortgagePaymentStatus;

  // Metadata
  notes?: string;
  recordedByUserId: string;
  createdAt: Timestamp;
}

/**
 * Amortization schedule entry
 */
export interface AmortizationEntry {
  paymentNumber: number;
  paymentDate: string;
  payment: number;           // In cents
  principal: number;         // In cents
  interest: number;          // In cents
  balance: number;           // In cents
  cumulativeInterest: number; // In cents
}

/**
 * Extra payment savings calculation
 */
export interface ExtraPaymentSavings {
  extraMonthly: number;       // Extra amount per month in cents
  interestSaved: number;      // Total interest saved in cents
  monthsSaved: number;        // Number of months shaved off
  newPayoffDate: string;      // New expected payoff date
}

/**
 * Mortgage summary with calculated values
 */
export interface MortgageSummary {
  // Current state
  currentBalance: number;      // In cents
  monthlyPayment: number;      // In cents
  nextPaymentDate: string;
  daysUntilPayment: number;

  // Progress
  principalPaid: number;       // In cents
  interestPaid: number;        // In cents
  percentPaidOff: number;      // 0-100
  remainingPayments: number;

  // Projections
  totalCost: number;           // Original + all interest in cents
  totalInterest: number;       // Lifetime interest in cents
  remainingInterest: number;   // Interest left to pay in cents
  payoffDate: string;          // Expected final payment date

  // Early payoff scenarios (optional)
  extraPaymentSavings?: ExtraPaymentSavings;
}

/**
 * Input for creating a mortgage
 */
export interface CreateMortgageInput {
  propertyId: string;
  llcId: string;
  lender: string;
  loanNumber?: string;
  mortgageType: MortgageType;
  originalAmount: number;
  currentBalance: number;
  interestRate: number;
  termMonths: number;
  monthlyPayment: number;
  escrowAmount?: number;
  paymentFrequency: PaymentFrequency;
  paymentDueDay: number;
  originationDate: string;
  firstPaymentDate: string;
  maturityDate: string;
  nextPaymentDate: string;
  escrowIncluded: boolean;
  propertyTaxAnnual?: number;
  insuranceAnnual?: number;
  status?: MortgageStatus;
  notes?: string;
}

/**
 * Input for updating a mortgage
 */
export interface UpdateMortgageInput {
  lender?: string;
  loanNumber?: string;
  mortgageType?: MortgageType;
  currentBalance?: number;
  interestRate?: number;
  monthlyPayment?: number;
  escrowAmount?: number;
  paymentDueDay?: number;
  nextPaymentDate?: string;
  escrowIncluded?: boolean;
  propertyTaxAnnual?: number;
  insuranceAnnual?: number;
  status?: MortgageStatus;
  notes?: string;
}

/**
 * Input for recording a mortgage payment
 */
export interface RecordMortgagePaymentInput {
  paymentDate: string;
  dueDate: string;
  amount: number;
  principalAmount: number;
  interestAmount: number;
  escrowAmount?: number;
  status?: MortgagePaymentStatus;
  notes?: string;
}

/**
 * Filters for listing mortgages
 */
export interface MortgageFilters {
  llcId?: string;
  propertyId?: string;
  status?: MortgageStatus;
  lender?: string;
  upcomingPaymentsDays?: number;  // Filter mortgages with payments due within N days
}
