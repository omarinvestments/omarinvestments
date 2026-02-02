'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Mortgage {
  id: string;
  propertyId: string;
  llcId: string;
  propertyAddress: string;
  llcName: string;
  lender: string;
  loanNumber?: string;
  mortgageType: string;
  originalAmount: number;
  currentBalance: number;
  interestRate: number;
  termMonths: number;
  monthlyPayment: number;
  escrowAmount?: number;
  totalPayment: number;
  paymentFrequency: string;
  paymentDueDay: number;
  originationDate: string;
  firstPaymentDate: string;
  maturityDate: string;
  nextPaymentDate: string;
  escrowIncluded: boolean;
  propertyTaxAnnual?: number;
  insuranceAnnual?: number;
  status: string;
  notes?: string;
}

interface MortgageSummary {
  currentBalance: number;
  monthlyPayment: number;
  nextPaymentDate: string;
  daysUntilPayment: number;
  principalPaid: number;
  interestPaid: number;
  percentPaidOff: number;
  remainingPayments: number;
  totalCost: number;
  totalInterest: number;
  remainingInterest: number;
  payoffDate: string;
}

interface Payment {
  id: string;
  paymentDate: string;
  dueDate: string;
  amount: number;
  principalAmount: number;
  interestAmount: number;
  escrowAmount?: number;
  remainingBalance: number;
  status: string;
  notes?: string;
}

interface AmortizationEntry {
  paymentNumber: number;
  paymentDate: string;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
  cumulativeInterest: number;
}

function formatMoney(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '—';
  return '$' + (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 });
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  paid_off: 'bg-blue-100 text-blue-800',
  defaulted: 'bg-red-100 text-red-800',
  refinanced: 'bg-purple-100 text-purple-800',
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  late: 'bg-orange-100 text-orange-800',
  missed: 'bg-red-100 text-red-800',
};

