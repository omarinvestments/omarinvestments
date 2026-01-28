'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { use } from 'react';

interface EditLeasePageProps {
  params: Promise<{ llcId: string; leaseId: string }>;
}

export default function EditLeasePage({ params }: EditLeasePageProps) {
  const { llcId, leaseId } = use(params);
  const router = useRouter();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rentAmount, setRentAmount] = useState('');
  const [dueDay, setDueDay] = useState('1');
  const [depositAmount, setDepositAmount] = useState('');
  const [status, setStatus] = useState('draft');
  const [petPolicy, setPetPolicy] = useState('');
  const [petDeposit, setPetDeposit] = useState('');
  const [parkingSpaces, setParkingSpaces] = useState('');
  const [utilitiesIncluded, setUtilitiesIncluded] = useState('');
  const [specialTerms, setSpecialTerms] = useState('');
  const [notes, setNotes] = useState('');

  // Read-only display info
  const [tenantCount, setTenantCount] = useState(0);
  const [tenantNames, setTenantNames] = useState<string[]>([]);
  const [propertyName, setPropertyName] = useState('');
  const [unitNumber, setUnitNumber] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchLease() {
      try {
        const res = await fetch(`/api/llcs/${llcId}/leases/${leaseId}`);
        const data = await res.json();

        if (data.ok) {
          const l = data.data;
          setTenantCount(l.tenantIds?.length || 0);
          setStartDate(l.startDate ? l.startDate.split('T')[0] : '');
          setEndDate(l.endDate ? l.endDate.split('T')[0] : '');
          setRentAmount(l.rentAmount ? (l.rentAmount / 100).toString() : '');
          setDueDay(l.dueDay?.toString() || '1');
          setDepositAmount(l.depositAmount ? (l.depositAmount / 100).toString() : '');
          setStatus(l.status || 'draft');
          setPetPolicy(l.terms?.petPolicy || '');
          setPetDeposit(l.terms?.petDeposit ? (l.terms.petDeposit / 100).toString() : '');
          setParkingSpaces(l.terms?.parkingSpaces?.toString() || '');
          setUtilitiesIncluded(l.terms?.utilitiesIncluded?.join(', ') || '');
          setSpecialTerms(l.terms?.specialTerms || '');
          setNotes(l.notes || '');

          // Fetch property to get name and unit number
          if (l.propertyId) {
            try {
              const propRes = await fetch(`/api/llcs/${llcId}/properties/${l.propertyId}`);
              const propData = await propRes.json();
              const unitRes = await fetch(`/api/llcs/${llcId}/properties/${l.propertyId}/units/${l.unitId}`);
              const unitData = await unitRes.json();
              if (propData.ok) {
                const property = propData.data;
                setPropertyName(property.name || property.address?.street1 || 'Unknown Property');
              }
              if (unitData.ok) {
                const unit = unitData.data;
                setUnitNumber(unit.unitNumber || '-');
              }
            } catch {
              setPropertyName('Unknown Property');
              setUnitNumber('—');
            }
          }
          // Fetch Tenant Info (using global tenant API)
          if (l.tenantIds && l.tenantIds.length > 0) {
            try {
              const tenantPromises = l.tenantIds.map((tenantId: string) =>
                fetch(`/api/tenants/${tenantId}`).then((res) => res.json())
              );
              const tenantResults = await Promise.all(tenantPromises);
              const names = tenantResults
                .filter((result) => result.ok)
                .map((result) => {
                  const t = result.data;
                  if (t.type === 'commercial') {
                    return t.businessName || 'Unknown Business';
                  }
                  return `${t.firstName || ''} ${t.lastName || ''}`.trim() || 'Unknown Tenant';
                });
              setTenantNames(names);
            } catch {
              setTenantNames([]);
            }
          }
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
    setSuccess('');
    setSaving(true);

    const terms: Record<string, unknown> = {};
    if (petPolicy) terms.petPolicy = petPolicy;
    if (petDeposit) terms.petDeposit = Math.round(parseFloat(petDeposit) * 100);
    if (parkingSpaces) terms.parkingSpaces = parseInt(parkingSpaces);
    if (utilitiesIncluded.trim()) {
      terms.utilitiesIncluded = utilitiesIncluded.split(',').map((s) => s.trim()).filter(Boolean);
    }
    if (specialTerms) terms.specialTerms = specialTerms;

    try {
      const res = await fetch(`/api/llcs/${llcId}/leases/${leaseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          rentAmount: Math.round(parseFloat(rentAmount) * 100),
          dueDay: parseInt(dueDay),
          depositAmount: depositAmount ? Math.round(parseFloat(depositAmount) * 100) : 0,
          status,
          terms: Object.keys(terms).length > 0 ? terms : undefined,
          notes: notes || undefined,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setSuccess('Lease updated successfully.');
      } else {
        setError(data.error?.message || 'Failed to update lease');
      }
    } catch {
      setError('Failed to update lease');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this draft lease?')) return;

    try {
      const res = await fetch(`/api/llcs/${llcId}/leases/${leaseId}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.ok) {
        router.push(`/llcs/${llcId}/leases`);
      } else {
        alert(data.error?.message || 'Failed to delete lease');
      }
    } catch {
      alert('Failed to delete lease');
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading lease...</div>;
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link
          href={`/llcs/${llcId}/leases`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to Leases
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">Edit Lease</h1>

      {/* Read-only context */}
      <div className="mb-6 p-4 bg-secondary/30 rounded-md text-sm space-y-2">
        <div><span className="text-muted-foreground">Property:</span> {propertyName || 'Loading...'}</div>
        <div><span className="text-muted-foreground">Unit:</span> {unitNumber || 'Loading...'}</div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Tenant{tenantCount > 1 ? 's' : ''}:</span>
          <span>{tenantNames.length > 0 ? tenantNames.join(', ') : 'None assigned'}</span>
          <Link
            href="/tenants/new"
            className="ml-2 text-xs text-primary hover:underline"
          >
            + Add Tenant
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6 flex flex-wrap gap-3">
        <Link
          href={`/llcs/${llcId}/leases/${leaseId}/charges`}
          className="px-4 py-2 border rounded-md hover:bg-secondary transition-colors text-sm"
        >
          Charges & Balance
        </Link>
        <Link
          href={`/llcs/${llcId}/leases/${leaseId}/payments`}
          className="px-4 py-2 border rounded-md hover:bg-secondary transition-colors text-sm"
        >
          Payment History
        </Link>
        <Link
          href={`/llcs/${llcId}/leases/${leaseId}/documents`}
          className="px-4 py-2 border rounded-md hover:bg-secondary transition-colors text-sm"
        >
          Documents
        </Link>
        {status === 'active' && (
          <Link
            href={`/llcs/${llcId}/leases/${leaseId}/renew`}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
          >
            Renew Lease
          </Link>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-green-50 text-green-800 rounded-md text-sm border border-green-200">
            {success}
          </div>
        )}

        {/* Dates & Amounts */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Lease Terms</h2>

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

          <div className="grid grid-cols-3 gap-4">
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
            </div>
            <div>
              <label htmlFor="dueDay" className="block text-sm font-medium mb-2">
                Due Day (1-28) *
              </label>
              <input
                id="dueDay"
                type="number"
                min="1"
                max="28"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                required
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="depositAmount" className="block text-sm font-medium mb-2">
                Security Deposit ($)
              </label>
              <input
                id="depositAmount"
                type="number"
                step="0.01"
                min="0"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium mb-2">
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="ended">Ended</option>
              <option value="eviction">Eviction</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>
        </div>

        {/* Additional Terms */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Additional Terms</h2>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="petPolicy" className="block text-sm font-medium mb-2">
                Pet Policy
              </label>
              <select
                id="petPolicy"
                value={petPolicy}
                onChange={(e) => setPetPolicy(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">—</option>
                <option value="allowed">Allowed</option>
                <option value="not_allowed">Not Allowed</option>
                <option value="case_by_case">Case by Case</option>
              </select>
            </div>
            <div>
              <label htmlFor="petDeposit" className="block text-sm font-medium mb-2">
                Pet Deposit ($)
              </label>
              <input
                id="petDeposit"
                type="number"
                step="0.01"
                min="0"
                value={petDeposit}
                onChange={(e) => setPetDeposit(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="parkingSpaces" className="block text-sm font-medium mb-2">
                Parking Spaces
              </label>
              <input
                id="parkingSpaces"
                type="number"
                min="0"
                value={parkingSpaces}
                onChange={(e) => setParkingSpaces(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label htmlFor="utilitiesIncluded" className="block text-sm font-medium mb-2">
              Utilities Included (comma-separated)
            </label>
            <input
              id="utilitiesIncluded"
              type="text"
              value={utilitiesIncluded}
              onChange={(e) => setUtilitiesIncluded(e.target.value)}
              placeholder="e.g. water, trash, sewer"
              className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label htmlFor="specialTerms" className="block text-sm font-medium mb-2">
              Special Terms
            </label>
            <textarea
              id="specialTerms"
              value={specialTerms}
              onChange={(e) => setSpecialTerms(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium mb-2">
            Notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4">
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving || !startDate || !endDate || !rentAmount}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <Link
              href={`/llcs/${llcId}/leases`}
              className="px-6 py-2 border border-input rounded-md hover:bg-secondary transition-colors"
            >
              Cancel
            </Link>
          </div>
          {status === 'draft' && (
            <button
              type="button"
              onClick={handleDelete}
              className="text-sm text-destructive hover:underline"
            >
              Delete Lease
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
