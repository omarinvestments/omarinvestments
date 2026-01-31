'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface AdminLease {
  id: string;
  llcId: string;
  llcName: string;
  propertyId: string;
  propertyAddress: string;
  propertyType: string;
  unitId: string;
  unitNumber: string;
  tenantNames: string[];
  tenantIds: string[];
  startDate: string;
  endDate: string;
  rentAmount: number;
  dueDay: number;
  depositAmount: number;
  status: string;
  amountOverdue: number;
  lastPaymentDate: string | null;
  lastPaymentAmount: number | null;
  daysUntilExpiry: number | null;
}

interface LLC {
  id: string;
  legalName: string;
}

function formatMoney(cents: number): string {
  return '$' + (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 });
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  expired: 'bg-gray-100 text-gray-800',
  terminated: 'bg-red-100 text-red-800',
  pending: 'bg-yellow-100 text-yellow-800',
};

const PROPERTY_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'mixed', label: 'Mixed Use' },
  { value: 'industrial', label: 'Industrial' },
];

const LEASE_STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'terminated', label: 'Terminated' },
  { value: 'pending', label: 'Pending' },
];

export default function AdminLeasesPage() {
  const [leases, setLeases] = useState<AdminLease[]>([]);
  const [llcs, setLlcs] = useState<LLC[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [llcFilter, setLlcFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('');
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

  const fetchLeases = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (llcFilter) params.set('llcId', llcFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (propertyTypeFilter) params.set('propertyType', propertyTypeFilter);

      const res = await fetch(`/api/admin/leases?${params.toString()}`);
      const data = await res.json();

      if (data.ok) {
        setLeases(data.data);
      } else {
        setError(data.error?.message || 'Failed to fetch leases');
      }
    } catch {
      setError('Failed to fetch leases');
    } finally {
      setLoading(false);
    }
  }, [llcFilter, statusFilter, propertyTypeFilter]);

  useEffect(() => {
    fetchLlcs();
  }, []);

  useEffect(() => {
    fetchLeases();
  }, [fetchLeases]);

  // Client-side search filter
  const filteredLeases = leases.filter(lease => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      lease.tenantNames.some(n => n.toLowerCase().includes(search)) ||
      lease.propertyAddress.toLowerCase().includes(search) ||
      lease.unitNumber.toLowerCase().includes(search) ||
      lease.llcName.toLowerCase().includes(search)
    );
  });

  // Summary stats
  const totalLeases = filteredLeases.length;
  const activeLeases = filteredLeases.filter(l => l.status === 'active').length;
  const totalOverdue = filteredLeases.reduce((sum, l) => sum + l.amountOverdue, 0);
  const totalMonthlyRent = filteredLeases
    .filter(l => l.status === 'active')
    .reduce((sum, l) => sum + l.rentAmount, 0);

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

      <h1 className="text-2xl font-bold mb-6">All Leases</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-secondary/30 rounded-lg p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Leases</div>
          <div className="text-2xl font-bold">{totalLeases}</div>
        </div>
        <div className="bg-secondary/30 rounded-lg p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Active Leases</div>
          <div className="text-2xl font-bold text-green-600">{activeLeases}</div>
        </div>
        <div className="bg-secondary/30 rounded-lg p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Monthly Rent (Active)</div>
          <div className="text-2xl font-bold">{formatMoney(totalMonthlyRent)}</div>
        </div>
        <div className="bg-secondary/30 rounded-lg p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Overdue</div>
          <div className={`text-2xl font-bold ${totalOverdue > 0 ? 'text-red-600' : ''}`}>
            {formatMoney(totalOverdue)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Search</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tenant, property, unit..."
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
            {llcs.map(llc => (
              <option key={llc.id} value={llc.id}>{llc.legalName}</option>
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
            {LEASE_STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Property Type</label>
          <select
            value={propertyTypeFilter}
            onChange={(e) => setPropertyTypeFilter(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            {PROPERTY_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
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
        <div className="text-center py-8 text-muted-foreground">Loading leases...</div>
      )}

      {/* Table */}
      {!loading && filteredLeases.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">LLC</th>
                  <th className="text-left px-4 py-3 font-medium">Property</th>
                  <th className="text-left px-4 py-3 font-medium">Unit</th>
                  <th className="text-left px-4 py-3 font-medium">Tenant(s)</th>
                  <th className="text-right px-4 py-3 font-medium">Rent</th>
                  <th className="text-center px-4 py-3 font-medium">Due Day</th>
                  <th className="text-right px-4 py-3 font-medium">Overdue</th>
                  <th className="text-left px-4 py-3 font-medium">Last Payment</th>
                  <th className="text-left px-4 py-3 font-medium">Lease End</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeases.map((lease) => (
                  <tr key={lease.id} className="border-t hover:bg-secondary/20">
                    <td className="px-4 py-3">
                      <Link
                        href={`/llcs/${lease.llcId}`}
                        className="text-primary hover:underline"
                      >
                        {lease.llcName}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/llcs/${lease.llcId}/properties/${lease.propertyId}`}
                        className="hover:underline"
                      >
                        {lease.propertyAddress}
                      </Link>
                      <div className="text-xs text-muted-foreground capitalize">{lease.propertyType}</div>
                    </td>
                    <td className="px-4 py-3">{lease.unitNumber}</td>
                    <td className="px-4 py-3">
                      {lease.tenantNames.length > 0 ? lease.tenantNames.join(', ') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatMoney(lease.rentAmount)}</td>
                    <td className="px-4 py-3 text-center">{lease.dueDay}</td>
                    <td className={`px-4 py-3 text-right ${lease.amountOverdue > 0 ? 'text-red-600 font-medium' : ''}`}>
                      {lease.amountOverdue > 0 ? formatMoney(lease.amountOverdue) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {lease.lastPaymentDate ? (
                        <div>
                          <div>{formatDate(lease.lastPaymentDate)}</div>
                          <div className="text-xs text-muted-foreground">
                            {lease.lastPaymentAmount ? formatMoney(lease.lastPaymentAmount) : ''}
                          </div>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div>{formatDate(lease.endDate)}</div>
                      {lease.daysUntilExpiry !== null && lease.daysUntilExpiry <= 60 && (
                        <div className={`text-xs ${lease.daysUntilExpiry <= 30 ? 'text-red-600' : 'text-yellow-600'}`}>
                          {lease.daysUntilExpiry} days left
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[lease.status] || 'bg-gray-100'}`}>
                        {lease.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredLeases.length === 0 && (
        <div className="text-center py-8 border rounded-lg">
          <p className="text-muted-foreground">No leases found</p>
        </div>
      )}
    </div>
  );
}
