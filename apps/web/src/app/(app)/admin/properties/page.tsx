'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface AdminProperty {
  id: string;
  llcId: string;
  llcName: string;
  name: string | null;
  address: string;
  city: string;
  state: string;
  type: string;
  status: string;
  yearBuilt: number | null;
  totalSqft: number | null;
  marketValue: number | null;
  marketValueYear: number | null;
  unitCount: number;
  occupiedUnits: number;
  occupancyRate: number;
  totalMonthlyRent: number;
  mortgageBalance: number | null;
  mortgagePayment: number | null;
  mortgageRate: number | null;
  nextPaymentDate: string | null;
}

interface AdminUnit {
  id: string;
  llcId: string;
  llcName: string;
  propertyId: string;
  propertyAddress: string;
  unitNumber: string;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  status: string;
  marketRent: number | null;
  currentLeaseId: string | null;
  currentTenantNames: string[];
  currentRent: number | null;
  leaseEndDate: string | null;
}

interface LLC {
  id: string;
  legalName: string;
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

function formatNumber(num: number | null): string {
  if (num === null) return '—';
  return num.toLocaleString();
}

const UNIT_STATUS_COLORS: Record<string, string> = {
  available: 'bg-green-100 text-green-800',
  occupied: 'bg-blue-100 text-blue-800',
  maintenance: 'bg-yellow-100 text-yellow-800',
  unavailable: 'bg-gray-100 text-gray-800',
};

const PROPERTY_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'mixed', label: 'Mixed Use' },
  { value: 'industrial', label: 'Industrial' },
];

const UNIT_STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'available', label: 'Available' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'unavailable', label: 'Unavailable' },
];

