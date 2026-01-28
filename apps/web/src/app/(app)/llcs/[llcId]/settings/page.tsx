'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { use } from 'react';

interface SettingsPageProps {
  params: Promise<{ llcId: string }>;
}

export default function LlcSettingsPage({ params }: SettingsPageProps) {
  const { llcId } = use(params);
  const [legalName, setLegalName] = useState('');
  const [einLast4, setEinLast4] = useState('');
  const [timezone, setTimezone] = useState('America/Chicago');
  const [lateFeeEnabled, setLateFeeEnabled] = useState(false);
  const [lateFeeAmount, setLateFeeAmount] = useState('');
  const [lateFeeGraceDays, setLateFeeGraceDays] = useState('5');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchLlc() {
      try {
        const res = await fetch(`/api/llcs/${llcId}`);
        const data = await res.json();

        if (data.ok) {
          const llc = data.data;
          setLegalName(llc.legalName || '');
          setEinLast4(llc.einLast4 || '');
          setTimezone(llc.settings?.timezone || 'America/Chicago');
          setLateFeeEnabled(llc.settings?.lateFeeEnabled || false);
          setLateFeeAmount(
            llc.settings?.lateFeeAmount
              ? (llc.settings.lateFeeAmount / 100).toString()
              : ''
          );
          setLateFeeGraceDays(
            llc.settings?.lateFeeGraceDays?.toString() || '5'
          );
        } else {
          setError(data.error?.message || 'Failed to load LLC');
        }
      } catch (err) {
        setError('Failed to load LLC');
      } finally {
        setLoading(false);
      }
    }

    fetchLlc();
  }, [llcId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const res = await fetch(`/api/llcs/${llcId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legalName,
          einLast4: einLast4 || undefined,
          settings: {
            timezone,
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
        setSuccess('Settings saved successfully.');
      } else {
        setError(data.error?.message || 'Failed to update LLC');
      }
    } catch (err) {
      setError('Failed to update LLC');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading settings...</div>;
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href={`/llcs/${llcId}`} className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Back to Dashboard
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">LLC Settings</h1>

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
            />
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
                />
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={saving || !legalName}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <Link
            href={`/llcs/${llcId}`}
            className="px-6 py-2 border border-input rounded-md hover:bg-secondary transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
