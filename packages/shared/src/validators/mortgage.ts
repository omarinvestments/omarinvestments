import { z } from 'zod';

export const mortgageStatusSchema = z.enum(['active', 'paid_off', 'defaulted', 'refinanced']);

export const paymentFrequencySchema = z.enum(['monthly', 'bi_weekly', 'weekly']);

export const mortgageTypeSchema = z.enum(['fixed', 'adjustable', 'interest_only', 'balloon']);

export const mortgagePaymentStatusSchema = z.enum(['pending', 'completed', 'late', 'missed']);

export const createMortgageSchema = z.object({
  propertyId: z.string().min(1, 'Property is required'),
  llcId: z.string().min(1, 'LLC is required'),
  lender: z.string().min(1, 'Lender name is required').max(200),
  loanNumber: z.string().max(100).optional(),
  mortgageType: mortgageTypeSchema,
  originalAmount: z.number().positive('Original amount must be positive'),
  currentBalance: z.number().nonnegative('Current balance cannot be negative'),
  interestRate: z.number().min(0).max(100, 'Interest rate must be between 0 and 100'),
  termMonths: z.number().int().positive('Term must be a positive number of months'),
  monthlyPayment: z.number().positive('Monthly payment must be positive'),
  escrowAmount: z.number().nonnegative().optional(),
  paymentFrequency: paymentFrequencySchema.default('monthly'),
  paymentDueDay: z.number().int().min(1).max(28, 'Due day must be between 1 and 28'),
  originationDate: z.string().min(1, 'Origination date is required'),
  firstPaymentDate: z.string().min(1, 'First payment date is required'),
  maturityDate: z.string().min(1, 'Maturity date is required'),
  nextPaymentDate: z.string().min(1, 'Next payment date is required'),
  escrowIncluded: z.boolean().default(false),
  propertyTaxAnnual: z.number().nonnegative().optional(),
  insuranceAnnual: z.number().nonnegative().optional(),
  status: mortgageStatusSchema.default('active'),
  notes: z.string().max(2000).optional(),
});

export const updateMortgageSchema = z.object({
  lender: z.string().min(1).max(200).optional(),
  loanNumber: z.string().max(100).optional(),
  mortgageType: mortgageTypeSchema.optional(),
  currentBalance: z.number().nonnegative().optional(),
  interestRate: z.number().min(0).max(100).optional(),
  monthlyPayment: z.number().positive().optional(),
  escrowAmount: z.number().nonnegative().optional(),
  paymentDueDay: z.number().int().min(1).max(28).optional(),
  nextPaymentDate: z.string().min(1).optional(),
  escrowIncluded: z.boolean().optional(),
  propertyTaxAnnual: z.number().nonnegative().optional(),
  insuranceAnnual: z.number().nonnegative().optional(),
  status: mortgageStatusSchema.optional(),
  notes: z.string().max(2000).optional(),
});

export const recordMortgagePaymentSchema = z.object({
  paymentDate: z.string().min(1, 'Payment date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  amount: z.number().positive('Amount must be positive'),
  principalAmount: z.number().nonnegative('Principal amount cannot be negative'),
  interestAmount: z.number().nonnegative('Interest amount cannot be negative'),
  escrowAmount: z.number().nonnegative().optional(),
  status: mortgagePaymentStatusSchema.default('completed'),
  notes: z.string().max(1000).optional(),
});
