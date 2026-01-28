'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { use } from 'react';
import {
  SearchFilter,
  LEASE_FILTERS,
  FilterValues,
  filterByField,
} from '@/components/SearchFilter';

interface LeaseItem {
  id: string;
  propertyId: string;
  unitId: string;
  tenantIds: string[];
  startDate: string;
  endDate: string;
  rentAmount: number;
  status: string;
}

interface PropertyItem {
  id: string;
  name?: string;
  address?: { street1?: string };
}

interface UnitItem {
  id: string;
  unitNumber: string;
  propertyId: string;
}

interface TenantItem {
  id: string;
  type: 'residential' | 'commercial';
  firstName?: string;
  lastName?: string;
  businessName?: string;
}

interface LeasesPageProps {
  params: Promise<{ llcId: string }>;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  active: 'bg-green-100 text-green-800',
  ended: 'bg-blue-100 text-blue-800',
  eviction: 'bg-red-100 text-red-800',
  terminated: 'bg-orange-100 text-orange-800',
};

function formatDate(iso: string): string {
  if (!iso) return '—';

  const d = new Date(iso);
  const day = d.toLocaleDateString('en-US', { day: '2-digit' });
  const month = d.toLocaleDateString('en-US', { month: '2-digit' });
  const year = d.getFullYear().toString().slice(-2);

  return `${month}/${day}/${year}`;
}
function formatMoney(cents: number): string {
  return '$' + (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 });
}