export default function MortgageDetailPage({ params }: { params: Promise<{ mortgageId: string }> }) {
  const { mortgageId } = use(params);
  const router = useRouter();

  const [mortgage, setMortgage] = useState<Mortgage | null>(null);
  const [summary, setSummary] = useState<MortgageSummary | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [amortization, setAmortization] = useState<AmortizationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // UI state
  const [showAmortization, setShowAmortization] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [recordingPayment, setRecordingPayment] = useState(false);

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    paymentDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
    amount: 0,
    principalAmount: 0,
    interestAmount: 0,
    escrowAmount: 0,
    notes: '',
  });

  const fetchMortgageData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      // Fetch mortgage details and payments in parallel
      const [mortgageRes, paymentsRes] = await Promise.all([
        fetch(`/api/admin/mortgages/${mortgageId}`),
        fetch(`/api/admin/mortgages/${mortgageId}/payments`),
      ]);

      const mortgageData = await mortgageRes.json();
      const paymentsData = await paymentsRes.json();

      if (mortgageData.ok) {
        setMortgage(mortgageData.data.mortgage);
        setSummary(mortgageData.data.summary);

        // Pre-fill payment form with mortgage data
        const m = mortgageData.data.mortgage;
        setPaymentForm((prev) => ({
          ...prev,
          dueDate: m.nextPaymentDate,
          amount: m.totalPayment,
          principalAmount: 0, // Will be calculated
          interestAmount: 0, // Will be calculated
          escrowAmount: m.escrowAmount || 0,
        }));

        // Calculate principal and interest for next payment
        const monthlyRate = m.interestRate / 100 / 12;
        const interestPortion = Math.round(m.currentBalance * monthlyRate);
        const principalPortion = m.monthlyPayment - interestPortion;
        setPaymentForm((prev) => ({
          ...prev,
          interestAmount: interestPortion,
          principalAmount: principalPortion,
        }));
      } else {
        setError(mortgageData.error?.message || 'Failed to fetch mortgage');
      }

      if (paymentsData.ok) {
        setPayments(paymentsData.data.payments);
      }
    } catch {
      setError('Failed to fetch mortgage data');
    } finally {
      setLoading(false);
    }
  }, [mortgageId]);

  useEffect(() => {
    fetchMortgageData();
  }, [fetchMortgageData]);

  async function fetchAmortization() {
    try {
      const res = await fetch(`/api/admin/mortgages/${mortgageId}/amortization?type=remaining`);
      const data = await res.json();
      if (data.ok) {
        setAmortization(data.data.schedule);
      }
    } catch {
      console.error('Failed to fetch amortization');
    }
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    setRecordingPayment(true);

    try {
      const res = await fetch(`/api/admin/mortgages/${mortgageId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...paymentForm,
          status: 'completed',
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setShowPaymentModal(false);
        fetchMortgageData();
      } else {
        alert(data.error?.message || 'Failed to record payment');
      }
    } catch {
      alert('Failed to record payment');
    } finally {
      setRecordingPayment(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this mortgage? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/mortgages/${mortgageId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.ok) {
        router.push('/admin/mortgages');
      } else {
        alert(data.error?.message || 'Failed to delete mortgage');
      }
    } catch {
      alert('Failed to delete mortgage');
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-8 text-muted-foreground">Loading mortgage...</div>
      </div>
    );
  }

  if (error || !mortgage) {
    return (
      <div className="p-6">
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {error || 'Mortgage not found'}
        </div>
        <Link href="/admin/mortgages" className="text-primary hover:underline">
          &larr; Back to Mortgages
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/admin/mortgages"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to Mortgages
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{mortgage.propertyAddress}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${
                STATUS_COLORS[mortgage.status] || 'bg-gray-100'
              }`}
            >
              {mortgage.status.replace('_', ' ')}
            </span>
            <span className="text-muted-foreground">
              <Link href={`/llcs/${mortgage.llcId}`} className="hover:underline">
                {mortgage.llcName}
              </Link>
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {mortgage.status === 'active' && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm font-medium"
            >
              Record Payment
            </button>
          )}
          <Link
            href={`/admin/mortgages/${mortgageId}/edit`}
            className="px-4 py-2 border rounded-md hover:bg-secondary text-sm font-medium"
          >
            Edit
          </Link>
          <button
            onClick={handleDelete}
            className="px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50 text-sm font-medium"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-secondary/30 rounded-lg p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Current Balance
            </div>
            <div className="text-2xl font-bold">{formatMoney(summary.currentBalance)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {summary.percentPaidOff}% paid off
            </div>
          </div>
          <div className="bg-secondary/30 rounded-lg p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Next Payment
            </div>
            <div className="text-2xl font-bold">{formatMoney(mortgage.totalPayment)}</div>
            <div
              className={`text-xs mt-1 ${
                summary.daysUntilPayment <= 5 ? 'text-red-600 font-medium' : 'text-muted-foreground'
              }`}
            >
              {summary.daysUntilPayment === 0
                ? 'Due today'
                : summary.daysUntilPayment < 0
                ? `${Math.abs(summary.daysUntilPayment)} days overdue`
                : `in ${summary.daysUntilPayment} days`}
            </div>
          </div>
          <div className="bg-secondary/30 rounded-lg p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Principal Paid
            </div>
            <div className="text-2xl font-bold">{formatMoney(summary.principalPaid)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Interest paid: {formatMoney(summary.interestPaid)}
            </div>
          </div>
          <div className="bg-secondary/30 rounded-lg p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Est. Payoff Date
            </div>
            <div className="text-2xl font-bold">
              {formatDate(summary.payoffDate)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {summary.remainingPayments} payments left
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Loan Details */}
        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Loan Details</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Lender</dt>
              <dd className="font-medium">{mortgage.lender}</dd>
            </div>
            {mortgage.loanNumber && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Loan Number</dt>
                <dd className="font-medium">{mortgage.loanNumber}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Type</dt>
              <dd className="font-medium capitalize">{mortgage.mortgageType.replace('_', ' ')}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Original Amount</dt>
              <dd className="font-medium">{formatMoney(mortgage.originalAmount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Interest Rate</dt>
              <dd className="font-medium">{mortgage.interestRate}%</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Term</dt>
              <dd className="font-medium">
                {mortgage.termMonths} months ({Math.round(mortgage.termMonths / 12)} years)
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Origination Date</dt>
              <dd className="font-medium">{formatDate(mortgage.originationDate)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Maturity Date</dt>
              <dd className="font-medium">{formatDate(mortgage.maturityDate)}</dd>
            </div>
          </dl>
        </div>

        {/* Payment Details */}
        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Payment Details</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">P&I Payment</dt>
              <dd className="font-medium">{formatMoney(mortgage.monthlyPayment)}</dd>
            </div>
            {mortgage.escrowIncluded && mortgage.escrowAmount && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Escrow (Tax/Insurance)</dt>
                <dd className="font-medium">{formatMoney(mortgage.escrowAmount)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t pt-3">
              <dt className="text-muted-foreground font-medium">Total Payment</dt>
              <dd className="font-bold">{formatMoney(mortgage.totalPayment)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Payment Frequency</dt>
              <dd className="font-medium capitalize">{mortgage.paymentFrequency.replace('_', '-')}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Due Day</dt>
              <dd className="font-medium">{mortgage.paymentDueDay}th of month</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Next Payment</dt>
              <dd className="font-medium">{formatDate(mortgage.nextPaymentDate)}</dd>
            </div>
            {mortgage.escrowIncluded && (
              <>
                <div className="border-t pt-3">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                    Escrow Breakdown
                  </div>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Annual Property Tax</dt>
                  <dd className="font-medium">{formatMoney(mortgage.propertyTaxAnnual)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Annual Insurance</dt>
                  <dd className="font-medium">{formatMoney(mortgage.insuranceAnnual)}</dd>
                </div>
              </>
            )}
          </dl>
        </div>
      </div>

      {/* Cost Summary */}
      {summary && (
        <div className="border rounded-lg p-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">Lifetime Cost Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Total Interest (Lifetime)
              </div>
              <div className="text-xl font-bold">{formatMoney(summary.totalInterest)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Interest Remaining
              </div>
              <div className="text-xl font-bold">{formatMoney(summary.remainingInterest)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Total Cost (P+I)
              </div>
              <div className="text-xl font-bold">{formatMoney(summary.totalCost)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Remaining Payments
              </div>
              <div className="text-xl font-bold">{summary.remainingPayments}</div>
            </div>
          </div>
        </div>
      )}

      {/* Amortization Schedule */}
      <div className="border rounded-lg p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Amortization Schedule</h2>
          <button
            onClick={() => {
              if (!showAmortization) fetchAmortization();
              setShowAmortization(!showAmortization);
            }}
            className="text-sm text-primary hover:underline"
          >
            {showAmortization ? 'Hide' : 'Show'} Schedule
          </button>
        </div>
        {showAmortization && amortization.length > 0 && (
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">#</th>
                  <th className="text-left px-3 py-2 font-medium">Date</th>
                  <th className="text-right px-3 py-2 font-medium">Payment</th>
                  <th className="text-right px-3 py-2 font-medium">Principal</th>
                  <th className="text-right px-3 py-2 font-medium">Interest</th>
                  <th className="text-right px-3 py-2 font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {amortization.map((entry) => (
                  <tr key={entry.paymentNumber} className="border-t">
                    <td className="px-3 py-2">{entry.paymentNumber}</td>
                    <td className="px-3 py-2">{formatDate(entry.paymentDate)}</td>
                    <td className="px-3 py-2 text-right">{formatMoney(entry.payment)}</td>
                    <td className="px-3 py-2 text-right">{formatMoney(entry.principal)}</td>
                    <td className="px-3 py-2 text-right">{formatMoney(entry.interest)}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatMoney(entry.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment History */}
      <div className="border rounded-lg p-6 mt-6">
        <h2 className="text-lg font-semibold mb-4">Payment History</h2>
        {payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Date</th>
                  <th className="text-left px-3 py-2 font-medium">Due Date</th>
                  <th className="text-right px-3 py-2 font-medium">Amount</th>
                  <th className="text-right px-3 py-2 font-medium">Principal</th>
                  <th className="text-right px-3 py-2 font-medium">Interest</th>
                  <th className="text-right px-3 py-2 font-medium">Balance</th>
                  <th className="text-center px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-t">
                    <td className="px-3 py-2">{formatDate(payment.paymentDate)}</td>
                    <td className="px-3 py-2">{formatDate(payment.dueDate)}</td>
                    <td className="px-3 py-2 text-right">{formatMoney(payment.amount)}</td>
                    <td className="px-3 py-2 text-right">{formatMoney(payment.principalAmount)}</td>
                    <td className="px-3 py-2 text-right">{formatMoney(payment.interestAmount)}</td>
                    <td className="px-3 py-2 text-right font-medium">
                      {formatMoney(payment.remainingBalance)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          PAYMENT_STATUS_COLORS[payment.status] || 'bg-gray-100'
                        }`}
                      >
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No payments recorded yet.</p>
        )}
      </div>

      {/* Notes */}
      {mortgage.notes && (
        <div className="border rounded-lg p-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">Notes</h2>
          <p className="text-sm whitespace-pre-wrap">{mortgage.notes}</p>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Record Payment</h2>
            <form onSubmit={handleRecordPayment}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={paymentForm.paymentDate}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, paymentDate: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Due Date</label>
                  <input
                    type="date"
                    value={paymentForm.dueDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Principal ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={(paymentForm.principalAmount / 100).toFixed(2)}
                      onChange={(e) =>
                        setPaymentForm({
                          ...paymentForm,
                          principalAmount: Math.round(parseFloat(e.target.value || '0') * 100),
                        })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Interest ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={(paymentForm.interestAmount / 100).toFixed(2)}
                      onChange={(e) =>
                        setPaymentForm({
                          ...paymentForm,
                          interestAmount: Math.round(parseFloat(e.target.value || '0') * 100),
                        })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                      required
                    />
                  </div>
                </div>
                {mortgage.escrowIncluded && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Escrow ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={(paymentForm.escrowAmount / 100).toFixed(2)}
                      onChange={(e) =>
                        setPaymentForm({
                          ...paymentForm,
                          escrowAmount: Math.round(parseFloat(e.target.value || '0') * 100),
                        })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">Total Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={(paymentForm.amount / 100).toFixed(2)}
                    onChange={(e) =>
                      setPaymentForm({
                        ...paymentForm,
                        amount: Math.round(parseFloat(e.target.value || '0') * 100),
                      })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Expected: {formatMoney(mortgage.totalPayment)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                  <textarea
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    rows={2}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 border rounded-md hover:bg-secondary text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingPayment}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm font-medium disabled:opacity-50"
                >
                  {recordingPayment ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
