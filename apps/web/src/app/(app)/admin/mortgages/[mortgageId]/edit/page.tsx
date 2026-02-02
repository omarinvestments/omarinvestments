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

const MORTGAGE_TYPES = [
  { value: 'fixed', label: 'Fixed Rate' },
  { value: 'adjustable', label: 'Adjustable Rate (ARM)' },
  { value: 'interest_only', label: 'Interest Only' },
  { value: 'balloon', label: 'Balloon' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'paid_off', label: 'Paid Off' },
  { value: 'defaulted', label: 'Defaulted' },
  { value: 'refinanced', label: 'Refinanced' },
];

export default function EditMortgagePage({ params }: { params: Promise<{ mortgageId: string }> }) {
  const { mortgageId } = use(params);
  const router = useRouter();

  const [mortgage, setMortgage] = useState<Mortgage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    lender: '',
    loanNumber: '',
    mortgageType: 'fixed',
    currentBalance: '',
    interestRate: '',
    monthlyPayment: '',
    escrowAmount: '',
    paymentDueDay: '1',
    nextPaymentDate: '',
    escrowIncluded: false,
    propertyTaxAnnual: '',
    insuranceAnnual: '',
    status: 'active',
    notes: '',
  });

  const fetchMortgage = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/mortgages/${mortgageId}`);
      const data = await res.json();

      if (data.ok) {
        const m = data.data.mortgage;
        setMortgage(m);
        setForm({
          lender: m.lender,
          loanNumber: m.loanNumber || '',
          mortgageType: m.mortgageType,
          currentBalance: (m.currentBalance / 100).toFixed(2),
          interestRate: m.interestRate.toString(),
          monthlyPayment: (m.monthlyPayment / 100).toFixed(2),
          escrowAmount: m.escrowAmount ? (m.escrowAmount / 100).toFixed(2) : '',
          paymentDueDay: m.paymentDueDay.toString(),
          nextPaymentDate: m.nextPaymentDate,
          escrowIncluded: m.escrowIncluded,
          propertyTaxAnnual: m.propertyTaxAnnual ? (m.propertyTaxAnnual / 100).toFixed(2) : '',
          insuranceAnnual: m.insuranceAnnual ? (m.insuranceAnnual / 100).toFixed(2) : '',
          status: m.status,
          notes: m.notes || '',
        });
      } else {
        setError(data.error?.message || 'Failed to fetch mortgage');
      }
    } catch {
      setError('Failed to fetch mortgage');
    } finally {
      setLoading(false);
    }
  }, [mortgageId]);

  useEffect(() => {
    fetchMortgage();
  }, [fetchMortgage]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload: Record<string, unknown> = {
        lender: form.lender,
        mortgageType: form.mortgageType,
        currentBalance: Math.round(parseFloat(form.currentBalance) * 100),
        interestRate: parseFloat(form.interestRate),
        monthlyPayment: Math.round(parseFloat(form.monthlyPayment) * 100),
        paymentDueDay: parseInt(form.paymentDueDay),
        nextPaymentDate: form.nextPaymentDate,
        escrowIncluded: form.escrowIncluded,
        status: form.status,
      };

      if (form.loanNumber) payload.loanNumber = form.loanNumber;
      if (form.escrowAmount) payload.escrowAmount = Math.round(parseFloat(form.escrowAmount) * 100);
      if (form.propertyTaxAnnual) payload.propertyTaxAnnual = Math.round(parseFloat(form.propertyTaxAnnual) * 100);
      if (form.insuranceAnnual) payload.insuranceAnnual = Math.round(parseFloat(form.insuranceAnnual) * 100);
      if (form.notes) payload.notes = form.notes;

      const res = await fetch(`/api/admin/mortgages/${mortgageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.ok) {
        router.push(`/admin/mortgages/${mortgageId}`);
      } else {
        setError(data.error?.message || 'Failed to update mortgage');
      }
    } catch {
      setError('Failed to update mortgage');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-8 text-muted-foreground">Loading mortgage...</div>
      </div>
    );
  }

  if (!mortgage) {
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
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <Link
          href={`/admin/mortgages/${mortgageId}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to Mortgage Details
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-2">Edit Mortgage</h1>
      <p className="text-muted-foreground mb-6">{mortgage.propertyAddress}</p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Lender Info */}
        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Lender Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Lender Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.lender}
                onChange={(e) => setForm({ ...form, lender: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Loan Number</label>
              <input
                type="text"
                value={form.loanNumber}
                onChange={(e) => setForm({ ...form, loanNumber: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>
        </div>

        {/* Loan Terms */}
        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Loan Terms</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Mortgage Type <span className="text-red-500">*</span>
              </label>
              <select
                value={form.mortgageType}
                onChange={(e) => setForm({ ...form, mortgageType: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                {MORTGAGE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Current Balance ($) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={form.currentBalance}
                onChange={(e) => setForm({ ...form, currentBalance: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Interest Rate (%) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.001"
                value={form.interestRate}
                onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Monthly P&I Payment ($) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={form.monthlyPayment}
                onChange={(e) => setForm({ ...form, monthlyPayment: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Payment Due Day <span className="text-red-500">*</span>
              </label>
              <select
                value={form.paymentDueDay}
                onChange={(e) => setForm({ ...form, paymentDueDay: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Next Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.nextPaymentDate}
                onChange={(e) => setForm({ ...form, nextPaymentDate: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
          </div>
        </div>

        {/* Escrow Details */}
        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Escrow Details</h2>
          <div className="mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.escrowIncluded}
                onChange={(e) => setForm({ ...form, escrowIncluded: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm font-medium">Escrow included in payment</span>
            </label>
          </div>
          {form.escrowIncluded && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Monthly Escrow ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.escrowAmount}
                  onChange={(e) => setForm({ ...form, escrowAmount: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Annual Property Tax ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.propertyTaxAnnual}
                  onChange={(e) => setForm({ ...form, propertyTaxAnnual: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Annual Insurance ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.insuranceAnnual}
                  onChange={(e) => setForm({ ...form, insuranceAnnual: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Notes</h2>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            rows={3}
            placeholder="Any additional notes about this mortgage..."
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link
            href={`/admin/mortgages/${mortgageId}`}
            className="px-4 py-2 border rounded-md hover:bg-secondary text-sm"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
