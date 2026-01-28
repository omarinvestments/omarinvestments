'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { use } from 'react';

interface EditPropertyPageProps {
  params: Promise<{ llcId: string; propertyId: string }>;
}

export default function EditPropertyPage({ params }: EditPropertyPageProps) {
  const { llcId, propertyId } = use(params);
  const router = useRouter();

  const [name, setName] = useState('');
  const [type, setType] = useState('residential');
  const [status, setStatus] = useState('active');
  const [street1, setStreet1] = useState('');
  const [street2, setStreet2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [county, setCounty] = useState('');
  const [yearBuilt, setYearBuilt] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [pid, setPid] = useState('');
  const [parcelAreaSqft, setParcelAreaSqft] = useState('');
  const [torrensAbstract, setTorrensAbstract] = useState('');
  const [addition, setAddition] = useState('');
  const [lot, setLot] = useState('');
  const [block, setBlock] = useState('');
  const [metesAndBounds, setMetesAndBounds] = useState('');
  const [marketValue, setMarketValue] = useState('');
  const [totalTax, setTotalTax] = useState('');
  const [countyPropertyType, setCountyPropertyType] = useState('');
  const [homestead, setHomestead] = useState(false);
  const [schoolDistrict, setSchoolDistrict] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchProperty() {
      try {
        const res = await fetch(`/api/llcs/${llcId}/properties/${propertyId}`);
        const data = await res.json();

        if (data.ok) {
          const p = data.data;
          setName(p.name || '');
          setType(p.type || 'residential');
          setStatus(p.status || 'active');
          setStreet1(p.address?.street1 || '');
          setStreet2(p.address?.street2 || '');
          setCity(p.address?.city || '');
          setState(p.address?.state || '');
          setZipCode(p.address?.zipCode || '');
          setCounty(p.county || '');
          setYearBuilt(p.yearBuilt?.toString() || '');
          setPurchasePrice(p.purchasePrice ? (p.purchasePrice / 100).toString() : '');
          setPurchaseDate(p.purchaseDate ? p.purchaseDate.split('T')[0] : '');
          setPid(p.parcelInfo?.pid || '');
          setParcelAreaSqft(p.parcelInfo?.parcelAreaSqft?.toString() || '');
          setTorrensAbstract(p.parcelInfo?.torrensAbstract || '');
          setAddition(p.parcelInfo?.addition || '');
          setLot(p.parcelInfo?.lot || '');
          setBlock(p.parcelInfo?.block || '');
          setMetesAndBounds(p.parcelInfo?.metesAndBounds || '');
          setMarketValue(p.parcelInfo?.marketValue ? (p.parcelInfo.marketValue / 100).toString() : '');
          setTotalTax(p.parcelInfo?.totalTax ? (p.parcelInfo.totalTax / 100).toString() : '');
          setCountyPropertyType(p.parcelInfo?.countyPropertyType || '');
          setHomestead(p.parcelInfo?.homestead || false);
          setSchoolDistrict(p.parcelInfo?.schoolDistrict || '');
          setNotes(p.notes || '');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const res = await fetch(`/api/llcs/${llcId}/properties/${propertyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || undefined,
          type,
          status,
          address: {
            street1,
            street2: street2 || undefined,
            city,
            state: state.toUpperCase(),
            zipCode,
            country: 'US',
          },
          county: county || undefined,
          yearBuilt: yearBuilt ? parseInt(yearBuilt) : undefined,
          purchasePrice: purchasePrice ? Math.round(parseFloat(purchasePrice) * 100) : undefined,
          purchaseDate: purchaseDate ? new Date(purchaseDate).toISOString() : undefined,
          parcelInfo: {
            pid: pid || undefined,
            parcelAreaSqft: parcelAreaSqft ? parseInt(parcelAreaSqft) : undefined,
            torrensAbstract: torrensAbstract || undefined,
            addition: addition || undefined,
            lot: lot || undefined,
            block: block || undefined,
            metesAndBounds: metesAndBounds || undefined,
            marketValue: marketValue ? Math.round(parseFloat(marketValue) * 100) : undefined,
            totalTax: totalTax ? Math.round(parseFloat(totalTax) * 100) : undefined,
            countyPropertyType: countyPropertyType || undefined,
            homestead,
            schoolDistrict: schoolDistrict || undefined,
          },
          notes: notes || undefined,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setSuccess('Property updated successfully.');
      } else {
        setError(data.error?.message || 'Failed to update property');
      }
    } catch {
      setError('Failed to update property');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to archive this property?')) return;

    try {
      const res = await fetch(`/api/llcs/${llcId}/properties/${propertyId}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.ok) {
        router.push(`/llcs/${llcId}/properties`);
      } else {
        alert(data.error?.message || 'Failed to archive property');
      }
    } catch {
      alert('Failed to archive property');
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading property...</div>;
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link
          href={`/llcs/${llcId}/properties/${propertyId}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to Property
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">Edit Property</h1>

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

        {/* Basic Info */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Basic Information</h2>

          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Property Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="type" className="block text-sm font-medium mb-2">
                Type
              </label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="mixed">Mixed Use</option>
              </select>
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
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="sold">Sold</option>
              </select>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Address</h2>

          <div>
            <label htmlFor="street1" className="block text-sm font-medium mb-2">
              Street Address *
            </label>
            <input
              id="street1"
              type="text"
              value={street1}
              onChange={(e) => setStreet1(e.target.value)}
              required
              className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label htmlFor="street2" className="block text-sm font-medium mb-2">
              Apt / Suite / Unit
            </label>
            <input
              id="street2"
              type="text"
              value={street2}
              onChange={(e) => setStreet2(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-6 gap-4">
            <div className="col-span-3">
              <label htmlFor="city" className="block text-sm font-medium mb-2">
                City *
              </label>
              <input
                id="city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="col-span-1">
              <label htmlFor="state" className="block text-sm font-medium mb-2">
                State *
              </label>
              <input
                id="state"
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 2))}
                required
                maxLength={2}
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring uppercase"
              />
            </div>
            <div className="col-span-2">
              <label htmlFor="zipCode" className="block text-sm font-medium mb-2">
                ZIP *
              </label>
              <input
                id="zipCode"
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value.replace(/[^\d-]/g, '').slice(0, 10))}
                required
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* Property Details */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Property Details</h2>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="county" className="block text-sm font-medium mb-2">
                County
              </label>
              <input
                id="county"
                type="text"
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="yearBuilt" className="block text-sm font-medium mb-2">
                Year Built
              </label>
              <input
                id="yearBuilt"
                type="number"
                min="1600"
                max="2100"
                value={yearBuilt}
                onChange={(e) => setYearBuilt(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="purchaseDate" className="block text-sm font-medium mb-2">
                Purchase Date
              </label>
              <input
                id="purchaseDate"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label htmlFor="purchasePrice" className="block text-sm font-medium mb-2">
              Purchase Price ($)
            </label>
            <input
              id="purchasePrice"
              type="number"
              step="0.01"
              min="0"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* County / Parcel Info */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium">County Parcel Record</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="pid" className="block text-sm font-medium mb-2">
                County Parcel ID (PID)
              </label>
              <input
                id="pid"
                type="text"
                value={pid}
                onChange={(e) => setPid(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="parcelAreaSqft" className="block text-sm font-medium mb-2">
                Parcel Area (sq ft)
              </label>
              <input
                id="parcelAreaSqft"
                type="number"
                min="0"
                value={parcelAreaSqft}
                onChange={(e) => setParcelAreaSqft(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <label htmlFor="torrensAbstract" className="block text-sm font-medium mb-2">
                Torrens/Abstract
              </label>
              <select
                id="torrensAbstract"
                value={torrensAbstract}
                onChange={(e) => setTorrensAbstract(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">—</option>
                <option value="torrens">Torrens</option>
                <option value="abstract">Abstract</option>
              </select>
            </div>
            <div>
              <label htmlFor="addition" className="block text-sm font-medium mb-2">
                Addition
              </label>
              <input
                id="addition"
                type="text"
                value={addition}
                onChange={(e) => setAddition(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="lot" className="block text-sm font-medium mb-2">
                Lot
              </label>
              <input
                id="lot"
                type="text"
                value={lot}
                onChange={(e) => setLot(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="block" className="block text-sm font-medium mb-2">
                Block
              </label>
              <input
                id="block"
                type="text"
                value={block}
                onChange={(e) => setBlock(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label htmlFor="metesAndBounds" className="block text-sm font-medium mb-2">
              Metes & Bounds / Legal Description
            </label>
            <input
              id="metesAndBounds"
              type="text"
              value={metesAndBounds}
              onChange={(e) => setMetesAndBounds(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="marketValue" className="block text-sm font-medium mb-2">
                Market Value ($)
              </label>
              <input
                id="marketValue"
                type="number"
                step="0.01"
                min="0"
                value={marketValue}
                onChange={(e) => setMarketValue(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="totalTax" className="block text-sm font-medium mb-2">
                Annual Tax ($)
              </label>
              <input
                id="totalTax"
                type="number"
                step="0.01"
                min="0"
                value={totalTax}
                onChange={(e) => setTotalTax(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="countyPropertyType" className="block text-sm font-medium mb-2">
                Co. Property Type
              </label>
              <input
                id="countyPropertyType"
                type="text"
                value={countyPropertyType}
                onChange={(e) => setCountyPropertyType(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-3 pt-6">
              <input
                id="homestead"
                type="checkbox"
                checked={homestead}
                onChange={(e) => setHomestead(e.target.checked)}
                className="w-4 h-4 rounded border-input"
              />
              <label htmlFor="homestead" className="text-sm font-medium">
                Homestead
              </label>
            </div>
            <div>
              <label htmlFor="schoolDistrict" className="block text-sm font-medium mb-2">
                School District
              </label>
              <input
                id="schoolDistrict"
                type="text"
                value={schoolDistrict}
                onChange={(e) => setSchoolDistrict(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
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
            rows={3}
            className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4">
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving || !street1 || !city || !state || !zipCode}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <Link
              href={`/llcs/${llcId}/properties/${propertyId}`}
              className="px-6 py-2 border border-input rounded-md hover:bg-secondary transition-colors"
            >
              Cancel
            </Link>
          </div>
          <button
            type="button"
            onClick={handleDelete}
            className="text-sm text-destructive hover:underline"
          >
            Archive Property
          </button>
        </div>
      </form>
    </div>
  );
}
