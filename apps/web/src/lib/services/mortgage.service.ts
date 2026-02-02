import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type {
  Mortgage,
  MortgagePayment,
  MortgageFilters,
  AmortizationEntry,
  MortgageSummary,
  ExtraPaymentSavings,
  CreateMortgageInput,
  UpdateMortgageInput,
  RecordMortgagePaymentInput,
} from '@shared/types/mortgage';

/**
 * Create a new mortgage
 */
export async function createMortgage(
  input: CreateMortgageInput,
  actorUserId: string
): Promise<Mortgage> {
  // Fetch property and LLC info for denormalization
  const propertyRef = adminDb
    .collection('llcs')
    .doc(input.llcId)
    .collection('properties')
    .doc(input.propertyId);
  const propertyDoc = await propertyRef.get();

  if (!propertyDoc.exists) {
    throw new Error('NOT_FOUND: Property not found');
  }

  const propertyData = propertyDoc.data();
  const propertyAddress = propertyData?.address
    ? `${propertyData.address.street1}, ${propertyData.address.city}, ${propertyData.address.state}`
    : 'Unknown Address';

  const llcDoc = await adminDb.collection('llcs').doc(input.llcId).get();
  if (!llcDoc.exists) {
    throw new Error('NOT_FOUND: LLC not found');
  }
  const llcName = llcDoc.data()?.legalName || 'Unknown LLC';

  // Calculate total payment
  const totalPayment = input.monthlyPayment + (input.escrowAmount || 0);

  const mortgageRef = adminDb.collection('mortgages').doc();
  const mortgageData = {
    propertyId: input.propertyId,
    llcId: input.llcId,
    propertyAddress,
    llcName,
    lender: input.lender,
    loanNumber: input.loanNumber || null,
    mortgageType: input.mortgageType,
    originalAmount: input.originalAmount,
    currentBalance: input.currentBalance,
    interestRate: input.interestRate,
    termMonths: input.termMonths,
    monthlyPayment: input.monthlyPayment,
    escrowAmount: input.escrowAmount || null,
    totalPayment,
    paymentFrequency: input.paymentFrequency,
    paymentDueDay: input.paymentDueDay,
    originationDate: input.originationDate,
    firstPaymentDate: input.firstPaymentDate,
    maturityDate: input.maturityDate,
    nextPaymentDate: input.nextPaymentDate,
    escrowIncluded: input.escrowIncluded,
    propertyTaxAnnual: input.propertyTaxAnnual || null,
    insuranceAnnual: input.insuranceAnnual || null,
    status: input.status || 'active',
    notes: input.notes || null,
    createdByUserId: actorUserId,
    createdAt: FieldValue.serverTimestamp(),
  };

  await mortgageRef.set(mortgageData);

  return {
    id: mortgageRef.id,
    ...mortgageData,
    createdAt: new Date(),
  } as unknown as Mortgage;
}

/**
 * Get a single mortgage by ID
 */
export async function getMortgage(mortgageId: string): Promise<Mortgage | null> {
  const mortgageRef = adminDb.collection('mortgages').doc(mortgageId);
  const mortgageDoc = await mortgageRef.get();

  if (!mortgageDoc.exists) {
    return null;
  }

  return { id: mortgageDoc.id, ...mortgageDoc.data() } as Mortgage;
}

/**
 * Update a mortgage
 */
