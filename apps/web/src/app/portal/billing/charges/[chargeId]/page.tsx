'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChargeType, ChargeStatus } from '@shared/types';

interface TenantCharge {
  id: string;
  llcId: string;
  leaseId: string;
  propertyAddress: string;
  unitNumber: string;
  period: string;
  type: ChargeType;
  description?: string;
  amount: number;
  paidAmount: number;
  balance: number;
  status: ChargeStatus;
  dueDate: string;
  createdAt: string;
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

function getStatusBadge(status: ChargeStatus) {
  const styles: Record<ChargeStatus, string> = {
    open: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    partial: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    void: 'bg-muted text-muted-foreground',
  };
  return (
    <span className={`px-3 py-1 text-sm rounded-full font-medium ${styles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function getChargeTypeLabel(type: ChargeType): string {
  const labels: Record<ChargeType, string> = {
    rent: 'Rent',
    late_fee: 'Late Fee',
    utility: 'Utility',
    deposit: 'Deposit',
    pet_deposit: 'Pet Deposit',
    pet_rent: 'Pet Rent',
    parking: 'Parking',
    damage: 'Damage',
    other: 'Other',
  };
  return labels[type] || type;
}

function ChargeDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const chargeId = params.chargeId as string;
  const llcId = searchParams.get('llcId');

  const [charge, setCharge] = useState<TenantCharge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCharge() {
      if (!llcId) {
        setError('Missing LLC ID');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/portal/billing/charges/${chargeId}?llcId=${llcId}`);
        const data = await res.json();
        if (data.ok) {
          setCharge(data.data);
        } else {
          setError(data.error || 'Failed to load charge');
        }
      } catch (err) {
        setError('Failed to load charge');
      } finally {
        setLoading(false);
      }
    }
    fetchCharge();
  }, [chargeId, llcId]);

  if (loading) {
    return (
      <div>
        <Link
          href="/portal/billing"
          className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block"
        >
          ← Back to Billing
        </Link>
        <div className="space-y-4">
          <div className="h-8 bg-muted/30 rounded w-1/3 animate-pulse" />
          <div className="h-64 bg-muted/30 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !charge) {
    return (
      <div>
        <Link
          href="/portal/billing"
          className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block"
        >
          ← Back to Billing
        </Link>
        <div className="p-6 border rounded-lg border-destructive/50 bg-destructive/10">
          <p className="text-destructive">{error || 'Charge not found'}</p>
        </div>
      </div>
    );
  }

  const isOverdue = charge.status === 'open' && new Date(charge.dueDate) < new Date();

  return (
    <div>
      <Link
        href="/portal/billing"
        className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block"
      >
        ← Back to Billing
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{getChargeTypeLabel(charge.type)}</h1>
          <p className="text-muted-foreground">{charge.propertyAddress} - Unit {charge.unitNumber}</p>
        </div>
        {getStatusBadge(charge.status)}
      </div>

      {/* Overdue Warning */}
      {isOverdue && (
        <div className="p-4 mb-6 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-sm font-medium text-destructive">
            This charge is overdue. Please make a payment to avoid additional fees.
          </p>
        </div>
      )}

      {/* Details Card */}
      <div className="border rounded-lg p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
          <div>
            <p className="text-sm text-muted-foreground">Period</p>
            <p className="font-medium">{charge.period}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Due Date</p>
            <p className={`font-medium ${isOverdue ? 'text-destructive' : ''}`}>
              {formatDate(charge.dueDate)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Created</p>
            <p className="font-medium">{formatDate(charge.createdAt.slice(0, 10))}</p>
          </div>
        </div>

        {charge.description && (
          <div className="mb-6 pb-6 border-b">
            <p className="text-sm text-muted-foreground mb-1">Description</p>
            <p>{charge.description}</p>
          </div>
        )}

        {/* Amount Summary */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Charge Amount</span>
            <span className="font-medium">{formatCurrency(charge.amount)}</span>
          </div>
          {charge.paidAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount Paid</span>
              <span className="font-medium text-green-600 dark:text-green-400">
                -{formatCurrency(charge.paidAmount)}
              </span>
            </div>
          )}
          <div className="flex justify-between pt-3 border-t">
            <span className="font-semibold">Balance Due</span>
            <span className={`font-bold text-lg ${charge.balance > 0 ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}>
              {formatCurrency(charge.balance)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChargeDetailPage() {
  return (
    <Suspense fallback={
      <div>
        <div className="h-4 bg-muted/30 rounded w-24 mb-4 animate-pulse" />
        <div className="h-8 bg-muted/30 rounded w-1/3 mb-6 animate-pulse" />
        <div className="h-64 bg-muted/30 rounded animate-pulse" />
      </div>
    }>
      <ChargeDetailContent />
    </Suspense>
  );
}
