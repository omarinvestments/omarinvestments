/**
 * Format cents to dollar string
 */
export function formatMoney(cents: number, currency = 'USD'): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(dollars);
}

/**
 * Parse dollar string to cents
 */
export function parseMoney(dollarString: string): number {
  const cleaned = dollarString.replace(/[^0-9.-]/g, '');
  const dollars = parseFloat(cleaned);
  if (isNaN(dollars)) return 0;
  return Math.round(dollars * 100);
}

/**
 * Convert dollars to cents
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Convert cents to dollars
 */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

/**
 * Add multiple cent amounts safely
 */
export function addCents(...amounts: number[]): number {
  return amounts.reduce((sum, amount) => sum + amount, 0);
}

/**
 * Calculate percentage of an amount
 */
export function calculatePercentage(amountCents: number, percentage: number): number {
  return Math.round((amountCents * percentage) / 100);
}

/**
 * Check if amounts balance (for double-entry accounting)
 */
export function amountsBalance(debits: number[], credits: number[]): boolean {
  const totalDebits = addCents(...debits);
  const totalCredits = addCents(...credits);
  return totalDebits === totalCredits;
}
