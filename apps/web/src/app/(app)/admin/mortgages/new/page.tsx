'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface LLC {
  id: string;
  legalName: string;
}

interface Property {
  id: string;
  llcId: string;
  name?: string;
  address: {
    street1: string;
    city: string;
    state: string;
  };
}

const MORTGAGE_TYPES = [
  { value: 'fixed', label: 'Fixed Rate' },
  { value: 'adjustable', label: 'Adjustable Rate (ARM)' },
  { value: 'interest_only', label: 'Interest Only' },
  { value: 'balloon', label: 'Balloon' },
];

const PAYMENT_FREQUENCIES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'bi_weekly', label: 'Bi-Weekly' },
  { value: 'weekly', label: 'Weekly' },
];

export default function NewMortgagePage() {
  const router = useRouter();
  const [llcs, setLlcs] = useState<LLC[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    llcId: '',
    propertyId: '',
    lender: '',
    loanNumber: '',
    mortgageType: 'fixed',
    originalAmount: '',
    currentBalance: '',
    interestRate: '',
    termMonths: '360', // 30 years default
    monthlyPayment: '',
    escrowAmount: '',
    paymentFrequency: 'monthly',
    paymentDueDay: '1',
    originationDate: '',
    firstPaymentDate: '',
    maturityDate: '',
    nextPaymentDate: '',
    escrowIncluded: false,
    propertyTaxAnnual: '',
    insuranceAnnual: '',
    notes: '',
  });

  useEffect(() => {
    fetchLlcs();
    fetchProperties();
  }, []);

  useEffect(() => {
    // Filter properties when LLC changes
    if (form.llcId) {
      setFilteredProperties(properties.filter((p) => p.llcId === form.llcId));
    } else {
      setFilteredProperties(properties);
    }
    // Reset property selection when LLC changes
    setForm((prev) => ({ ...prev, propertyId: '' }));
  }, [form.llcId, properties]);

  async function fetchLlcs() {
    try {
      const res = await fetch('/api/llcs');
      const data = await res.json();
      if (data.ok) {
        setLlcs(data.data);
      }
    } catch {
      console.error('Failed to fetch LLCs');
    }
  }

  async function fetchProperties() {
    try {
      const res = await fetch('/api/admin/properties');
      const data = await res.json();
      if (data.ok) {
        // Map to the property format we need
        setProperties(
          data.data.properties.map((p: { id: string; llcId: string; name: string; address: string; city: string; state: string }) => ({
            id: p.id,
            llcId: p.llcId,
            name: p.name,
            address: {
              street1: p.address,
              city: p.city,
              state: p.state,
            },
          }))
        );
      }
    } catch {
      console.error('Failed to fetch properties');
    }
  }

  // Calculate maturity date when origination and term change
  useEffect(() => {
    if (form.originationDate && form.termMonths) {
      const origDate = new Date(form.originationDate);
      origDate.setMonth(origDate.getMonth() + parseInt(form.termMonths));
      setForm((prev) => ({
        ...prev,
        maturityDate: origDate.toISOString().slice(0, 10),
      }));
    }
  }, [form.originationDate, form.termMonths]);

  // Auto-calculate monthly payment when inputs change
  function calculateMonthlyPayment() {
    const principal = parseFloat(form.originalAmount) * 100 || 0;
    const annualRate = parseFloat(form.interestRate) || 0;
    const termMonths = parseInt(form.termMonths) || 360;

    if (principal <= 0 || termMonths <= 0) return;

    if (annualRate === 0) {
      const payment = principal / termMonths;
      setForm((prev) => ({ ...prev, monthlyPayment: (payment / 100).toFixed(2) }));
      return;
    }

    const monthlyRate = annualRate / 100 / 12;
    const factor = Math.pow(1 + monthlyRate, termMonths);
    const payment = principal * (monthlyRate * factor) / (factor - 1);
    setForm((prev) => ({ ...prev, monthlyPayment: (payment / 100).toFixed(2) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        llcId: form.llcId,
        propertyId: form.propertyId,
        lender: form.lender,
        loanNumber: form.loanNumber || undefined,
        mortgageType: form.mortgageType,
        originalAmount: Math.round(parseFloat(form.originalAmount) * 100),
        currentBalance: Math.round(parseFloat(form.currentBalance || form.originalAmount) * 100),
        interestRate: parseFloat(form.interestRate),
        termMonths: parseInt(form.termMonths),
        monthlyPayment: Math.round(parseFloat(form.monthlyPayment) * 100),
        escrowAmount: form.escrowAmount ? Math.round(parseFloat(form.escrowAmount) * 100) : undefined,
        paymentFrequency: form.paymentFrequency,
        paymentDueDay: parseInt(form.paymentDueDay),
        originationDate: form.originationDate,
        firstPaymentDate: form.firstPaymentDate,
        maturityDate: form.maturityDate,
        nextPaymentDate: form.nextPaymentDate,
        escrowIncluded: form.escrowIncluded,
        propertyTaxAnnual: form.propertyTaxAnnual
          ? Math.round(parseFloat(form.propertyTaxAnnual) * 100)
          : undefined,
        insuranceAnnual: form.insuranceAnnual
          ? Math.round(parseFloat(form.insuranceAnnual) * 100)
          : undefined,
        notes: form.notes || undefined,
      };

      const res = await fetch('/api/admin/mortgages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.ok) {
        router.push(`/admin/mortgages/${data.data.id}`);
      } else {
        setError(data.error?.message || 'Failed to create mortgage');
      }
    } catch {
      setError('Failed to create mortgage');
    } finally {
      setLoading(false);
    }
  }

  function getPropertyLabel(property: Property): string {
    return property.name || `${property.address.street1}, ${property.address.city}`;
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <Link
          href="/admin/mortgages"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to Mortgages
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">Add New Mortgage</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Property Selection */}
        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Property</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                LLC <span className="text-red-500">*</span>
              </label>
              <select
                value={form.llcId}
                onChange={(e) => setForm({ ...form, llcId: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                <option value="">Select LLC</option>
                {llcs.map((llc) => (
                  <option key={llc.id} value={llc.id}>
                    {llc.legalName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Property <span className="text-red-500">*</span>
              </label>
              <select
                value={form.propertyId}
                onChange={(e) => setForm({ ...form, propertyId: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                required
                disabled={!form.llcId}
              >
                <option value="">Select Property</option>
                {filteredProperties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {getPropertyLabel(property)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

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
                placeholder="e.g., Bank of America"
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
                placeholder="Optional"
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
                Term (months) <span className="text-red-500">*</span>
              </label>
              <select
                value={form.termMonths}
                onChange={(e) => setForm({ ...form, termMonths: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                <option value="60">5 Years (60 months)</option>
                <option value="84">7 Years (84 months)</option>
                <option value="120">10 Years (120 months)</option>
                <option value="180">15 Years (180 months)</option>
                <option value="240">20 Years (240 months)</option>
                <option value="300">25 Years (300 months)</option>
                <option value="360">30 Years (360 months)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Original Amount ($) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={form.originalAmount}
                onChange={(e) => setForm({ ...form, originalAmount: e.target.value })}
                onBlur={calculateMonthlyPayment}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="250000.00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Current Balance ($)</label>
              <input
                type="number"
                step="0.01"
                value={form.currentBalance}
                onChange={(e) => setForm({ ...form, currentBalance: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Leave blank if same as original"
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
                onBlur={calculateMonthlyPayment}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="6.5"
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
                placeholder="Auto-calculated or enter manually"
                required
              />
              <button
                type="button"
                onClick={calculateMonthlyPayment}
                className="text-xs text-primary hover:underline mt-1"
              >
                Calculate from loan terms
              </button>
            </div>
          </div>
        </div>

        {/* Payment Schedule */}
        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Payment Schedule</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Payment Frequency <span className="text-red-500">*</span>
              </label>
              <select
                value={form.paymentFrequency}
                onChange={(e) => setForm({ ...form, paymentFrequency: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                {PAYMENT_FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
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
          </div>
        </div>

        {/* Key Dates */}
        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Key Dates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Origination Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.originationDate}
                onChange={(e) => setForm({ ...form, originationDate: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                First Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.firstPaymentDate}
                onChange={(e) => setForm({ ...form, firstPaymentDate: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Maturity Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.maturityDate}
                onChange={(e) => setForm({ ...form, maturityDate: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Auto-calculated from origination + term
              </p>
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
                  placeholder="350.00"
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
                  placeholder="3000.00"
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
                  placeholder="1200.00"
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
            href="/admin/mortgages"
            className="px-4 py-2 border rounded-md hover:bg-secondary text-sm"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Mortgage'}
          </button>
        </div>
      </form>
    </div>
  );
}
