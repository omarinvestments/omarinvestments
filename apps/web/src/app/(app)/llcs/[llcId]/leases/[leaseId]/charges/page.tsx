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
  lateFeeAppliedAt?: string;
  lateFeeChargeId?: string;
  voidedAt?: string;
  voidReason?: string;
  createdAt: string;
}

interface LateFeeSettings {
  lateFeeEnabled: boolean;
  lateFeeGraceDays?: number;
}

interface BalanceSummary {
  totalCharges: number;
  totalPaid: number;
  balance: number;
  overdueAmount: number;
  openCharges: number;
}

interface ChargesPageProps {
  params: Promise<{ llcId: string; leaseId: string }>;
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-800',
  partial: 'bg-orange-100 text-orange-800',
  paid: 'bg-green-100 text-green-800',
  void: 'bg-gray-100 text-gray-500 line-through',
};

const TYPE_LABELS: Record<string, string> = {
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

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatMoney(cents: number): string {
  return '$' + (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 });
}

export default function ChargesPage({ params }: ChargesPageProps) {
  const { llcId, leaseId } = use(params);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [balance, setBalance] = useState<BalanceSummary | null>(null);
  const [lateFeeSettings, setLateFeeSettings] = useState<LateFeeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New charge form state
  const [newCharge, setNewCharge] = useState({
    type: 'rent' as string,
    description: '',
    amount: '',
    dueDate: '',
    period: new Date().toISOString().slice(0, 7), // YYYY-MM
  });

  const fetchData = useCallback(async () => {
    try {
      const [chargesRes, balanceRes, settingsRes] = await Promise.all([
        fetch(`/api/llcs/${llcId}/charges?leaseId=${leaseId}`),
        fetch(`/api/llcs/${llcId}/leases/${leaseId}/balance`),
        fetch(`/api/llcs/${llcId}/settings/late-fees`),
      ]);

      const chargesData = await chargesRes.json();
      const balanceData = await balanceRes.json();
      const settingsData = await settingsRes.json();

      if (chargesData.ok) {
        setCharges(chargesData.data);
      } else {
        setError(chargesData.error?.message || 'Failed to load charges');
      }

      if (balanceData.ok) {
        setBalance(balanceData.data);
      }

      if (settingsData.ok) {
        setLateFeeSettings(settingsData.data);
      }
    } catch {
      setError('Failed to load charges');
    } finally {
      setLoading(false);
    }
  }, [llcId, leaseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch(`/api/llcs/${llcId}/charges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaseId,
          type: newCharge.type,
          description: newCharge.description || undefined,
          amount: Math.round(parseFloat(newCharge.amount) * 100),
          dueDate: new Date(newCharge.dueDate).toISOString(),
          period: newCharge.period,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setCharges((prev) => [data.data, ...prev]);
        setShowNewForm(false);
        setNewCharge({
          type: 'rent',
          description: '',
          amount: '',
          dueDate: '',
          period: new Date().toISOString().slice(0, 7),
        });
        fetchData(); // Refresh balance
      } else {
        alert(data.error?.message || 'Failed to create charge');
      }
    } catch {
      alert('Failed to create charge');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoidCharge = async (chargeId: string) => {
    const reason = prompt('Enter reason for voiding this charge:');
    if (!reason) return;

    try {
      const res = await fetch(`/api/llcs/${llcId}/charges/${chargeId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      const data = await res.json();

      if (data.ok) {
        setCharges((prev) =>
          prev.map((c) => (c.id === chargeId ? { ...c, status: 'void', voidReason: reason } : c))
        );
        fetchData(); // Refresh balance
      } else {
        alert(data.error?.message || 'Failed to void charge');
      }
    } catch {
      alert('Failed to void charge');
    }
  };

  const handleApplyLateFee = async (chargeId: string) => {
    if (!confirm('Apply late fee to this charge?')) return;

    try {
      const res = await fetch(`/api/llcs/${llcId}/charges/${chargeId}/apply-late-fee`, {
        method: 'POST',
      });

      const data = await res.json();

      if (data.ok) {
        alert(`Late fee of ${formatMoney(data.data.lateFeeAmount)} applied successfully`);
        fetchData();
      } else {
        alert(data.error?.message || 'Failed to apply late fee');
      }
    } catch {
      alert('Failed to apply late fee');
    }
  };

  // Helper to check if a charge is eligible for late fee
  const canApplyLateFee = (charge: Charge): boolean => {
    if (!lateFeeSettings?.lateFeeEnabled) return false;
    if (charge.type === 'late_fee') return false;
    if (charge.status === 'paid' || charge.status === 'void') return false;
    if (charge.lateFeeAppliedAt) return false;

    const today = new Date();
    const dueDate = new Date(charge.dueDate);
    const graceDays = lateFeeSettings.lateFeeGraceDays ?? 5;
    const graceCutoff = new Date(dueDate);
    graceCutoff.setDate(graceCutoff.getDate() + graceDays);

    return today > graceCutoff;
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading charges...</div>;
  }

  if (error) {
    return <div className="text-destructive">{error}</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href={`/llcs/${llcId}/leases/${leaseId}`}
            className="text-sm text-muted-foreground hover:underline"
          >
            &larr; Back to Lease
          </Link>
          <h1 className="text-2xl font-bold mt-2">Charges</h1>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/llcs/${llcId}/leases/${leaseId}/payments`}
            className="px-4 py-2 border rounded-md hover:bg-secondary transition-colors text-sm"
          >
            View Payments
          </Link>
          <button
            onClick={() => setShowNewForm(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity text-sm"
          >
            + New Charge
          </button>
        </div>
      </div>

      {/* Balance Summary */}
      {balance && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Total Charges</div>
            <div className="text-xl font-bold">{formatMoney(balance.totalCharges)}</div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Total Paid</div>
            <div className="text-xl font-bold text-green-600">{formatMoney(balance.totalPaid)}</div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Balance Due</div>
            <div className={`text-xl font-bold ${balance.balance > 0 ? 'text-red-600' : ''}`}>
              {formatMoney(balance.balance)}
            </div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Overdue</div>
            <div className={`text-xl font-bold ${balance.overdueAmount > 0 ? 'text-red-600' : ''}`}>
              {formatMoney(balance.overdueAmount)}
            </div>
          </div>
        </div>
      )}

      {/* New Charge Form */}
      {showNewForm && (
        <div className="border rounded-lg p-4 mb-6 bg-secondary/30">
          <h2 className="font-semibold mb-4">Create New Charge</h2>
          <form onSubmit={handleCreateCharge} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={newCharge.type}
                  onChange={(e) => setNewCharge((prev) => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  required
                >
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Period (YYYY-MM)</label>
                <input
                  type="month"
                  value={newCharge.period}
                  onChange={(e) => setNewCharge((prev) => ({ ...prev, period: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={newCharge.amount}
                  onChange={(e) => setNewCharge((prev) => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Due Date</label>
                <input
                  type="date"
                  value={newCharge.dueDate}
                  onChange={(e) => setNewCharge((prev) => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description (optional)</label>
              <input
                type="text"
                value={newCharge.description}
                onChange={(e) => setNewCharge((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md text-sm"
                placeholder="Additional notes..."
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity text-sm disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Charge'}
              </button>
              <button
                type="button"
                onClick={() => setShowNewForm(false)}
                className="px-4 py-2 border rounded-md hover:bg-secondary transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Charges Table */}
      {charges.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No charges yet for this lease.</p>
          <button
            onClick={() => setShowNewForm(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity text-sm"
          >
            Create First Charge
          </button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Due Date</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Period</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Amount</th>
                <th className="text-right px-4 py-3 font-medium">Paid</th>
                <th className="text-right px-4 py-3 font-medium">Balance</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {charges.map((charge) => {
                const remaining = charge.amount - charge.paidAmount;
                const isOverdue =
                  (charge.status === 'open' || charge.status === 'partial') &&
                  new Date(charge.dueDate) < new Date();

                return (
                  <tr
                    key={charge.id}
                    className={`hover:bg-secondary/30 transition-colors ${charge.status === 'void' ? 'opacity-60' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                        {formatDate(charge.dueDate)}
                      </span>
                      {isOverdue && <span className="ml-2 text-xs text-red-600">(Overdue)</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div>{TYPE_LABELS[charge.type] || charge.type}</div>
                      {charge.description && (
                        <div className="text-xs text-muted-foreground">{charge.description}</div>
                      )}
                      {charge.linkedChargeId && (
                        <div className="text-xs text-muted-foreground">(Late fee)</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{charge.period}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs ${STATUS_COLORS[charge.status] || 'bg-gray-100 text-gray-800'}`}
                      >
                        {charge.status}
                      </span>
                      {charge.voidReason && (
                        <div className="text-xs text-muted-foreground mt-1">{charge.voidReason}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">{formatMoney(charge.amount)}</td>
                    <td className="px-4 py-3 text-right text-green-600">
                      {formatMoney(charge.paidAmount)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right ${remaining > 0 && charge.status !== 'void' ? 'text-red-600 font-medium' : ''}`}
                    >
                      {charge.status === 'void' ? '—' : formatMoney(remaining)}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {canApplyLateFee(charge) && (
                        <button
                          onClick={() => handleApplyLateFee(charge.id)}
                          className="text-xs text-orange-600 hover:text-orange-800"
                        >
                          Late Fee
                        </button>
                      )}
                      {charge.lateFeeAppliedAt && charge.type !== 'late_fee' && (
                        <span className="text-xs text-muted-foreground">Fee applied</span>
                      )}
                      {charge.status === 'open' && (
                        <button
                          onClick={() => handleVoidCharge(charge.id)}
                          className="text-xs text-muted-foreground hover:text-destructive"
                        >
                          Void
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
