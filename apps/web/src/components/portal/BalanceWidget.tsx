'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface TenantSummary {
  totalBalance: number;
  overdueAmount: number;
  nextDueDate: string | null;
  nextDueAmount: number;
  openChargesCount: number;
  activeLeaseCount: number;
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

export function BalanceWidget() {
  const [summary, setSummary] = useState<TenantSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSummary() {
      try {
        const res = await fetch('/api/portal/summary');
        const data = await res.json();
        if (data.ok) {
          setSummary(data.data);
        } else {
          setError(data.error || 'Failed to load summary');
        }
      } catch (err) {
        setError('Failed to load summary');
      } finally {
        setLoading(false);
      }
    }
    fetchSummary();
  }, []);

  if (loading) {
    return (
      <div className="p-6 border rounded-lg bg-muted/30 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/3 mb-4"></div>
        <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-muted rounded w-2/3"></div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="p-6 border rounded-lg border-destructive/50 bg-destructive/10">
        <p className="text-destructive">{error || 'Unable to load balance'}</p>
      </div>
    );
  }

  const hasOverdue = summary.overdueAmount > 0;

  return (
    <div className={`p-6 border rounded-lg ${hasOverdue ? 'border-destructive/50 bg-destructive/5' : 'bg-muted/30'}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Total Balance Due</h3>
          <p className={`text-3xl font-bold ${hasOverdue ? 'text-destructive' : ''}`}>
            {formatCurrency(summary.totalBalance)}
          </p>
        </div>
        {summary.activeLeaseCount > 0 && (
          <span className="text-sm text-muted-foreground">
            {summary.activeLeaseCount} active lease{summary.activeLeaseCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {hasOverdue && (
        <div className="mb-4 p-3 rounded bg-destructive/10 border border-destructive/20">
          <p className="text-sm font-medium text-destructive">
            {formatCurrency(summary.overdueAmount)} overdue
          </p>
          <p className="text-xs text-destructive/80">
            Please make a payment to avoid late fees
          </p>
        </div>
      )}

      {summary.nextDueDate && (
        <div className="text-sm">
          <span className="text-muted-foreground">Next payment: </span>
          <span className="font-medium">{formatCurrency(summary.nextDueAmount)}</span>
          <span className="text-muted-foreground"> due </span>
          <span className="font-medium">{formatDate(summary.nextDueDate)}</span>
        </div>
      )}

      {summary.openChargesCount > 0 && (
        <div className="mt-4 pt-4 border-t">
          <Link
            href="/portal/billing"
            className="text-sm text-primary hover:underline"
          >
            View {summary.openChargesCount} open charge{summary.openChargesCount !== 1 ? 's' : ''} →
          </Link>
        </div>
      )}
    </div>
  );
}
