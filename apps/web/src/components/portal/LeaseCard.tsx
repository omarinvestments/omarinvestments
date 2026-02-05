'use client';

import Link from 'next/link';
import { LeaseStatus } from '@shared/types';

interface LeaseCardProps {
  lease: {
    id: string;
    llcId: string;
    propertyAddress: string;
    unitNumber: string;
    rentAmount: number;
    dueDay: number;
    startDate: string;
    endDate: string;
    status: LeaseStatus;
    balance: {
      totalCharges: number;
      totalPaid: number;
      balance: number;
      overdueAmount: number;
    };
  };
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getStatusBadge(status: LeaseStatus) {
  const styles: Record<LeaseStatus, string> = {
    draft: 'bg-muted text-muted-foreground',
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    ended: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    eviction: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    terminated: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${styles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function getDaySuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

export function LeaseCard({ lease }: LeaseCardProps) {
  const hasBalance = lease.balance.balance > 0;
  const hasOverdue = lease.balance.overdueAmount > 0;

  return (
    <Link
      href={`/portal/leases/${lease.id}?llcId=${lease.llcId}`}
      className="block p-6 border rounded-lg hover:border-primary transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-lg">{lease.propertyAddress}</h3>
          <p className="text-sm text-muted-foreground">Unit {lease.unitNumber}</p>
        </div>
        {getStatusBadge(lease.status)}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <span className="text-muted-foreground">Monthly Rent</span>
          <p className="font-medium">{formatCurrency(lease.rentAmount)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Due Day</span>
          <p className="font-medium">{lease.dueDay}{getDaySuffix(lease.dueDay)} of month</p>
        </div>
        <div>
          <span className="text-muted-foreground">Start Date</span>
          <p className="font-medium">{formatDate(lease.startDate)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">End Date</span>
          <p className="font-medium">{formatDate(lease.endDate)}</p>
        </div>
      </div>

      {hasBalance && (
        <div className={`p-3 rounded ${hasOverdue ? 'bg-destructive/10' : 'bg-muted/50'}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Current Balance</span>
            <span className={`font-semibold ${hasOverdue ? 'text-destructive' : ''}`}>
              {formatCurrency(lease.balance.balance)}
            </span>
          </div>
          {hasOverdue && (
            <p className="text-xs text-destructive mt-1">
              {formatCurrency(lease.balance.overdueAmount)} overdue
            </p>
          )}
        </div>
      )}
    </Link>
  );
}
