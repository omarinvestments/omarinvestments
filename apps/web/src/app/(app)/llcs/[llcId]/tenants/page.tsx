'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { use } from 'react';
import {
  SearchFilter,
  TENANT_FILTERS,
  FilterValues,
  filterByField,
} from '@/components/SearchFilter';

interface TenantItem {
  id: string;
  type: 'residential' | 'commercial';
  email: string;
  phone?: string;
  propertyId: string;
  leaseIds?: string[];
  // Residential
  firstName?: string;
  lastName?: string;
  // Commercial
  businessName?: string;
  businessType?: string;
  primaryContact?: { name: string };
}

interface TenantsPageProps {
  params: Promise<{ llcId: string }>;
}

function getTenantDisplayName(tenant: TenantItem): string {
  if (tenant.type === 'commercial') {
    return tenant.businessName || 'Unnamed Business';
  }
  return `${tenant.firstName} ${tenant.lastName}`;
}

export default function TenantsPage({ params }: TenantsPageProps) {
  const { llcId } = use(params);
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<FilterValues>({
    search: '',
    type: '',
    hasActiveLease: '',
  });

  const fetchTenants = useCallback(async () => {
    try {
      const res = await fetch(`/api/llcs/${llcId}/tenants`);
      const data = await res.json();

      if (data.ok) {
        setTenants(data.data);
      } else {
        setError(data.error?.message || 'Failed to load tenants');
      }
    } catch {
      setError('Failed to load tenants');
    } finally {
      setLoading(false);
    }
  }, [llcId]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  // Apply filters
  const filteredTenants = useMemo(() => {
    let result = tenants;

    // Text search across name, email, phone
    if (filters.search.trim()) {
      const lowerSearch = filters.search.toLowerCase();
      result = result.filter((tenant) => {
        const displayName = getTenantDisplayName(tenant).toLowerCase();
        const email = (tenant.email || '').toLowerCase();
        const phone = (tenant.phone || '').toLowerCase();
        return (
          displayName.includes(lowerSearch) ||
          email.includes(lowerSearch) ||
          phone.includes(lowerSearch)
        );
      });
    }

    // Filter by type
    result = filterByField(result, 'type', filters.type);

    // Filter by lease status
    if (filters.hasActiveLease === 'active') {
      result = result.filter((t) => t.leaseIds && t.leaseIds.length > 0);
    } else if (filters.hasActiveLease === 'inactive') {
      result = result.filter((t) => !t.leaseIds || t.leaseIds.length === 0);
    }

    return result;
  }, [tenants, filters]);

  const handleDelete = async (tenantId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/llcs/${llcId}/tenants/${tenantId}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.ok) {
        setTenants((prev) => prev.filter((t) => t.id !== tenantId));
      } else {
        alert(data.error?.message || 'Failed to delete tenant');
      }
    } catch {
      alert('Failed to delete tenant');
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading tenants...</div>;
  }

  if (error) {
    return <div className="text-destructive">{error}</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Tenants</h1>
        <Link
          href={`/llcs/${llcId}/tenants/new`}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity text-sm"
        >
          + Add Tenant
        </Link>
      </div>

      {/* Search & Filters */}
      <SearchFilter
        filters={TENANT_FILTERS}
        values={filters}
        onChange={setFilters}
        searchPlaceholder="Search name, email, phone..."
        className="mb-6"
      />

      {/* Results count */}
      {tenants.length > 0 && (
        <div className="text-sm text-muted-foreground mb-4">
          Showing {filteredTenants.length} of {tenants.length} tenants
        </div>
      )}

      {tenants.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            No tenants yet. Add your first tenant to get started.
          </p>
          <Link
            href={`/llcs/${llcId}/tenants/new`}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity text-sm"
          >
            Add Tenant
          </Link>
        </div>
      ) : filteredTenants.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground">
            No tenants match your filters.
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Phone</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredTenants.map((tenant) => {
                const displayName = getTenantDisplayName(tenant);
                return (
                  <tr key={tenant.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/llcs/${llcId}/tenants/${tenant.id}`}
                        className="hover:underline"
                      >
                        <div className="font-medium">{displayName}</div>
                        {tenant.type === 'commercial' && tenant.primaryContact && (
                          <div className="text-muted-foreground text-xs">
                            Contact: {tenant.primaryContact.name}
                          </div>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs ${
                          tenant.type === 'commercial'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {tenant.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{tenant.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{tenant.phone || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/llcs/${llcId}/tenants/${tenant.id}`}
                        className="text-xs text-muted-foreground hover:text-foreground mr-3"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(tenant.id, displayName)}
                        className="text-xs text-muted-foreground hover:text-destructive"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
