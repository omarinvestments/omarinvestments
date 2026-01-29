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
  appliedTo: {
    chargeId: string;
    amount: number;
  }[];
  memo?: string;
  createdAt: string;
}

interface Lease {
  id: string;
  status: string;
  unitId: string;
  tenantIds: string[];
  startDate: string;
  endDate: string;
  monthlyRent: number;
  propertyName?: string;
  unitLabel?: string;
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
  params: Promise<{ llcId: string }>;
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
  refunded: 'bg-gray-100 text-gray-600',
  canceled: 'bg-gray-100 text-gray-500',
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

export default function PaymentsPage({ params }: PaymentsPageProps) {
  const { llcId } = use(params);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [openCharges, setOpenCharges] = useState<OpenCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');

  // New payment form state
  const [showNewForm, setShowNewForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingCharges, setLoadingCharges] = useState(false);
  const [newPayment, setNewPayment] = useState({
    leaseId: '',
    tenantId: '',
    amount: '',
    paymentMethod: 'check' as string,
    checkNumber: '',
    memo: '',
    paymentDate: new Date().toISOString().split('T')[0],
  });

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const searchParams = new URLSearchParams();
      if (statusFilter) searchParams.set('status', statusFilter);

      const res = await fetch('/api/llcs/' + llcId + '/payments?' + searchParams.toString());
      const data = await res.json();

      if (data.ok) {
        setPayments(data.data);
      } else {
        setError(data.error?.message || 'Failed to load payments');
      }
    } catch {
      setError('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [llcId, statusFilter]);

  const fetchLeases = useCallback(async () => {
    try {
      const res = await fetch('/api/llcs/' + llcId + '/leases?status=active');
      const data = await res.json();
      if (data.ok) {
        setLeases(data.data);
      }
    } catch {
      // Silently fail
    }
  }, [llcId]);

  const fetchTenants = useCallback(async () => {
    try {
      const res = await fetch('/api/llcs/' + llcId + '/tenants');
      const data = await res.json();
      if (data.ok) {
        setTenants(data.data);
      }
    } catch {
      // Silently fail
    }
  }, [llcId]);

  const fetchChargesForLease = useCallback(async (leaseId: string) => {
    setLoadingCharges(true);
    try {
      const [openRes, partialRes] = await Promise.all([
        fetch('/api/llcs/' + llcId + '/charges?leaseId=' + leaseId + '&status=open'),
        fetch('/api/llcs/' + llcId + '/charges?leaseId=' + leaseId + '&status=partial'),
      ]);
      const openData = await openRes.json();
      const partialData = await partialRes.json();

      const allCharges = [
        ...(openData.ok ? openData.data : []),
        ...(partialData.ok ? partialData.data : []),
      ];
      setOpenCharges(allCharges);
    } catch {
      setOpenCharges([]);
    } finally {
      setLoadingCharges(false);
    }
  }, [llcId]);

  useEffect(() => {
    fetchPayments();
    fetchLeases();
    fetchTenants();
  }, [fetchPayments, fetchLeases, fetchTenants]);

  // When lease is selected, fetch its charges and set default tenant
  useEffect(() => {
    if (newPayment.leaseId) {
      fetchChargesForLease(newPayment.leaseId);

      // Find the lease and set its first tenant as default
      const selectedLease = leases.find(l => l.id === newPayment.leaseId);
      if (selectedLease && selectedLease.tenantIds.length > 0) {
        setNewPayment(prev => ({ ...prev, tenantId: selectedLease.tenantIds[0] || '' }));
      }
    } else {
      setOpenCharges([]);
    }
  }, [newPayment.leaseId, leases, fetchChargesForLease]);

  const getTenantName = (tenantId: string): string => {
    const tenant = tenants.find((t) => t.id === tenantId);
    if (!tenant) return 'Unknown';
    if (tenant.type === 'commercial') {
      return tenant.businessName || 'Unknown';
    }
    return `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim() || 'Unknown';
  };

  const getLeaseLabel = (lease: Lease): string => {
    const propertyName = lease.propertyName || 'Unknown Property';
    const unit = lease.unitLabel || '';
    const tenantNames = lease.tenantIds.map(id => getTenantName(id)).join(', ');
    return `${propertyName}${unit ? ' - ' + unit : ''} (${tenantNames})`;
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('/api/llcs/' + llcId + '/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaseId: newPayment.leaseId,
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
          leaseId: '',
          tenantId: '',
          amount: '',
          paymentMethod: 'check',
          checkNumber: '',
          memo: '',
          paymentDate: new Date().toISOString().split('T')[0],
        });
        setOpenCharges([]);
        fetchPayments(); // Refresh
      } else {
        alert(data.error?.message || 'Failed to record payment');
      }
    } catch {
      alert('Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate summary stats
  const stats = payments.reduce(
    (acc, payment) => {
      if (payment.status === 'succeeded') {
        acc.totalCollected += payment.amount;
        acc.successCount++;
      } else if (payment.status === 'refunded') {
        acc.totalRefunded += payment.amount;
        acc.refundCount++;
      }
      return acc;
    },
    { totalCollected: 0, successCount: 0, totalRefunded: 0, refundCount: 0 }
  );

  const totalOpenBalance = openCharges.reduce((sum, c) => sum + (c.amount - c.paidAmount), 0);

  // Get tenants for selected lease
  const selectedLease = leases.find(l => l.id === newPayment.leaseId);
  const leaseTenants = selectedLease
    ? tenants.filter(t => selectedLease.tenantIds.includes(t.id))
    : [];

  if (loading) {
    return <div className="text-muted-foreground">Loading payments...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href={'/llcs/' + llcId + '/billing'}
            className="text-muted-foreground hover:text-foreground"
          >
            &larr; Billing
          </Link>
          <h1 className="text-2xl font-bold">Payments</h1>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity text-sm"
        >
          + Record Payment
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">{error}</div>
      )}

      {/* New Payment Form */}
      {showNewForm && (
        <div className="border rounded-lg p-4 mb-6 bg-secondary/30">
          <h2 className="font-semibold mb-4">Record Manual Payment</h2>
          <form onSubmit={handleRecordPayment} className="space-y-4">
            {/* Lease Selection */}
            <div>
              <label className="block text-sm font-medium mb-1">Lease</label>
              <select
                value={newPayment.leaseId}
                onChange={(e) => setNewPayment((prev) => ({ ...prev, leaseId: e.target.value, tenantId: '' }))}
                className="w-full px-3 py-2 border rounded-md text-sm"
                required
              >
                <option value="">Select lease...</option>
                {leases.map((lease) => (
                  <option key={lease.id} value={lease.id}>
                    {getLeaseLabel(lease)}
                  </option>
                ))}
              </select>
            </div>

            {newPayment.leaseId && (
              <>
                {/* Open Balance for Selected Lease */}
                {loadingCharges ? (
                  <div className="text-sm text-muted-foreground">Loading charges...</div>
                ) : openCharges.length > 0 ? (
                  <div className="p-3 border rounded-md bg-background">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Open Balance</span>
                      <span className="text-lg font-bold text-red-600">{formatCurrency(totalOpenBalance)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {openCharges.length} open charge{openCharges.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 border rounded-md bg-green-50 text-green-700 text-sm">
                    No open charges for this lease
                  </div>
                )}

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
                      {leaseTenants.map((tenant) => (
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
                          <span>{formatCurrency(charge.amount - charge.paidAmount)}</span>
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
              </>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting || !newPayment.leaseId}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity text-sm disabled:opacity-50"
              >
                {submitting ? 'Recording...' : 'Record Payment'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewForm(false);
                  setNewPayment({
                    leaseId: '',
                    tenantId: '',
                    amount: '',
                    paymentMethod: 'check',
                    checkNumber: '',
                    memo: '',
                    paymentDate: new Date().toISOString().split('T')[0],
                  });
                  setOpenCharges([]);
                }}
                className="px-4 py-2 border rounded-md hover:bg-secondary transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Total Collected</div>
          <div className="text-xl font-bold text-green-600">{formatCurrency(stats.totalCollected)}</div>
          <div className="text-xs text-muted-foreground">{stats.successCount} payment{stats.successCount !== 1 ? 's' : ''}</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Refunded</div>
          <div className="text-xl font-bold text-gray-600">{formatCurrency(stats.totalRefunded)}</div>
          <div className="text-xs text-muted-foreground">{stats.refundCount} refund{stats.refundCount !== 1 ? 's' : ''}</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Net Collected</div>
          <div className="text-xl font-bold">{formatCurrency(stats.totalCollected - stats.totalRefunded)}</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Total Transactions</div>
          <div className="text-xl font-bold">{payments.length}</div>
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
          <option value="succeeded">Succeeded</option>
          <option value="processing">Processing</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
        {statusFilter && (
          <button
            onClick={() => setStatusFilter('')}
            className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Payments Table */}
      {payments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="mb-4">No payments found.</p>
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
                <th className="text-left px-4 py-3 font-medium">Method</th>
                <th className="text-left px-4 py-3 font-medium">Memo</th>
                <th className="text-right px-4 py-3 font-medium">Amount</th>
                <th className="text-center px-4 py-3 font-medium">Status</th>
                <th className="text-center px-4 py-3 font-medium">Applied To</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3">
                    {formatDate(payment.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                      {PAYMENT_METHOD_LABELS[payment.paymentMethod.type] || payment.paymentMethod.type}
                    </span>
                    {payment.paymentMethod.checkNumber && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        #{payment.paymentMethod.checkNumber}
                      </span>
                    )}
                    {payment.paymentMethod.last4 && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        ****{payment.paymentMethod.last4}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {payment.memo || '\u2014'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-green-600">
                    +{formatCurrency(payment.amount)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={'inline-block px-2 py-0.5 rounded text-xs capitalize ' + (STATUS_COLORS[payment.status] || 'bg-gray-100')}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-muted-foreground text-xs">
                    {payment.appliedTo.length} charge{payment.appliedTo.length !== 1 ? 's' : ''}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={'/llcs/' + llcId + '/leases/' + payment.leaseId}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors"
                        title="View Lease"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 text-xs text-muted-foreground">
        <span className="inline-block w-3 h-3 rounded bg-green-100 mr-1"></span> Succeeded
        <span className="inline-block w-3 h-3 rounded bg-yellow-100 ml-4 mr-1"></span> Processing
        <span className="inline-block w-3 h-3 rounded bg-red-100 ml-4 mr-1"></span> Failed
        <span className="inline-block w-3 h-3 rounded bg-gray-100 ml-4 mr-1"></span> Refunded
      </div>
    </div>
  );
}
