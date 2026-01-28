'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { use } from 'react';

interface Payment {
  id: string;
  leaseId: string;
  tenantId: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: {
    type: string;
    checkNumber?: string;
    last4?: string;
    brand?: string;
    bankName?: string;
  };
  appliedTo: { chargeId: string; amount: number }[];
  memo?: string;
  createdAt: string;
}

interface Tenant {
  id: string;
  type: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
}

interface OpenCharge {
  id: string;
  type: string;
  period: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
}

interface PaymentsPageProps {
  params: Promise<{ llcId: string; leaseId: string }>;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  check: 'Check',
  money_order: 'Money Order',
  bank_transfer: 'Bank Transfer',
  card: 'Card',
  us_bank_account: 'Bank Account',
  other: 'Other',
};

const STATUS_COLORS: Record<string, string> = {
  succeeded: 'bg-green-100 text-green-800',
  processing: 'bg-yellow-100 text-yellow-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-500',
};

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatMoney(cents: number): string {
  return '$' + (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 });
}

export default function PaymentsPage({ params }: PaymentsPageProps) {
  const { llcId, leaseId } = use(params);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [openCharges, setOpenCharges] = useState<OpenCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New payment form state
  const [newPayment, setNewPayment] = useState({
    tenantId: '',
    amount: '',
    paymentMethod: 'check' as string,
    checkNumber: '',
    memo: '',
    paymentDate: new Date().toISOString().split('T')[0],
  });

  const fetchData = useCallback(async () => {
    try {
      const [paymentsRes, tenantsRes, chargesRes] = await Promise.all([
        fetch(`/api/llcs/${llcId}/payments?leaseId=${leaseId}`),
        fetch(`/api/llcs/${llcId}/tenants`),
        fetch(`/api/llcs/${llcId}/charges?leaseId=${leaseId}&status=open`),
      ]);

      const paymentsData = await paymentsRes.json();
      const tenantsData = await tenantsRes.json();
      const chargesData = await chargesRes.json();

      if (paymentsData.ok) {
        setPayments(paymentsData.data);
      } else {
        setError(paymentsData.error?.message || 'Failed to load payments');
      }

      if (tenantsData.ok) {
        setTenants(tenantsData.data);
        // Set default tenant if only one
        if (tenantsData.data.length === 1 && tenantsData.data[0]) {
          setNewPayment((prev) => ({ ...prev, tenantId: tenantsData.data[0].id }));
        }
      }

      if (chargesData.ok) {
        // Also fetch partial charges
        const partialRes = await fetch(`/api/llcs/${llcId}/charges?leaseId=${leaseId}&status=partial`);
        const partialData = await partialRes.json();
        const allOpen = [...chargesData.data, ...(partialData.ok ? partialData.data : [])];
        setOpenCharges(allOpen);
      }
    } catch {
      setError('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [llcId, leaseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getTenantName = (tenantId: string): string => {
    const tenant = tenants.find((t) => t.id === tenantId);
    if (!tenant) return 'Unknown';
    if (tenant.type === 'commercial') {
      return tenant.businessName || 'Unknown';
    }
    return `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim() || 'Unknown';
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch(`/api/llcs/${llcId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaseId,
          tenantId: newPayment.tenantId,
          amount: Math.round(parseFloat(newPayment.amount) * 100),
          paymentMethod: newPayment.paymentMethod,
          checkNumber: newPayment.checkNumber || undefined,
          memo: newPayment.memo || undefined,
          paymentDate: newPayment.paymentDate ? new Date(newPayment.paymentDate).toISOString() : new Date().toISOString(),
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setPayments((prev) => [data.data, ...prev]);
        setShowNewForm(false);
        setNewPayment({
          tenantId: tenants.length === 1 && tenants[0] ? tenants[0].id : '',
          amount: '',
          paymentMethod: 'check',
          checkNumber: '',
          memo: '',
          paymentDate: new Date().toISOString().split('T')[0],
        });
        fetchData(); // Refresh charges
      } else {
        alert(data.error?.message || 'Failed to record payment');
      }
    } catch {
      alert('Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading payments...</div>;
  }

  if (error) {
    return <div className="text-destructive">{error}</div>;
  }

  const totalOpenBalance = openCharges.reduce((sum, c) => sum + (c.amount - c.paidAmount), 0);

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
          <h1 className="text-2xl font-bold mt-2">Payments</h1>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/llcs/${llcId}/leases/${leaseId}/charges`}
            className="px-4 py-2 border rounded-md hover:bg-secondary transition-colors text-sm"
          >
            View Charges
          </Link>
          <button
            onClick={() => setShowNewForm(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity text-sm"
          >
            + Record Payment
          </button>
        </div>
      </div>

      {/* Open Balance Summary */}
      {openCharges.length > 0 && (
        <div className="border rounded-lg p-4 mb-6 bg-secondary/30">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Open Balance</div>
              <div className="text-xl font-bold text-red-600">{formatMoney(totalOpenBalance)}</div>
            </div>
            <div className="text-sm text-muted-foreground">
              {openCharges.length} open charge{openCharges.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      )}

      {/* New Payment Form */}
      {showNewForm && (
        <div className="border rounded-lg p-4 mb-6 bg-secondary/30">
          <h2 className="font-semibold mb-4">Record Manual Payment</h2>
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tenant</label>
                <select
                  value={newPayment.tenantId}
                  onChange={(e) => setNewPayment((prev) => ({ ...prev, tenantId: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  required
                >
                  <option value="">Select tenant...</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {getTenantName(tenant.id)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Payment Method</label>
                <select
                  value={newPayment.paymentMethod}
                  onChange={(e) =>
                    setNewPayment((prev) => ({ ...prev, paymentMethod: e.target.value }))
                  }
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  required
                >
                  <option value="check">Check</option>
                  <option value="cash">Cash</option>
                  <option value="money_order">Money Order</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment((prev) => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Payment Date</label>
                <input
                  type="date"
                  value={newPayment.paymentDate}
                  onChange={(e) =>
                    setNewPayment((prev) => ({ ...prev, paymentDate: e.target.value }))
                  }
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  required
                />
              </div>
              {newPayment.paymentMethod === 'check' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Check Number</label>
                  <input
                    type="text"
                    value={newPayment.checkNumber}
                    onChange={(e) =>
                      setNewPayment((prev) => ({ ...prev, checkNumber: e.target.value }))
                    }
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    placeholder="Optional"
                  />
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Memo (optional)</label>
              <input
                type="text"
                value={newPayment.memo}
                onChange={(e) => setNewPayment((prev) => ({ ...prev, memo: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md text-sm"
                placeholder="Additional notes..."
              />
            </div>

            {/* Open Charges Preview */}
            {openCharges.length > 0 && (
              <div className="text-sm text-muted-foreground border-t pt-4">
                <div className="font-medium mb-2">Payment will be applied to oldest charges first:</div>
                <ul className="space-y-1">
                  {openCharges.slice(0, 5).map((charge) => (
                    <li key={charge.id} className="flex justify-between">
                      <span>
                        {charge.type} ({charge.period}) - Due {formatDate(charge.dueDate)}
                      </span>
                      <span>{formatMoney(charge.amount - charge.paidAmount)}</span>
                    </li>
                  ))}
                  {openCharges.length > 5 && (
                    <li className="text-muted-foreground">
                      ...and {openCharges.length - 5} more charges
                    </li>
                  )}
                </ul>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity text-sm disabled:opacity-50"
              >
                {submitting ? 'Recording...' : 'Record Payment'}
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

      {/* Payments Table */}
      {payments.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No payments recorded for this lease.</p>
          <button
            onClick={() => setShowNewForm(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity text-sm"
          >
            Record First Payment
          </button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Tenant</th>
                <th className="text-left px-4 py-3 font-medium">Method</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Amount</th>
                <th className="text-left px-4 py-3 font-medium">Applied To</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3">{formatDate(payment.createdAt)}</td>
                  <td className="px-4 py-3">{getTenantName(payment.tenantId)}</td>
                  <td className="px-4 py-3">
                    <div>{PAYMENT_METHOD_LABELS[payment.paymentMethod.type] || payment.paymentMethod.type}</div>
                    {payment.paymentMethod.checkNumber && (
                      <div className="text-xs text-muted-foreground">
                        #{payment.paymentMethod.checkNumber}
                      </div>
                    )}
                    {payment.paymentMethod.last4 && (
                      <div className="text-xs text-muted-foreground">
                        ****{payment.paymentMethod.last4}
                      </div>
                    )}
                    {payment.memo && (
                      <div className="text-xs text-muted-foreground">{payment.memo}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs ${STATUS_COLORS[payment.status] || 'bg-gray-100 text-gray-800'}`}
                    >
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-green-600">
                    {formatMoney(payment.amount)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {payment.appliedTo.length > 0
                      ? `${payment.appliedTo.length} charge${payment.appliedTo.length !== 1 ? 's' : ''}`
                      : 'Not applied'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
