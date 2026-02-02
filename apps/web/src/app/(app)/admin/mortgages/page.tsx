'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

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
  maturityDate: string;
  nextPaymentDate: string;
  status: string;
}

interface LLC {
  id: string;
  legalName: string;
}

interface Summary {
  totalMortgages: number;
  activeMortgages: number;
  totalBalance: number;
  totalMonthlyPayments: number;
  avgInterestRate: number;
  propertiesWithMortgages: number;
}

function formatMoney(cents: number | null): string {
  if (cents === null) return '—';
  return '$' + (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 });
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr);
  return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  paid_off: 'bg-blue-100 text-blue-800',
  defaulted: 'bg-red-100 text-red-800',
  refinanced: 'bg-purple-100 text-purple-800',
};

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'paid_off', label: 'Paid Off' },
  { value: 'defaulted', label: 'Defaulted' },
  { value: 'refinanced', label: 'Refinanced' },
];

export default function AdminMortgagesPage() {
  const [mortgages, setMortgages] = useState<Mortgage[]>([]);
  const [lenders, setLenders] = useState<string[]>([]);
  const [llcs, setLlcs] = useState<LLC[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [llcFilter, setLlcFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [lenderFilter, setLenderFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLlcs = async () => {
    try {
      const res = await fetch('/api/llcs');
      const data = await res.json();
      if (data.ok) {
        setLlcs(data.data);
      }
    } catch {
      console.error('Failed to fetch LLCs');
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (llcFilter) params.set('llcId', llcFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (lenderFilter) params.set('lender', lenderFilter);

      const res = await fetch(`/api/admin/mortgages?${params.toString()}`);
      const data = await res.json();

      if (data.ok) {
        setMortgages(data.data.mortgages);
        setLenders(data.data.lenders);
        setSummary(data.data.summary);
      } else {
        setError(data.error?.message || 'Failed to fetch data');
      }
    } catch {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [llcFilter, statusFilter, lenderFilter]);

  useEffect(() => {
    fetchLlcs();
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Client-side search filter
  const filteredMortgages = mortgages.filter((m) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      m.propertyAddress.toLowerCase().includes(search) ||
      m.llcName.toLowerCase().includes(search) ||
      m.lender.toLowerCase().includes(search) ||
      (m.loanNumber && m.loanNumber.toLowerCase().includes(search))
    );
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link
          href="/admin"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to Admin
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Mortgages</h1>
        <Link
          href="/admin/mortgages/new"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm font-medium"
        >
          + Add Mortgage
        </Link>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-secondary/30 rounded-lg p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Balance</div>
            <div className="text-xl font-bold">{formatMoney(summary.totalBalance)}</div>
          </div>
          <div className="bg-secondary/30 rounded-lg p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Monthly Payments</div>
            <div className="text-xl font-bold">{formatMoney(summary.totalMonthlyPayments)}</div>
          </div>
          <div className="bg-secondary/30 rounded-lg p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Avg Rate</div>
            <div className="text-2xl font-bold">{summary.avgInterestRate}%</div>
          </div>
          <div className="bg-secondary/30 rounded-lg p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Active</div>
            <div className="text-2xl font-bold text-green-600">{summary.activeMortgages}</div>
          </div>
          <div className="bg-secondary/30 rounded-lg p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total</div>
            <div className="text-2xl font-bold">{summary.totalMortgages}</div>
          </div>
          <div className="bg-secondary/30 rounded-lg p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Properties</div>
            <div className="text-2xl font-bold">{summary.propertiesWithMortgages}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Search</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Address, lender, loan #..."
            className="px-3 py-2 border rounded-md text-sm w-48"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">LLC</label>
          <select
            value={llcFilter}
            onChange={(e) => setLlcFilter(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="">All LLCs</option>
            {llcs.map((llc) => (
              <option key={llc.id} value={llc.id}>
                {llc.legalName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Lender</label>
          <select
            value={lenderFilter}
            onChange={(e) => setLenderFilter(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="">All Lenders</option>
            {lenders.map((lender) => (
              <option key={lender} value={lender}>
                {lender}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-8 text-muted-foreground">Loading mortgages...</div>
      )}

      {/* Mortgages Table */}
      {!loading && (
        <>
          {filteredMortgages.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Property</th>
                      <th className="text-left px-4 py-3 font-medium">LLC</th>
                      <th className="text-left px-4 py-3 font-medium">Lender</th>
                      <th className="text-right px-4 py-3 font-medium">Balance</th>
                      <th className="text-center px-4 py-3 font-medium">Rate</th>
                      <th className="text-right px-4 py-3 font-medium">Monthly</th>
                      <th className="text-left px-4 py-3 font-medium">Next Due</th>
                      <th className="text-center px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMortgages.map((mortgage) => {
                      const daysUntil = getDaysUntil(mortgage.nextPaymentDate);
                      const isUrgent = mortgage.status === 'active' && daysUntil <= 5;

                      return (
                        <tr key={mortgage.id} className="border-t hover:bg-secondary/20">
                          <td className="px-4 py-3">
                            <Link
                              href={`/admin/mortgages/${mortgage.id}`}
                              className="hover:underline font-medium"
                            >
                              {mortgage.propertyAddress}
                            </Link>
                            {mortgage.loanNumber && (
                              <div className="text-xs text-muted-foreground">
                                Loan #{mortgage.loanNumber}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/llcs/${mortgage.llcId}`}
                              className="text-primary hover:underline"
                            >
                              {mortgage.llcName}
                            </Link>
                          </td>
                          <td className="px-4 py-3">{mortgage.lender}</td>
                          <td className="px-4 py-3 text-right font-medium">
                            {formatMoney(mortgage.currentBalance)}
                          </td>
                          <td className="px-4 py-3 text-center">{mortgage.interestRate}%</td>
                          <td className="px-4 py-3 text-right">
                            {formatMoney(mortgage.totalPayment)}
                          </td>
                          <td className="px-4 py-3">
                            <div className={isUrgent ? 'text-red-600 font-medium' : ''}>
                              {formatDate(mortgage.nextPaymentDate)}
                            </div>
                            {mortgage.status === 'active' && (
                              <div className={`text-xs ${isUrgent ? 'text-red-500' : 'text-muted-foreground'}`}>
                                {daysUntil === 0
                                  ? 'Due today'
                                  : daysUntil < 0
                                  ? `${Math.abs(daysUntil)} days overdue`
                                  : `in ${daysUntil} days`}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                STATUS_COLORS[mortgage.status] || 'bg-gray-100'
                              }`}
                            >
                              {mortgage.status.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 border rounded-lg">
              <svg
                className="w-12 h-12 mx-auto text-muted-foreground mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              <p className="text-muted-foreground mb-4">No mortgages found</p>
              <Link
                href="/admin/mortgages/new"
                className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm font-medium"
              >
                Add Your First Mortgage
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
