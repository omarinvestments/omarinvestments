'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewLlcPage() {
  const [legalName, setLegalName] = useState('');
  const [einLast4, setEinLast4] = useState('');
  const [timezone, setTimezone] = useState('America/Chicago');
  const [lateFeeEnabled, setLateFeeEnabled] = useState(false);
  const [lateFeeAmount, setLateFeeAmount] = useState('');
  const [lateFeeGraceDays, setLateFeeGraceDays] = useState('5');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/llcs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legalName,
          einLast4: einLast4 || undefined,
          settings: {
            timezone,
            currency: 'usd',
            lateFeeEnabled,
            lateFeeAmount: lateFeeEnabled && lateFeeAmount
              ? Math.round(parseFloat(lateFeeAmount) * 100)
              : undefined,
            lateFeeGraceDays: lateFeeEnabled
              ? parseInt(lateFeeGraceDays) || 5
              : undefined,
          },
        }),
      });

      const data = await res.json();

      if (data.ok) {
        router.push(`/llcs/${data.data.id}`);
      } else {
        setError(data.error?.message || 'Failed to create LLC');
      }
    } catch (err) {
      setError('Failed to create LLC');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl p-6">
      <div className="mb-6">
        <Link href="/llcs" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Back to LLCs
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">Create New LLC</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Basic Info */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Basic Information</h2>

          <div>
            <label htmlFor="legalName" className="block text-sm font-medium mb-2">
              Legal Name *
            </label>
            <input
              id="legalName"
              type="text"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g. Omar Properties LLC"
            />
          </div>

          <div>
            <label htmlFor="einLast4" className="block text-sm font-medium mb-2">
              EIN (last 4 digits)
            </label>
            <input
              id="einLast4"
              type="text"
              value={einLast4}
              onChange={(e) => setEinLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
              maxLength={4}
              className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="1234"
            />
            <p className="text-xs text-muted-foreground mt-1">
              For reference only. Never store full EIN.
            </p>
          </div>
        </div>

        {/* Settings */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Settings</h2>

          <div>
            <label htmlFor="timezone" className="block text-sm font-medium mb-2">
              Timezone
            </label>
            <select
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="America/New_York">Eastern (New York)</option>
              <option value="America/Chicago">Central (Chicago)</option>
              <option value="America/Denver">Mountain (Denver)</option>
              <option value="America/Los_Angeles">Pacific (Los Angeles)</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="lateFeeEnabled"
              type="checkbox"
              checked={lateFeeEnabled}
              onChange={(e) => setLateFeeEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-input"
            />
            <label htmlFor="lateFeeEnabled" className="text-sm font-medium">
              Enable automatic late fees
            </label>
          </div>

          {lateFeeEnabled && (
            <div className="grid grid-cols-2 gap-4 pl-7">
              <div>
                <label htmlFor="lateFeeAmount" className="block text-sm font-medium mb-2">
                  Late Fee Amount ($)
                </label>
                <input
                  id="lateFeeAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={lateFeeAmount}
                  onChange={(e) => setLateFeeAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="50.00"
                />
              </div>
              <div>
                <label htmlFor="lateFeeGraceDays" className="block text-sm font-medium mb-2">
                  Grace Period (days)
                </label>
                <input
                  id="lateFeeGraceDays"
                  type="number"
                  min="0"
                  max="30"
                  value={lateFeeGraceDays}
                  onChange={(e) => setLateFeeGraceDays(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="5"
                />
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading || !legalName}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create LLC'}
          </button>
          <Link
            href="/llcs"
            className="px-6 py-2 border border-input rounded-md hover:bg-secondary transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
