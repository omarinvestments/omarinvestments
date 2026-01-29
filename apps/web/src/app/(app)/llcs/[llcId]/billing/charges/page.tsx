'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { use } from 'react';

interface Charge {
  id: string;
  leaseId: string;
  period: string;
  type: string;
  description?: string;
  amount: number;
  paidAmount: number;
  status: string;
  dueDate: string;
  linkedChargeId?: string;
  voidedAt?: string;
  voidReason?: string;
  createdAt: string;
}

interface ChargesPageProps {
  params: Promise<{ llcId: string }>;
}

const CHARGE_TYPES: Record<string, string> = {
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

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  partial: 'bg-blue-100 text-blue-800',
  void: 'bg-gray-100 text-gray-500',
};

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function formatDate(iso: string): string {
  const dateStr = iso.substring(0, 10);
  const parts = dateStr.split('-').map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (!year || !month || !day) return iso;
  return new Date(year, month - 1, day).toLocaleDateString();
}

function isOverdue(dueDate: string, status: string): boolean {
  if (status === 'paid' || status === 'void') return false;
  const today = new Date().toISOString().split('T')[0];
  return dueDate < (today || '');
}

export default function ChargesPage({ params }: ChargesPageProps) {
  const { llcId } = use(params);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  const fetchCharges = useCallback(async () => {
    setLoading(true);
    try {
      const searchParams = new URLSearchParams();
      if (statusFilter) searchParams.set('status', statusFilter);
      if (typeFilter) searchParams.set('type', typeFilter);

      const res = await fetch(`/api/llcs/${llcId}/charges?${searchParams.toString()}`);
      const data = await res.json();

      if (data.ok) {
        setCharges(data.data);
      } else {
        setError(data.error?.message || 'Failed to load charges');
      }
    } catch {
      setError('Failed to load charges');
    } finally {
      setLoading(false);
    }
  }, [llcId, statusFilter, typeFilter]);

  useEffect(() => {
    fetchCharges();
  }, [fetchCharges]);

  // Calculate summary stats
  const stats = charges.reduce(
    (acc, charge) => {
      if (charge.status !== 'void') {
        acc.totalAmount += charge.amount;
        acc.totalPaid += charge.paidAmount;
      }
      if (charge.status === 'open' || charge.status === 'partial') {
        acc.openCount++;
        acc.openAmount += charge.amount - charge.paidAmount;
        if (isOverdue(charge.dueDate, charge.status)) {
          acc.overdueCount++;
          acc.overdueAmount += charge.amount - charge.paidAmount;
        }
      }
      return acc;
    },
    { totalAmount: 0, totalPaid: 0, openCount: 0, openAmount: 0, overdueCount: 0, overdueAmount: 0 }
  );

  if (loading) {
    return <div className="text-muted-foreground">Loading charges...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/llcs/${llcId}/billing`}
            className="text-muted-foreground hover:text-foreground"
          >
            &larr; Billing
          </Link>
          <h1 className="text-2xl font-bold">Charges</h1>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">{error}</div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Total Billed</div>
          <div className="text-xl font-bold">{formatCurrency(stats.totalAmount)}</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Total Collected</div>
          <div className="text-xl font-bold text-green-600">{formatCurrency(stats.totalPaid)}</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Outstanding</div>
          <div className={`text-xl font-bold ${stats.openAmount > 0 ? 'text-yellow-600' : ''}`}>
            {formatCurrency(stats.openAmount)}
          </div>
          <div className="text-xs text-muted-foreground">{stats.openCount} open charge{stats.openCount !== 1 ? 's' : ''}</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Overdue</div>
          <div className={`text-xl font-bold ${stats.overdueAmount > 0 ? 'text-red-600' : ''}`}>
            {formatCurrency(stats.overdueAmount)}
          </div>
          <div className="text-xs text-muted-foreground">{stats.overdueCount} overdue charge{stats.overdueCount !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-md bg-background text-sm"
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
          <option value="void">Void</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border rounded-md bg-background text-sm"
        >
          <option value="">All Types</option>
          {Object.entries(CHARGE_TYPES).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        {(statusFilter || typeFilter) && (
          <button
            onClick={() => { setStatusFilter(''); setTypeFilter(''); }}
            className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Charges Table */}
      {charges.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No charges found.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Due Date</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Description</th>
                <th className="text-left px-4 py-3 font-medium">Period</th>
                <th className="text-right px-4 py-3 font-medium">Amount</th>
                <th className="text-right px-4 py-3 font-medium">Paid</th>
                <th className="text-right px-4 py-3 font-medium">Balance</th>
                <th className="text-center px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {charges.map((charge) => {
                const balance = charge.amount - charge.paidAmount;
                const overdue = isOverdue(charge.dueDate, charge.status);

                return (
                  <tr key={charge.id} className={`hover:bg-secondary/30 transition-colors ${charge.status === 'void' ? 'opacity-50' : ''}`}>
                    <td className={`px-4 py-3 ${overdue ? 'text-red-600 font-medium' : ''}`}>
                      {formatDate(charge.dueDate)}
                      {overdue && <span className="ml-1 text-xs">(overdue)</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                        {CHARGE_TYPES[charge.type] || charge.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {charge.description || '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {charge.period}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCurrency(charge.amount)}
                    </td>
                    <td className="px-4 py-3 text-right text-green-600">
                      {charge.paidAmount > 0 ? formatCurrency(charge.paidAmount) : '—'}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${balance > 0 && charge.status !== 'void' ? 'text-red-600' : ''}`}>
                      {charge.status === 'void' ? '—' : formatCurrency(balance)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs capitalize ${STATUS_COLORS[charge.status] || 'bg-gray-100'}`}>
                        {charge.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/llcs/${llcId}/leases/${charge.leaseId}`}
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors"
                          title="View Lease"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </Link>
                        <Link
                          href={`/llcs/${llcId}/leases/${charge.leaseId}/payments`}
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors"
                          title="Payment History"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 text-xs text-muted-foreground">
        <span className="inline-block w-3 h-3 rounded bg-yellow-100 mr-1"></span> Open
        <span className="inline-block w-3 h-3 rounded bg-blue-100 ml-4 mr-1"></span> Partial
        <span className="inline-block w-3 h-3 rounded bg-green-100 ml-4 mr-1"></span> Paid
        <span className="inline-block w-3 h-3 rounded bg-gray-100 ml-4 mr-1"></span> Void
      </div>
    </div>
  );
}