export async function updateMortgage(
  mortgageId: string,
  input: UpdateMortgageInput,
  _actorUserId: string
): Promise<Mortgage> {
  const mortgageRef = adminDb.collection('mortgages').doc(mortgageId);
  const mortgageDoc = await mortgageRef.get();

  if (!mortgageDoc.exists) {
    throw new Error('NOT_FOUND: Mortgage not found');
  }

  const currentData = mortgageDoc.data() as Mortgage;
  const updateData: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.lender !== undefined) updateData.lender = input.lender;
  if (input.loanNumber !== undefined) updateData.loanNumber = input.loanNumber;
  if (input.mortgageType !== undefined) updateData.mortgageType = input.mortgageType;
  if (input.currentBalance !== undefined) updateData.currentBalance = input.currentBalance;
  if (input.interestRate !== undefined) updateData.interestRate = input.interestRate;
  if (input.monthlyPayment !== undefined) updateData.monthlyPayment = input.monthlyPayment;
  if (input.escrowAmount !== undefined) updateData.escrowAmount = input.escrowAmount;
  if (input.paymentDueDay !== undefined) updateData.paymentDueDay = input.paymentDueDay;
  if (input.nextPaymentDate !== undefined) updateData.nextPaymentDate = input.nextPaymentDate;
  if (input.escrowIncluded !== undefined) updateData.escrowIncluded = input.escrowIncluded;
  if (input.propertyTaxAnnual !== undefined) updateData.propertyTaxAnnual = input.propertyTaxAnnual;
  if (input.insuranceAnnual !== undefined) updateData.insuranceAnnual = input.insuranceAnnual;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.notes !== undefined) updateData.notes = input.notes;

  // Recalculate total payment if monthly payment or escrow changed
  if (input.monthlyPayment !== undefined || input.escrowAmount !== undefined) {
    const monthlyPayment = input.monthlyPayment ?? currentData.monthlyPayment;
    const escrowAmount = input.escrowAmount ?? currentData.escrowAmount ?? 0;
    updateData.totalPayment = monthlyPayment + escrowAmount;
  }

  await mortgageRef.update(updateData);

  return { ...currentData, ...updateData, id: mortgageId } as unknown as Mortgage;
}

/**
 * Delete a mortgage
 */
export async function deleteMortgage(mortgageId: string): Promise<void> {
  const mortgageRef = adminDb.collection('mortgages').doc(mortgageId);
  const mortgageDoc = await mortgageRef.get();

  if (!mortgageDoc.exists) {
    throw new Error('NOT_FOUND: Mortgage not found');
  }

  // Delete all payments in the subcollection first
  const paymentsSnap = await mortgageRef.collection('payments').get();
  const batch = adminDb.batch();

  for (const paymentDoc of paymentsSnap.docs) {
    batch.delete(paymentDoc.ref);
  }

  batch.delete(mortgageRef);
  await batch.commit();
}

/**
 * List mortgages with optional filters
 */
export async function listMortgages(filters?: MortgageFilters): Promise<Mortgage[]> {
  let query: FirebaseFirestore.Query = adminDb.collection('mortgages');

  if (filters?.llcId) {
    query = query.where('llcId', '==', filters.llcId);
  }

  if (filters?.propertyId) {
    query = query.where('propertyId', '==', filters.propertyId);
  }

  if (filters?.status) {
    query = query.where('status', '==', filters.status);
  }

  if (filters?.lender) {
    query = query.where('lender', '==', filters.lender);
  }

  if (filters?.upcomingPaymentsDays) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + filters.upcomingPaymentsDays);
    const futureDateStr = futureDate.toISOString().slice(0, 10);
    query = query.where('nextPaymentDate', '<=', futureDateStr);
  }

  const snapshot = await query.get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Mortgage[];
}

/**
 * Get mortgages for a specific property
 */
export async function getMortgagesByProperty(propertyId: string): Promise<Mortgage[]> {
  return listMortgages({ propertyId });
}

/**
 * Get mortgages for a specific LLC
 */
export async function getMortgagesByLlc(llcId: string): Promise<Mortgage[]> {
  return listMortgages({ llcId });
}

/**
 * Get mortgages with upcoming payments
 */
export async function getUpcomingPayments(daysAhead: number): Promise<Mortgage[]> {
  return listMortgages({ upcomingPaymentsDays: daysAhead, status: 'active' });
}

/**
 * Record a mortgage payment
 */
