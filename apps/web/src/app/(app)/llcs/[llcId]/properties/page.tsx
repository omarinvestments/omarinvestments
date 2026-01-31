'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { use } from 'react';
import {
  SearchFilter,
  PROPERTY_FILTERS,
  FilterValues,
  filterByField,
} from '@/components/SearchFilter';

interface PropertyItem {
  id: string;
  name?: string;
  type: string;
  status: string;
  address: {
    street1: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

interface UnitItem {
  id: string;
  status: string;
}

interface UnitCounts {
  available: number;
  total: number;
}

interface PropertiesPageProps {
  params: Promise<{ llcId: string }>;
}

export default function PropertiesPage({ params }: PropertiesPageProps) {
  const { llcId } = use(params);
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [unitCountsMap, setUnitCountsMap] = useState<Map<string, UnitCounts>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<FilterValues>({
    search: '',
    status: '',
    type: '',
  });

  const fetchProperties = useCallback(async () => {
    try {
      const res = await fetch(`/api/llcs/${llcId}/properties`);
      const data = await res.json();

      if (data.ok) {
        setProperties(data.data);

        // Fetch units for each property to get counts
        const unitPromises = data.data.map((p: PropertyItem) =>
          fetch(`/api/llcs/${llcId}/properties/${p.id}/units`).then((r) => r.json())
        );
        const unitsResults = await Promise.all(unitPromises);

        const countsMap = new Map<string, UnitCounts>();
        data.data.forEach((property: PropertyItem, index: number) => {
          const result = unitsResults[index];
          if (result.ok) {
            const units: UnitItem[] = result.data;
            const total = units.length;
            // Available = not occupied (includes 'available', 'vacant', etc.)
            const available = units.filter((u) => u.status !== 'occupied').length;
            countsMap.set(property.id, { available, total });
          } else {
            countsMap.set(property.id, { available: 0, total: 0 });
          }
        });
        setUnitCountsMap(countsMap);
      } else {
        setError(data.error?.message || 'Failed to load properties');
      }
    } catch {
      setError('Failed to load properties');
    } finally {
      setLoading(false);
    }
  }, [llcId]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  // Apply filters
  const filteredProperties = useMemo(() => {
    let result = properties;

    // Text search across name, address
    if (filters.search.trim()) {
      const lowerSearch = filters.search.toLowerCase();
      result = result.filter((property) => {
        const name = (property.name || '').toLowerCase();
        const street = property.address.street1.toLowerCase();
        const city = property.address.city.toLowerCase();
        const state = property.address.state.toLowerCase();
        const zip = property.address.zipCode.toLowerCase();
        return (
          name.includes(lowerSearch) ||
          street.includes(lowerSearch) ||
          city.includes(lowerSearch) ||
          state.includes(lowerSearch) ||
          zip.includes(lowerSearch)
        );
      });
    }

    // Filter by status
    result = filterByField(result, 'status', filters.status);

    // Filter by type
    result = filterByField(result, 'type', filters.type);

    return result;
  }, [properties, filters]);

  const handleArchive = async (propertyId: string, name: string) => {
    if (!confirm(`Are you sure you want to archive "${name || 'this property'}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/llcs/${llcId}/properties/${propertyId}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.ok) {
        setProperties((prev) => prev.filter((p) => p.id !== propertyId));
      } else {
        alert(data.error?.message || 'Failed to archive property');
      }
    } catch {
      alert('Failed to archive property');
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading properties...</div>;
  }

  if (error) {
    return <div className="text-destructive">{error}</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Properties</h1>
        <Link
          href={`/llcs/${llcId}/properties/new`}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity text-sm"
        >
          + Add Property
        </Link>
      </div>

      {/* Search & Filters */}
      <SearchFilter
        filters={PROPERTY_FILTERS}
        values={filters}
        onChange={setFilters}
        searchPlaceholder="Search name, address, city..."
        className="mb-6"
      />

      {/* Results count */}
      {properties.length > 0 && (
        <div className="text-sm text-muted-foreground mb-4">
          Showing {filteredProperties.length} of {properties.length} properties
        </div>
      )}

      {properties.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            No properties yet. Add your first property to get started.
          </p>
          <Link
            href={`/llcs/${llcId}/properties/new`}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity text-sm"
          >
            Add Property
          </Link>
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground">
            No properties match your filters.
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Name / Address</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Available Units</th>
                <th className="text-left px-4 py-3 font-medium">Total Units</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredProperties.map((property) => (
                <tr key={property.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/llcs/${llcId}/properties/${property.id}`}
                      className="hover:underline"
                    >
                      <div className="font-medium">
                        {property.name || property.address.street1}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {property.address.street1}, {property.address.city}, {property.address.state} {property.address.zipCode}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 capitalize">{property.type}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {(() => {
                      const counts = unitCountsMap.get(property.id);
                      if (!counts || counts.available === 0) return '—';
                      return `${counts.available}`;
                    })()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {(() => {
                      const counts = unitCountsMap.get(property.id);
                      if (!counts || counts.total === 0) return '—';
                      return `${counts.total}`;
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs ${
                        property.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {property.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/llcs/${llcId}/properties/${property.id}`}
                      className="text-xs text-muted-foreground hover:text-foreground mr-3"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleArchive(property.id, property.name || property.address.street1)}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      Archive
                    </button>
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