export default function LeasesPage({ params }: LeasesPageProps) {
  const { llcId } = use(params);
  const [leases, setLeases] = useState<LeaseItem[]>([]);
  const [propertiesMap, setPropertiesMap] = useState<Map<string, PropertyItem>>(new Map());
  const [unitsMap, setUnitsMap] = useState<Map<string, UnitItem>>(new Map());
  const [tenantsMap, setTenantsMap] = useState<Map<string, TenantItem>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<FilterValues>({
    search: '',
    status: '',
  });

  const fetchLeases = useCallback(async () => {
    try {
      // Fetch leases, properties, and tenants in parallel
      const [resLeases, resProperties, resTenants] = await Promise.all([
        fetch(`/api/llcs/${llcId}/leases`),
        fetch(`/api/llcs/${llcId}/properties`),
        fetch(`/api/llcs/${llcId}/tenants`),
      ]);

      const [dataLeases, dataProperties, dataTenants] = await Promise.all([
        resLeases.json(),
        resProperties.json(),
        resTenants.json(),
      ]);

      if (!dataLeases.ok) {
        setError(dataLeases.error?.message || 'Failed to load leases');
        return;
      }

      setLeases(dataLeases.data);

      // Build properties map
      if (dataProperties.ok) {
        const propMap = new Map<string, PropertyItem>();
        dataProperties.data.forEach((p: PropertyItem) => propMap.set(p.id, p));
        setPropertiesMap(propMap);

        // Fetch units for each property
        const unitPromises = dataProperties.data.map((p: PropertyItem) =>
          fetch(`/api/llcs/${llcId}/properties/${p.id}/units`).then((r) => r.json())
        );
        const unitsResults = await Promise.all(unitPromises);

        const unitMap = new Map<string, UnitItem>();
        unitsResults.forEach((result) => {
          if (result.ok) {
            result.data.forEach((u: UnitItem) => unitMap.set(u.id, u));
          }
        });
        setUnitsMap(unitMap);
      }

      // Build tenants map
      if (dataTenants.ok) {
        const tenantMap = new Map<string, TenantItem>();
        dataTenants.data.forEach((t: TenantItem) => tenantMap.set(t.id, t));
        setTenantsMap(tenantMap);
      }
    } catch {
      setError('Failed to load leases');
    } finally {
      setLoading(false);
    }
  }, [llcId]);

  useEffect(() => {
    fetchLeases();
  }, [fetchLeases]);

  // Helper to get property name
  const getPropertyName = useCallback((propertyId: string): string => {
    const property = propertiesMap.get(propertyId);
    if (!property) return '—';
    return property.name || property.address?.street1 || propertyId;
  }, [propertiesMap]);

  // Helper to get unit number
  const getUnitNumber = useCallback((unitId: string): string => {
    const unit = unitsMap.get(unitId);
    return unit?.unitNumber || '—';
  }, [unitsMap]);

  // Helper to get tenant names (lastName, firstName format)
  const getTenantNames = useCallback((tenantIds: string[]): string => {
    if (!tenantIds || tenantIds.length === 0) return '—';

    const names = tenantIds.map((id) => {
      const tenant = tenantsMap.get(id);
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

    return names.length > 0 ? names.join('; ') : '—';
  }, [tenantsMap]);

  // Apply filters
  const filteredLeases = useMemo(() => {
    let result = leases;

    // Text search across property name, unit number, tenant names, dates, and rent
    if (filters.search.trim()) {
      const lowerSearch = filters.search.toLowerCase();
      result = result.filter((lease) => {
        const propertyName = getPropertyName(lease.propertyId).toLowerCase();
        const unitNumber = getUnitNumber(lease.unitId).toLowerCase();
        const tenantNames = getTenantNames(lease.tenantIds).toLowerCase();
        const rentStr = formatMoney(lease.rentAmount).toLowerCase();
        const dateRange = `${formatDate(lease.startDate)} ${formatDate(lease.endDate)}`.toLowerCase();

        return (
          propertyName.includes(lowerSearch) ||
          unitNumber.includes(lowerSearch) ||
          tenantNames.includes(lowerSearch) ||
          rentStr.includes(lowerSearch) ||
          dateRange.includes(lowerSearch)
        );
      });
    }

    // Filter by status
    result = filterByField(result, 'status', filters.status);

    return result;
  }, [leases, filters, getPropertyName, getUnitNumber, getTenantNames]);

  const handleDelete = async (leaseId: string) => {
    if (!confirm('Are you sure you want to delete this draft lease?')) {
      return;
    }

    try {
      const res = await fetch(`/api/llcs/${llcId}/leases/${leaseId}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.ok) {
        setLeases((prev) => prev.filter((l) => l.id !== leaseId));
      } else {
        alert(data.error?.message || 'Failed to delete lease');
      }
    } catch {
      alert('Failed to delete lease');
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading leases...</div>;
  }

  if (error) {
    return <div className="text-destructive">{error}</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Leases</h1>
        <Link
          href={`/llcs/${llcId}/leases/new`}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity text-sm"
        >
          + New Lease
        </Link>
      </div>

      {/* Search & Filters */}
      <SearchFilter
        filters={LEASE_FILTERS}
        values={filters}
        onChange={setFilters}
        searchPlaceholder="Search by property, unit, tenant, rent..."
        className="mb-6"
      />

      {/* Results count */}
      {leases.length > 0 && (
        <div className="text-sm text-muted-foreground mb-4">
          Showing {filteredLeases.length} of {leases.length} leases
        </div>
      )}

      {leases.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            No leases yet. Create your first lease to get started.
          </p>
          <Link
            href={`/llcs/${llcId}/leases/new`}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity text-sm"
          >
            New Lease
          </Link>
        </div>
      ) : filteredLeases.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground">
            No leases match your filters.
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Property</th>
                <th className="text-left px-4 py-3 font-medium">Unit</th>
                <th className="text-left px-4 py-3 font-medium">Tenant(s)</th>
                <th className="text-left px-4 py-3 font-medium">Period Start</th>
                <th className="text-left px-4 py-3 font-medium">Period End</th>
                <th className="text-left px-4 py-3 font-medium">Rent</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredLeases.map((lease) => (
                <tr key={lease.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/llcs/${llcId}/leases/${lease.id}`}
                      className="hover:underline font-medium"
                    >
                      {getPropertyName(lease.propertyId)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {getUnitNumber(lease.unitId)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {getTenantNames(lease.tenantIds)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(lease.startDate)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(lease.endDate)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatMoney(lease.rentAmount)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs ${STATUS_COLORS[lease.status] || 'bg-gray-100 text-gray-800'}`}
                    >
                      {lease.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/llcs/${llcId}/leases/${lease.id}`}
                      className="text-xs text-muted-foreground hover:text-foreground mr-3"
                    >
                      Edit
                    </Link>
                    {lease.status === 'draft' && (
                      <button
                        onClick={() => handleDelete(lease.id)}
                        className="text-xs text-muted-foreground hover:text-destructive"
                      >
                        Delete
                      </button>
                    )}
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