export default function AdminPropertiesPage() {
  const [properties, setProperties] = useState<AdminProperty[]>([]);
  const [units, setUnits] = useState<AdminUnit[]>([]);
  const [llcs, setLlcs] = useState<LLC[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [llcFilter, setLlcFilter] = useState('');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('');
  const [unitStatusFilter, setUnitStatusFilter] = useState('');
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
      if (propertyTypeFilter) params.set('propertyType', propertyTypeFilter);
      if (unitStatusFilter) params.set('unitStatus', unitStatusFilter);

      const res = await fetch(`/api/admin/properties?${params.toString()}`);
      const data = await res.json();

      if (data.ok) {
        setProperties(data.data.properties);
        setUnits(data.data.units);
      } else {
        setError(data.error?.message || 'Failed to fetch data');
      }
    } catch {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [llcFilter, propertyTypeFilter, unitStatusFilter]);

  useEffect(() => {
    fetchLlcs();
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Client-side search filter
  const filteredProperties = properties.filter(p => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      p.address.toLowerCase().includes(search) ||
      p.llcName.toLowerCase().includes(search) ||
      p.city.toLowerCase().includes(search) ||
      (p.name && p.name.toLowerCase().includes(search))
    );
  });

  const filteredUnits = units.filter(u => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      u.propertyAddress.toLowerCase().includes(search) ||
      u.unitNumber.toLowerCase().includes(search) ||
      u.llcName.toLowerCase().includes(search) ||
      u.currentTenantNames.some(n => n.toLowerCase().includes(search))
    );
  });

  // Summary stats
  const totalProperties = filteredProperties.length;
  const totalUnits = filteredUnits.length;
  const availableUnits = filteredUnits.filter(u => u.status === 'available').length;
  const totalMarketValue = filteredProperties.reduce((sum, p) => sum + (p.marketValue || 0), 0);
  const totalMonthlyRent = filteredProperties.reduce((sum, p) => sum + p.totalMonthlyRent, 0);
  const avgOccupancy = totalProperties > 0
    ? Math.round(filteredProperties.reduce((sum, p) => sum + p.occupancyRate, 0) / totalProperties)
    : 0;

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

      <h1 className="text-2xl font-bold mb-6">All Properties & Units</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <div className="bg-secondary/30 rounded-lg p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Properties</div>
          <div className="text-2xl font-bold">{totalProperties}</div>
        </div>
        <div className="bg-secondary/30 rounded-lg p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Units</div>
          <div className="text-2xl font-bold">{totalUnits}</div>
        </div>
        <div className="bg-secondary/30 rounded-lg p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Available</div>
          <div className="text-2xl font-bold text-green-600">{availableUnits}</div>
        </div>
        <div className="bg-secondary/30 rounded-lg p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Avg Occupancy</div>
          <div className="text-2xl font-bold">{avgOccupancy}%</div>
        </div>
        <div className="bg-secondary/30 rounded-lg p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Market Value</div>
          <div className="text-xl font-bold">{formatMoney(totalMarketValue)}</div>
        </div>
        <div className="bg-secondary/30 rounded-lg p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Monthly Income</div>
          <div className="text-xl font-bold">{formatMoney(totalMonthlyRent)}</div>
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
            placeholder="Address, LLC, tenant..."
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
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Unit Status</label>
          <select
            value={unitStatusFilter}
            onChange={(e) => setUnitStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            {UNIT_STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
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
        <div className="text-center py-8 text-muted-foreground">Loading data...</div>
      )}

      {/* Properties Table */}
      {!loading && (
        <>
          <h2 className="text-lg font-semibold mb-4">Properties</h2>
          {filteredProperties.length > 0 ? (
            <div className="border rounded-lg overflow-hidden mb-8">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Property</th>
                      <th className="text-left px-4 py-3 font-medium">LLC</th>
                      <th className="text-left px-4 py-3 font-medium">Type</th>
                      <th className="text-right px-4 py-3 font-medium">Market Value</th>
                      <th className="text-right px-4 py-3 font-medium">Sq Ft</th>
                      <th className="text-center px-4 py-3 font-medium">Units</th>
                      <th className="text-center px-4 py-3 font-medium">Occupancy</th>
                      <th className="text-right px-4 py-3 font-medium">Monthly Income</th>
                      <th className="text-right px-4 py-3 font-medium">Mortgage Bal</th>
                      <th className="text-right px-4 py-3 font-medium">Payment</th>
                      <th className="text-center px-4 py-3 font-medium">Rate</th>
                      <th className="text-left px-4 py-3 font-medium">Next Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProperties.map((property) => (
                      <tr key={property.id} className="border-t hover:bg-secondary/20">
                        <td className="px-4 py-3">
                          <Link
                            href={`/llcs/${property.llcId}/properties/${property.id}`}
                            className="hover:underline font-medium"
                          >
                            {property.name || property.address}
                          </Link>
                          {property.name && (
                            <div className="text-xs text-muted-foreground">{property.address}</div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            {property.city}, {property.state}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/llcs/${property.llcId}`}
                            className="text-primary hover:underline"
                          >
                            {property.llcName}
                          </Link>
                        </td>
                        <td className="px-4 py-3 capitalize">{property.type}</td>
                        <td className="px-4 py-3 text-right">
                          {property.marketValue ? (
                            <div>
                              <div className="font-medium">{formatMoney(property.marketValue)}</div>
                              {property.marketValueYear && (
                                <div className="text-xs text-muted-foreground">{property.marketValueYear}</div>
                              )}
                            </div>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">{formatNumber(property.totalSqft)}</td>
                        <td className="px-4 py-3 text-center">{property.unitCount}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            property.occupancyRate >= 90 ? 'bg-green-100 text-green-800' :
                            property.occupancyRate >= 70 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {property.occupancyRate}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatMoney(property.totalMonthlyRent)}
                        </td>
                        <td className="px-4 py-3 text-right">{formatMoney(property.mortgageBalance)}</td>
                        <td className="px-4 py-3 text-right">{formatMoney(property.mortgagePayment)}</td>
                        <td className="px-4 py-3 text-center">
                          {property.mortgageRate ? `${property.mortgageRate}%` : '—'}
                        </td>
                        <td className="px-4 py-3">{formatDate(property.nextPaymentDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 border rounded-lg mb-8">
              <p className="text-muted-foreground">No properties found</p>
            </div>
          )}

          {/* Units Table */}
          <h2 className="text-lg font-semibold mb-4">Units</h2>
          {filteredUnits.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Property</th>
                      <th className="text-left px-4 py-3 font-medium">Unit</th>
                      <th className="text-center px-4 py-3 font-medium">Beds</th>
                      <th className="text-center px-4 py-3 font-medium">Baths</th>
                      <th className="text-right px-4 py-3 font-medium">Sq Ft</th>
                      <th className="text-right px-4 py-3 font-medium">Market Rent</th>
                      <th className="text-center px-4 py-3 font-medium">Status</th>
                      <th className="text-left px-4 py-3 font-medium">Tenant(s)</th>
                      <th className="text-right px-4 py-3 font-medium">Current Rent</th>
                      <th className="text-left px-4 py-3 font-medium">Lease End</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUnits.map((unit) => (
                      <tr key={`${unit.propertyId}-${unit.id}`} className="border-t hover:bg-secondary/20">
                        <td className="px-4 py-3">
                          <Link
                            href={`/llcs/${unit.llcId}/properties/${unit.propertyId}`}
                            className="hover:underline"
                          >
                            {unit.propertyAddress}
                          </Link>
                          <div className="text-xs text-muted-foreground">{unit.llcName}</div>
                        </td>
                        <td className="px-4 py-3 font-medium">{unit.unitNumber}</td>
                        <td className="px-4 py-3 text-center">{unit.bedrooms ?? '—'}</td>
                        <td className="px-4 py-3 text-center">{unit.bathrooms ?? '—'}</td>
                        <td className="px-4 py-3 text-right">{formatNumber(unit.sqft)}</td>
                        <td className="px-4 py-3 text-right">{formatMoney(unit.marketRent)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${UNIT_STATUS_COLORS[unit.status] || 'bg-gray-100'}`}>
                            {unit.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {unit.currentTenantNames.length > 0 ? unit.currentTenantNames.join(', ') : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">{formatMoney(unit.currentRent)}</td>
                        <td className="px-4 py-3">{formatDate(unit.leaseEndDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 border rounded-lg">
              <p className="text-muted-foreground">No units found</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
