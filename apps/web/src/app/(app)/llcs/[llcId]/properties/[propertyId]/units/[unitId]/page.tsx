'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { use } from 'react';

interface EditUnitPageProps {
  params: Promise<{ llcId: string; propertyId: string; unitId: string }>;
}

export default function EditUnitPage({ params }: EditUnitPageProps) {
  const { llcId, propertyId, unitId } = use(params);
  const router = useRouter();

  const [unitNumber, setUnitNumber] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [sqft, setSqft] = useState('');
  const [status, setStatus] = useState('available');
  const [marketRent, setMarketRent] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchUnit() {
      try {
        const res = await fetch(`/api/llcs/${llcId}/properties/${propertyId}/units/${unitId}`);
        const data = await res.json();

        if (data.ok) {
          const u = data.data;
          setUnitNumber(u.unitNumber || '');
          setBedrooms(u.bedrooms?.toString() || '');
          setBathrooms(u.bathrooms?.toString() || '');
          setSqft(u.sqft?.toString() || '');
          setStatus(u.status || 'available');
          setMarketRent(u.marketRent ? (u.marketRent / 100).toString() : '');
          setNotes(u.notes || '');
        } else {
          setError(data.error?.message || 'Failed to load unit');
        }
      } catch {
        setError('Failed to load unit');
      } finally {
        setLoading(false);
      }
    }

    fetchUnit();
  }, [llcId, propertyId, unitId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const res = await fetch(`/api/llcs/${llcId}/properties/${propertyId}/units/${unitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitNumber,
          bedrooms: bedrooms ? parseInt(bedrooms) : undefined,
          bathrooms: bathrooms ? parseFloat(bathrooms) : undefined,
          sqft: sqft ? parseInt(sqft) : undefined,
          status,
          marketRent: marketRent ? Math.round(parseFloat(marketRent) * 100) : undefined,
          notes: notes || undefined,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setSuccess('Unit updated successfully.');
      } else {
        setError(data.error?.message || 'Failed to update unit');
      }
    } catch {
      setError('Failed to update unit');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this unit? This cannot be undone.')) return;

    try {
      const res = await fetch(`/api/llcs/${llcId}/properties/${propertyId}/units/${unitId}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.ok) {
        router.push(`/llcs/${llcId}/properties/${propertyId}/units`);
      } else {
        alert(data.error?.message || 'Failed to delete unit');
      }
    } catch {
      alert('Failed to delete unit');
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading unit...</div>;
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link
          href={`/llcs/${llcId}/properties/${propertyId}/units`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to Units
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">Edit Unit</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
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

        <div>
          <label htmlFor="unitNumber" className="block text-sm font-medium mb-2">
            Unit Number *
          </label>
          <input
            id="unitNumber"
            type="text"
            value={unitNumber}
            onChange={(e) => setUnitNumber(e.target.value)}
            required
            className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="bedrooms" className="block text-sm font-medium mb-2">
              Bedrooms
            </label>
            <input
              id="bedrooms"
              type="number"
              min="0"
              max="20"
              value={bedrooms}
              onChange={(e) => setBedrooms(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="bathrooms" className="block text-sm font-medium mb-2">
              Bathrooms
            </label>
            <input
              id="bathrooms"
              type="number"
              min="0"
              max="20"
              step="0.5"
              value={bathrooms}
              onChange={(e) => setBathrooms(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="sqft" className="block text-sm font-medium mb-2">
              Sq Ft
            </label>
            <input
              id="sqft"
              type="number"
              min="0"
              value={sqft}
              onChange={(e) => setSqft(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
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
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
              <option value="maintenance">Maintenance</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </div>
          <div>
            <label htmlFor="marketRent" className="block text-sm font-medium mb-2">
              Market Rent ($/mo)
            </label>
            <input
              id="marketRent"
              type="number"
              step="0.01"
              min="0"
              value={marketRent}
              onChange={(e) => setMarketRent(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

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

        <div className="flex items-center justify-between pt-4">
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving || !unitNumber}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <Link
              href={`/llcs/${llcId}/properties/${propertyId}/units`}
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
            Delete Unit
          </button>
        </div>
      </form>
    </div>
  );
}