export async function recordPayment(
  mortgageId: string,
  input: RecordMortgagePaymentInput,
  actorUserId: string
): Promise<MortgagePayment> {
  const mortgageRef = adminDb.collection('mortgages').doc(mortgageId);
  const mortgageDoc = await mortgageRef.get();

  if (!mortgageDoc.exists) {
    throw new Error('NOT_FOUND: Mortgage not found');
  }

  const mortgageData = mortgageDoc.data() as Mortgage;

  // Calculate remaining balance after payment
  const remainingBalance = mortgageData.currentBalance - input.principalAmount;

  const paymentRef = mortgageRef.collection('payments').doc();
  const paymentData = {
    mortgageId,
    paymentDate: input.paymentDate,
    dueDate: input.dueDate,
    amount: input.amount,
    principalAmount: input.principalAmount,
    interestAmount: input.interestAmount,
    escrowAmount: input.escrowAmount || null,
    remainingBalance,
    status: input.status || 'completed',
    notes: input.notes || null,
    recordedByUserId: actorUserId,
    createdAt: FieldValue.serverTimestamp(),
  };

  const batch = adminDb.batch();

  // Create the payment record
  batch.set(paymentRef, paymentData);

  // Update the mortgage current balance and next payment date
  const nextPaymentDate = calculateNextPaymentDate(
    mortgageData.nextPaymentDate,
    mortgageData.paymentFrequency
  );

  batch.update(mortgageRef, {
    currentBalance: remainingBalance,
    nextPaymentDate,
    updatedAt: FieldValue.serverTimestamp(),
    // Mark as paid off if balance is zero
    ...(remainingBalance <= 0 && { status: 'paid_off' }),
  });

  await batch.commit();

  return {
    id: paymentRef.id,
    ...paymentData,
    createdAt: new Date(),
  } as unknown as MortgagePayment;
}

/**
 * Get payment history for a mortgage
 */
export async function getPaymentHistory(mortgageId: string): Promise<MortgagePayment[]> {
  const paymentsSnap = await adminDb
    .collection('mortgages')
    .doc(mortgageId)
    .collection('payments')
    .orderBy('paymentDate', 'desc')
    .get();

  return paymentsSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as MortgagePayment[];
}

/**
 * Calculate the next payment date based on frequency
 */
function calculateNextPaymentDate(currentDate: string, frequency: string): string {
  const date = new Date(currentDate);

  switch (frequency) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'bi_weekly':
      date.setDate(date.getDate() + 14);
      break;
    case 'monthly':
    default:
      date.setMonth(date.getMonth() + 1);
      break;
  }

  return date.toISOString().slice(0, 10);
}

/**
 * Calculate monthly payment for a mortgage (P&I only)
 * Using standard amortization formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
 */
export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  termMonths: number
): number {
  if (annualRate === 0) {
    return Math.round(principal / termMonths);
  }

  const monthlyRate = annualRate / 100 / 12;
  const factor = Math.pow(1 + monthlyRate, termMonths);
  const payment = principal * (monthlyRate * factor) / (factor - 1);

  return Math.round(payment);
}

/**
 * Calculate amortization schedule for a mortgage
 */
export function calculateAmortizationSchedule(mortgage: Mortgage): AmortizationEntry[] {
  const schedule: AmortizationEntry[] = [];
  const monthlyRate = mortgage.interestRate / 100 / 12;
  let balance = mortgage.originalAmount;
  let cumulativeInterest = 0;
  const paymentDate = new Date(mortgage.firstPaymentDate);

  // Calculate how many payments have been made
  const paymentsRemaining = Math.ceil(balance / (mortgage.monthlyPayment - (balance * monthlyRate)));
  const totalPayments = Math.min(mortgage.termMonths, paymentsRemaining + schedule.length);

  for (let i = 1; i <= totalPayments && balance > 0; i++) {
    const interestPayment = Math.round(balance * monthlyRate);
    let principalPayment = mortgage.monthlyPayment - interestPayment;

    // Last payment adjustment
    if (principalPayment > balance) {
      principalPayment = balance;
    }

    balance = balance - principalPayment;
    cumulativeInterest += interestPayment;

    schedule.push({
      paymentNumber: i,
      paymentDate: paymentDate.toISOString().slice(0, 10),
      payment: mortgage.monthlyPayment,
      principal: principalPayment,
      interest: interestPayment,
      balance: Math.max(0, balance),
      cumulativeInterest,
    });

    // Move to next payment date
    paymentDate.setMonth(paymentDate.getMonth() + 1);
  }

  return schedule;
}

/**
 * Calculate remaining amortization from current balance
 */
