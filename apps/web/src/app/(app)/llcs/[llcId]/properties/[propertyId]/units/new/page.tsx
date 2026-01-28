'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { use } from 'react';

interface NewUnitPageProps {
  params: Promise<{ llcId: string; propertyId: string }>;
}

export default function NewUnitPage({ params }: NewUnitPageProps) {
  const { llcId, propertyId } = use(params);
  const router = useRouter();

  const [unitNumber, setUnitNumber] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [sqft, setSqft] = useState('');
  const [status, setStatus] = useState('available');
  const [marketRent, setMarketRent] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const res = await fetch(`/api/llcs/${llcId}/properties/${propertyId}/units`, {
        method: 'POST',
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
        router.push(`/llcs/${llcId}/properties/${propertyId}/units`);
      } else {
        setError(data.error?.message || 'Failed to create unit');
      }
    } catch {
      setError('Failed to create unit');
    } finally {
      setSaving(false);
    }
  };

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

      <h1 className="text-2xl font-bold mb-6">Add Unit</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
            {error}
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
            placeholder="e.g. 101, A, Suite 200"
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

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={saving || !unitNumber}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create Unit'}
          </button>
          <Link
            href={`/llcs/${llcId}/properties/${propertyId}/units`}
            className="px-6 py-2 border border-input rounded-md hover:bg-secondary transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
