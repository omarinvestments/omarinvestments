'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { use } from 'react';

interface RenewLeasePageProps {
  params: Promise<{ llcId: string; leaseId: string }>;
}

interface OriginalLease {
  id: string;
  propertyId: string;
  unitId: string;
  tenantIds: string[];
  startDate: string;
  endDate: string;
  rentAmount: number;
  dueDay: number;
  depositAmount: number;
  status: string;
  terms?: {
    petPolicy?: string;
    petDeposit?: number;
    parkingSpaces?: number;
    utilitiesIncluded?: string[];
    specialTerms?: string;
  };
}

function formatMoney(cents: number): string {
  return '$' + (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 });
}

function addMonths(dateStr: string, months: number): string {
  const date = new Date(dateStr);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export default function RenewLeasePage({ params }: RenewLeasePageProps) {
  const { llcId, leaseId } = use(params);
  const router = useRouter();

  const [originalLease, setOriginalLease] = useState<OriginalLease | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rentAmount, setRentAmount] = useState('');
  const [rentChangeReason, setRentChangeReason] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    async function fetchLease() {
      try {
        const res = await fetch(`/api/llcs/${llcId}/leases/${leaseId}`);
        const data = await res.json();

        if (data.ok) {
          const lease = data.data as OriginalLease;
          setOriginalLease(lease);

          // Pre-fill form with suggested values
          // New lease starts day after old lease ends
          const newStartDate = addDays(lease.endDate, 1);
          const newEndDate = addMonths(newStartDate, 12); // Default to 12-month renewal

          setStartDate(newStartDate);
          setEndDate(newEndDate);
          setRentAmount((lease.rentAmount / 100).toString());
          setDueDay(lease.dueDay.toString());
        } else {
          setError(data.error?.message || 'Failed to load lease');
        }
      } catch {
        setError('Failed to load lease');
      } finally {
        setLoading(false);
      }
    }

    fetchLease();
  }, [llcId, leaseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch(`/api/llcs/${llcId}/leases/${leaseId}/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          rentAmount: Math.round(parseFloat(rentAmount) * 100),
          rentChangeReason: rentChangeReason || undefined,
          dueDay: parseInt(dueDay),
          notes: notes || undefined,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        // Redirect to the new lease
        router.push(`/llcs/${llcId}/leases/${data.data.id}`);
      } else {
        setError(data.error?.message || 'Failed to renew lease');
      }
    } catch {
      setError('Failed to renew lease');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading lease...</div>;
  }

  if (error && !originalLease) {
    return <div className="text-destructive">{error}</div>;
  }

  if (!originalLease) {
    return <div className="text-destructive">Lease not found</div>;
  }

  if (originalLease.status !== 'active') {
    return (
      <div className="max-w-2xl">
        <Link
          href={`/llcs/${llcId}/leases/${leaseId}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          &larr; Back to Lease
        </Link>
        <div className="mt-6 p-4 bg-destructive/10 text-destructive rounded-md">
          Only active leases can be renewed. This lease is currently &quot;{originalLease.status}&quot;.
        </div>
      </div>
    );
  }

  const originalRentCents = originalLease.rentAmount;
  const newRentCents = Math.round(parseFloat(rentAmount || '0') * 100);
  const rentDiff = newRentCents - originalRentCents;
  const rentChangePercent = originalRentCents > 0 ? ((rentDiff / originalRentCents) * 100).toFixed(1) : '0';

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link
          href={`/llcs/${llcId}/leases/${leaseId}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          &larr; Back to Lease
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-2">Renew Lease</h1>
      <p className="text-muted-foreground mb-6">
        Create a new lease that continues from the current one. The original lease will be marked as ended.
      </p>

      {/* Original Lease Summary */}
      <div className="mb-6 p-4 bg-secondary/30 rounded-md text-sm space-y-2">
        <h2 className="font-medium text-base mb-3">Original Lease</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-muted-foreground">Current Period:</span>
            <div>{originalLease.startDate.slice(0, 10)} to {originalLease.endDate.slice(0, 10)}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Current Rent:</span>
            <div>{formatMoney(originalLease.rentAmount)}/month</div>
          </div>
          <div>
            <span className="text-muted-foreground">Due Day:</span>
            <div>{originalLease.dueDay}th of each month</div>
          </div>
          <div>
            <span className="text-muted-foreground">Tenants:</span>
            <div>{originalLease.tenantIds.length} tenant{originalLease.tenantIds.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
            {error}
          </div>
        )}

        {/* New Lease Dates */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium">New Lease Terms</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium mb-2">
                Start Date *
              </label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Day after original lease ends
              </p>
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium mb-2">
                End Date *
              </label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="rentAmount" className="block text-sm font-medium mb-2">
                Monthly Rent ($) *
              </label>
              <input
                id="rentAmount"
                type="number"
                step="0.01"
                min="0"
                value={rentAmount}
                onChange={(e) => setRentAmount(e.target.value)}
                required
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {rentDiff !== 0 && (
                <p className={`text-xs mt-1 ${rentDiff > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {rentDiff > 0 ? '+' : ''}{formatMoney(rentDiff)} ({rentChangePercent}%)
                </p>
              )}
            </div>
            <div>
              <label htmlFor="dueDay" className="block text-sm font-medium mb-2">
                Due Day (1-28)
              </label>
              <input
                id="dueDay"
                type="number"
                min="1"
                max="28"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {rentDiff !== 0 && (
            <div>
              <label htmlFor="rentChangeReason" className="block text-sm font-medium mb-2">
                Reason for Rent Change
              </label>
              <input
                id="rentChangeReason"
                type="text"
                value={rentChangeReason}
                onChange={(e) => setRentChangeReason(e.target.value)}
                placeholder="e.g., Annual increase, market adjustment"
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          <div>
            <label htmlFor="notes" className="block text-sm font-medium mb-2">
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any additional notes for this renewal..."
              className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
        </div>

        {/* Preview */}
        <div className="p-4 border rounded-md bg-green-50 border-green-200">
          <h3 className="font-medium text-green-800 mb-2">Renewal Preview</h3>
          <div className="text-sm text-green-700 space-y-1">
            <div>New lease period: {startDate} to {endDate}</div>
            <div>New rent: {formatMoney(newRentCents)}/month</div>
            <div>Original lease will be marked as &quot;ended&quot;</div>
            <div>Same property, unit, and tenants will be carried over</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={submitting || !startDate || !endDate || !rentAmount}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? 'Creating Renewal...' : 'Create Renewal Lease'}
          </button>
          <Link
            href={`/llcs/${llcId}/leases/${leaseId}`}
            className="px-6 py-2 border border-input rounded-md hover:bg-secondary transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
