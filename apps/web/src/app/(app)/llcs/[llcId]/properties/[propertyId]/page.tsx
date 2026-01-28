'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { use } from 'react';
import { PropertyUnitsTable } from '@/components/PropertyUnitsTable';

interface PropertyData {
  id: string;
  name?: string;
  type: string;
  status: string;
  address: {
    street1: string;
    street2?: string;
    city: string;
    state: string;
    zipCode: string;
  };
  county?: string;
  yearBuilt?: number;
  purchasePrice?: number;
  purchaseDate?: string;
  parcelInfo?: {
    pid?: string;
    parcelAreaSqft?: number;
    marketValue?: number;
    totalTax?: number;
  };
  notes?: string;
}

interface PropertyPageProps {
  params: Promise<{ llcId: string; propertyId: string }>;
}

function formatMoney(cents: number): string {
  return '$' + (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 });
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function PropertyPage({ params }: PropertyPageProps) {
  const { llcId, propertyId } = use(params);
  const [property, setProperty] = useState<PropertyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchProperty() {
      try {
        const res = await fetch(`/api/llcs/${llcId}/properties/${propertyId}`);
        const data = await res.json();

        if (data.ok) {
          setProperty(data.data);
        } else {
          setError(data.error?.message || 'Failed to load property');
        }
      } catch {
        setError('Failed to load property');
      } finally {
        setLoading(false);
      }
    }

    fetchProperty();
  }, [llcId, propertyId]);

  if (loading) {
    return <div className="text-muted-foreground">Loading property...</div>;
  }

  if (error || !property) {
    return <div className="text-destructive">{error || 'Property not found'}</div>;
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href={`/llcs/${llcId}/properties`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to Properties
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">
            {property.name || property.address.street1}
          </h1>
          <p className="text-muted-foreground mt-1">
            {property.address.street1}
            {property.address.street2 && `, ${property.address.street2}`}
            <br />
            {property.address.city}, {property.address.state} {property.address.zipCode}
          </p>
        </div>
        <Link
          href={`/llcs/${llcId}/properties/${propertyId}/edit`}
          className="px-4 py-2 border border-input rounded-md hover:bg-secondary transition-colors text-sm"
        >
          Edit Property
        </Link>
      </div>

      {/* Property Details Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-secondary/30 rounded-lg p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Type</div>
          <div className="font-medium capitalize">{property.type}</div>
        </div>
        <div className="bg-secondary/30 rounded-lg p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Status</div>
          <div>
            <span
              className={`inline-block px-2 py-0.5 rounded text-xs ${
                property.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {property.status}
            </span>
          </div>
        </div>
        {property.yearBuilt && (
          <div className="bg-secondary/30 rounded-lg p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Year Built</div>
            <div className="font-medium">{property.yearBuilt}</div>
          </div>
        )}
        {property.county && (
          <div className="bg-secondary/30 rounded-lg p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">County</div>
            <div className="font-medium">{property.county}</div>
          </div>
        )}
      </div>

      {/* Financial Info */}
      {(property.purchasePrice || property.parcelInfo?.marketValue || property.parcelInfo?.totalTax) && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Financial Information</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {property.purchasePrice && (
              <div className="bg-secondary/30 rounded-lg p-4">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Purchase Price</div>
                <div className="font-medium">{formatMoney(property.purchasePrice)}</div>
                {property.purchaseDate && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatDate(property.purchaseDate)}
                  </div>
                )}
              </div>
            )}
            {property.parcelInfo?.marketValue && (
              <div className="bg-secondary/30 rounded-lg p-4">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Market Value</div>
                <div className="font-medium">{formatMoney(property.parcelInfo.marketValue)}</div>
              </div>
            )}
            {property.parcelInfo?.totalTax && (
              <div className="bg-secondary/30 rounded-lg p-4">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Annual Tax</div>
                <div className="font-medium">{formatMoney(property.parcelInfo.totalTax)}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Parcel Info */}
      {property.parcelInfo?.pid && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Parcel Information</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-secondary/30 rounded-lg p-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Parcel ID</div>
              <div className="font-medium font-mono text-sm">{property.parcelInfo.pid}</div>
            </div>
            {property.parcelInfo.parcelAreaSqft && (
              <div className="bg-secondary/30 rounded-lg p-4">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Parcel Area</div>
                <div className="font-medium">{property.parcelInfo.parcelAreaSqft.toLocaleString()} sq ft</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {property.notes && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Notes</h2>
          <div className="bg-secondary/30 rounded-lg p-4">
            <p className="text-sm whitespace-pre-wrap">{property.notes}</p>
          </div>
        </div>
      )}

      {/* Units Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Units</h2>
          <Link
            href={`/llcs/${llcId}/properties/${propertyId}/units/new`}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity text-sm"
          >
            + Add Unit
          </Link>
        </div>
        <PropertyUnitsTable llcId={llcId} propertyId={propertyId} />
      </div>
    </div>
  );
}
