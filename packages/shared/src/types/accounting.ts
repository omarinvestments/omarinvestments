import { Timestamp } from './common';

/**
 * Ledger entry - double-entry accounting record
 */
export interface LedgerEntry {
  id: string;
  llcId: string;
  period: string; // YYYY-MM
  occurredAt: Timestamp;
  sourceType: LedgerSourceType;
  sourceId: string; // ID of payment, bill, etc.
  propertyId: string;
  unitId?: string;
  lines: LedgerLine[];
  memo?: string;
  createdByUserId: string;
  createdAt: Timestamp;
  locked: boolean;
}

export type LedgerSourceType =
  | 'rent_payment'
  | 'bill'
  | 'adjustment'
  | 'fee'
  | 'refund'
  | 'deposit'
  | 'opening_balance';

export interface LedgerLine {
  accountCode: string;
  accountName?: string;
  debit: number; // In cents
  credit: number; // In cents
  memo?: string;
}

/**
 * Account in chart of accounts
 */
export interface Account {
  code: string;
  name: string;
  type: AccountType;
  subtype?: string;
  description?: string;
  isSystem: boolean; // System accounts can't be deleted
}

export type AccountType =
  | 'asset'
  | 'liability'
  | 'equity'
  | 'revenue'
  | 'expense';

/**
 * Accounting period - for month close
 */
export interface AccountingPeriod {
  id: string; // Format: {llcId}_{YYYY-MM}
  llcId: string;
  period: string; // YYYY-MM
  status: 'open' | 'closed';
  closedAt?: Timestamp;
  closedByUserId?: string;
  reopenedAt?: Timestamp;
  reopenedByUserId?: string;
  reopenReason?: string;
}

/**
 * Audit log entry
 */
export interface AuditLog {
  id: string;
  llcId: string;
  actorUserId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  entityPath: string;
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
  ipAddress?: string;
  userAgent?: string;
  createdAt: Timestamp;
}

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'close_period'
  | 'reopen_period'
  | 'payment_received'
  | 'payment_failed'
  | 'refund_issued';
