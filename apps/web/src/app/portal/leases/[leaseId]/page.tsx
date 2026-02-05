'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LeaseStatus } from '@shared/types';
import { BillingTable } from '@/components/portal';

interface TenantLease {
  id: string;
  llcId: string;
  llcName: string;
  propertyId: string;
  propertyAddress: string;
  unitId: string;
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
    openCharges: number;
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
    month: 'long',
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
    <span className={`px-3 py-1 text-sm rounded-full font-medium ${styles[status]}`}>
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

function LeaseDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const leaseId = params.leaseId as string;
  const llcId = searchParams.get('llcId');

  const [lease, setLease] = useState<TenantLease | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLease() {
      if (!llcId) {
        setError('Missing LLC ID');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/portal/leases/${leaseId}?llcId=${llcId}`);
        const data = await res.json();
        if (data.ok) {
          setLease(data.data);
        } else {
          setError(data.error || 'Failed to load lease');
        }
      } catch (err) {
        setError('Failed to load lease');
      } finally {
        setLoading(false);
      }
    }
    fetchLease();
  }, [leaseId, llcId]);

  if (loading) {
    return (
      <div>
        <Link
          href="/portal/leases"
          className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block"
        >
          ← Back to My Leases
        </Link>
        <div className="space-y-4">
          <div className="h-8 bg-muted/30 rounded w-1/3 animate-pulse" />
          <div className="h-64 bg-muted/30 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !lease) {
    return (
      <div>
        <Link
          href="/portal/leases"
          className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block"
        >
          ← Back to My Leases
        </Link>
        <div className="p-6 border rounded-lg border-destructive/50 bg-destructive/10">
          <p className="text-destructive">{error || 'Lease not found'}</p>
        </div>
      </div>
    );
  }

  const hasBalance = lease.balance.balance > 0;
  const hasOverdue = lease.balance.overdueAmount > 0;

  return (
    <div>
      <Link
        href="/portal/leases"
        className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block"
      >
        ← Back to My Leases
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{lease.propertyAddress}</h1>
          <p className="text-muted-foreground">Unit {lease.unitNumber}</p>
        </div>
        {getStatusBadge(lease.status)}
      </div>

      {/* Balance Card */}
      {hasBalance && (
        <div className={`p-6 rounded-lg mb-6 ${hasOverdue ? 'bg-destructive/10 border border-destructive/20' : 'bg-muted/30'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className={`text-2xl font-bold ${hasOverdue ? 'text-destructive' : ''}`}>
                {formatCurrency(lease.balance.balance)}
              </p>
            </div>
            {hasOverdue && (
              <div className="text-right">
                <p className="text-sm text-destructive">Overdue Amount</p>
                <p className="text-xl font-semibold text-destructive">
                  {formatCurrency(lease.balance.overdueAmount)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lease Details */}
      <div className="border rounded-lg p-6 mb-8">
        <h2 className="font-semibold mb-4">Lease Details</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-muted-foreground">Monthly Rent</p>
            <p className="font-medium">{formatCurrency(lease.rentAmount)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Due Day</p>
            <p className="font-medium">{lease.dueDay}{getDaySuffix(lease.dueDay)} of each month</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Lease Start</p>
            <p className="font-medium">{formatDate(lease.startDate)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Lease End</p>
            <p className="font-medium">{formatDate(lease.endDate)}</p>
          </div>
        </div>
      </div>

      {/* Billing History for this Lease */}
      <div className="border rounded-lg p-6">
        <h2 className="font-semibold mb-4">Billing History</h2>
        <BillingTable leaseId={lease.id} />
      </div>
    </div>
  );
}

export default function LeaseDetailPage() {
  return (
    <Suspense fallback={
      <div>
        <div className="h-4 bg-muted/30 rounded w-24 mb-4 animate-pulse" />
        <div className="h-8 bg-muted/30 rounded w-1/3 mb-6 animate-pulse" />
        <div className="h-64 bg-muted/30 rounded animate-pulse" />
      </div>
    }>
      <LeaseDetailContent />
    </Suspense>
  );
}
