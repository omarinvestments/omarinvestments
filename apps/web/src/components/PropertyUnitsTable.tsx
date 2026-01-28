'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface UnitItem {
  id: string;
  unitNumber: string;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  status: string;
  marketRent?: number;
}

interface LeaseInfo {
  id: string;
  status: string;
  tenantNames: string;
}

interface PropertyUnitsTableProps {
  llcId: string;
  propertyId: string;
  showActions?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-green-100 text-green-800',
  vacant: 'bg-green-100 text-green-800',
  occupied: 'bg-blue-100 text-blue-800',
  maintenance: 'bg-yellow-100 text-yellow-800',
  unavailable: 'bg-gray-100 text-gray-800',
};

export function PropertyUnitsTable({ llcId, propertyId, showActions = true }: PropertyUnitsTableProps) {
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [leasesMap, setLeasesMap] = useState<Map<string, LeaseInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      // Fetch units and leases in parallel
      const [unitsRes, leasesRes, tenantsRes] = await Promise.all([
        fetch(`/api/llcs/${llcId}/properties/${propertyId}/units`),
        fetch(`/api/llcs/${llcId}/leases?propertyId=${propertyId}`),
        fetch(`/api/llcs/${llcId}/tenants`),
      ]);

      const [unitsData, leasesData, tenantsData] = await Promise.all([
        unitsRes.json(),
        leasesRes.json(),
        tenantsRes.json(),
      ]);

      if (unitsData.ok) {
        setUnits(unitsData.data);
      } else {
        setError(unitsData.error?.message || 'Failed to load units');
        return;
      }

      // Build tenants map for name lookup
      const tenantsMap = new Map<string, { firstName?: string; lastName?: string; businessName?: string; type: string }>();
      if (tenantsData.ok) {
        tenantsData.data.forEach((t: { id: string; firstName?: string; lastName?: string; businessName?: string; type: string }) => {
          tenantsMap.set(t.id, t);
        });
      }

      // Build leases map (unitId -> active lease info)
      if (leasesData.ok) {
        const leaseMap = new Map<string, LeaseInfo>();
        leasesData.data.forEach((lease: { id: string; unitId: string; status: string; tenantIds: string[] }) => {
          // Only consider active leases
          if (lease.status === 'active') {
            // Get tenant names
            const names = lease.tenantIds.map((tid: string) => {
              const tenant = tenantsMap.get(tid);
              if (!tenant) return null;
              if (tenant.type === 'commercial') {
                return tenant.businessName || '—';
              }
              const lastName = tenant.lastName || '';
              const firstName = tenant.firstName || '';
              if (lastName && firstName) {
                return `${lastName}, ${firstName}`;
              }
              return lastName || firstName || '—';
            }).filter(Boolean);

            leaseMap.set(lease.unitId, {
              id: lease.id,
              status: lease.status,
              tenantNames: names.join('; ') || '—',
            });
          }
        });
        setLeasesMap(leaseMap);
      }
    } catch {
      setError('Failed to load units');
    } finally {
      setLoading(false);
    }
  }, [llcId, propertyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (unitId: string, unitNumber: string) => {
    if (!confirm(`Are you sure you want to delete unit "${unitNumber}"? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/llcs/${llcId}/properties/${propertyId}/units/${unitId}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.ok) {
        setUnits((prev) => prev.filter((u) => u.id !== unitId));
      } else {
        alert(data.error?.message || 'Failed to delete unit');
      }
    } catch {
      alert('Failed to delete unit');
    }
  };

  if (loading) {
    return <div className="text-muted-foreground py-4">Loading units...</div>;
  }

  if (error) {
    return <div className="text-destructive py-4">{error}</div>;
  }

  if (units.length === 0) {
    return (
      <div className="text-center py-8 border rounded-lg">
        <p className="text-muted-foreground mb-4">
          No units yet. Add your first unit to this property.
        </p>
        <Link
          href={`/llcs/${llcId}/properties/${propertyId}/units/new`}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity text-sm"
        >
          Add Unit
        </Link>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-secondary">
          <tr>
            <th className="text-left px-4 py-3 font-medium">Unit #</th>
            <th className="text-left px-4 py-3 font-medium">Status</th>
            <th className="text-left px-4 py-3 font-medium">Bed/Bath</th>
            <th className="text-left px-4 py-3 font-medium">Sq Ft</th>
            <th className="text-left px-4 py-3 font-medium">Market Rent</th>
            <th className="text-left px-4 py-3 font-medium">Active Lease</th>
            {showActions && <th className="text-right px-4 py-3 font-medium">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y">
          {units.map((unit) => {
            const leaseInfo = leasesMap.get(unit.id);
            return (
              <tr key={unit.id} className="hover:bg-secondary/30 transition-colors">
                <td className="px-4 py-3">
                  <Link
                    href={`/llcs/${llcId}/properties/${propertyId}/units/${unit.id}`}
                    className="font-medium hover:underline"
                  >
                    {unit.unitNumber}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs ${STATUS_COLORS[unit.status] || 'bg-gray-100 text-gray-800'}`}
                  >
                    {unit.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {unit.bedrooms != null || unit.bathrooms != null
                    ? `${unit.bedrooms ?? '—'} / ${unit.bathrooms ?? '—'}`
                    : '—'}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {unit.sqft ? unit.sqft.toLocaleString() : '—'}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {unit.marketRent
                    ? `$${(unit.marketRent / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  {leaseInfo ? (
                    <Link
                      href={`/llcs/${llcId}/leases/${leaseInfo.id}`}
                      className="text-primary hover:underline"
                    >
                      {leaseInfo.tenantNames}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                {showActions && (
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/llcs/${llcId}/properties/${propertyId}/units/${unit.id}`}
                      className="text-xs text-muted-foreground hover:text-foreground mr-3"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(unit.id, unit.unitNumber)}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