export function calculateRemainingAmortization(mortgage: Mortgage): AmortizationEntry[] {
  const schedule: AmortizationEntry[] = [];
  const monthlyRate = mortgage.interestRate / 100 / 12;
  let balance = mortgage.currentBalance;
  let cumulativeInterest = 0;
  const paymentDate = new Date(mortgage.nextPaymentDate);
  let paymentNumber = 1;

  while (balance > 0) {
    const interestPayment = Math.round(balance * monthlyRate);
    let principalPayment = mortgage.monthlyPayment - interestPayment;

    // Last payment adjustment
    if (principalPayment > balance) {
      principalPayment = balance;
    }

    balance = balance - principalPayment;
    cumulativeInterest += interestPayment;

    schedule.push({
      paymentNumber,
      paymentDate: paymentDate.toISOString().slice(0, 10),
      payment: mortgage.monthlyPayment,
      principal: principalPayment,
      interest: interestPayment,
      balance: Math.max(0, balance),
      cumulativeInterest,
    });

    paymentDate.setMonth(paymentDate.getMonth() + 1);
    paymentNumber++;

    // Safety check to prevent infinite loops
    if (paymentNumber > mortgage.termMonths * 2) break;
  }

  return schedule;
}

/**
 * Calculate mortgage summary with projections
 */
export async function calculateMortgageSummary(mortgage: Mortgage): Promise<MortgageSummary> {
  // Get payment history to calculate paid amounts
  const payments = await getPaymentHistory(mortgage.id);

  const principalPaid = payments.reduce((sum, p) => sum + p.principalAmount, 0);
  const interestPaid = payments.reduce((sum, p) => sum + p.interestAmount, 0);

  // Calculate remaining schedule
  const remainingSchedule = calculateRemainingAmortization(mortgage);
  const remainingInterest = remainingSchedule.reduce((sum, e) => sum + e.interest, 0);
  const remainingPayments = remainingSchedule.length;

  // Calculate days until next payment
  const today = new Date();
  const nextPayment = new Date(mortgage.nextPaymentDate);
  const daysUntilPayment = Math.ceil(
    (nextPayment.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Calculate total cost and interest
  const totalInterest = interestPaid + remainingInterest;
  const totalCost = mortgage.originalAmount + totalInterest;

  // Calculate percent paid off
  const percentPaidOff = Math.round(
    ((mortgage.originalAmount - mortgage.currentBalance) / mortgage.originalAmount) * 100
  );

  // Get payoff date from last entry in remaining schedule
  const payoffDate = remainingSchedule.length > 0
    ? remainingSchedule[remainingSchedule.length - 1]?.paymentDate || ''
    : mortgage.maturityDate;

  return {
    currentBalance: mortgage.currentBalance,
    monthlyPayment: mortgage.monthlyPayment,
    nextPaymentDate: mortgage.nextPaymentDate,
    daysUntilPayment,
    principalPaid,
    interestPaid,
    percentPaidOff,
    remainingPayments,
    totalCost,
    totalInterest,
    remainingInterest,
    payoffDate,
  };
}

/**
 * Calculate savings from extra monthly payments
 */
export function calculateExtraPaymentSavings(
  mortgage: Mortgage,
  extraMonthly: number
): ExtraPaymentSavings {
  const monthlyRate = mortgage.interestRate / 100 / 12;
  let balance = mortgage.currentBalance;
  let months = 0;
  let totalInterest = 0;
  const newMonthlyPayment = mortgage.monthlyPayment + extraMonthly;
  const paymentDate = new Date(mortgage.nextPaymentDate);

  while (balance > 0) {
    const interestPayment = Math.round(balance * monthlyRate);
    let principalPayment = newMonthlyPayment - interestPayment;

    if (principalPayment > balance) {
      principalPayment = balance;
    }

    balance -= principalPayment;
    totalInterest += interestPayment;
    months++;
    paymentDate.setMonth(paymentDate.getMonth() + 1);

    // Safety check
    if (months > mortgage.termMonths * 2) break;
  }

  // Calculate original remaining interest
  const originalSchedule = calculateRemainingAmortization(mortgage);
  const originalInterest = originalSchedule.reduce((sum, e) => sum + e.interest, 0);
  const originalMonths = originalSchedule.length;

  return {
    extraMonthly,
    interestSaved: originalInterest - totalInterest,
    monthsSaved: originalMonths - months,
    newPayoffDate: paymentDate.toISOString().slice(0, 10),
  };
}

/**
 * Get unique lenders from all mortgages
 */
export async function getUniqueLenders(): Promise<string[]> {
  const snapshot = await adminDb.collection('mortgages').get();
  const lenders = new Set<string>();

  snapshot.docs.forEach((doc) => {
    const lender = doc.data().lender;
    if (lender) lenders.add(lender);
  });

  return Array.from(lenders).sort();
}
