'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { use } from 'react';

interface BillingSettingsPageProps {
  params: Promise<{ llcId: string }>;
}

interface LateFeeSettings {
  lateFeeEnabled: boolean;
  lateFeeType?: 'flat' | 'percentage';
  lateFeeAmount?: number;
  lateFeeMaxAmount?: number;
  lateFeeGraceDays?: number;
}

interface OverdueCharge {
  id: string;
  leaseId: string;
  period: string;
  type: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  daysOverdue: number;
  lateFeeAppliedAt?: string;
}

function formatMoney(cents: number): string {
  return '$' + (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 });
}

export default function BillingSettingsPage({ params }: BillingSettingsPageProps) {
  const { llcId } = use(params);

  const [settings, setSettings] = useState<LateFeeSettings>({
    lateFeeEnabled: false,
    lateFeeType: 'flat',
    lateFeeAmount: 0,
    lateFeeMaxAmount: undefined,
    lateFeeGraceDays: 5,
  });
  const [overdueCharges, setOverdueCharges] = useState<OverdueCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [settingsRes, chargesRes] = await Promise.all([
        fetch(`/api/llcs/${llcId}/settings/late-fees`),
        fetch(`/api/llcs/${llcId}/charges?status=open`),
      ]);

      const settingsData = await settingsRes.json();
      if (settingsData.ok) {
        setSettings(settingsData.data);
      }

      // Get overdue charges (due date in the past)
      const chargesData = await chargesRes.json();
      if (chargesData.ok) {
        const graceDays = settingsData.data?.lateFeeGraceDays ?? 5;
        const graceCutoff = new Date();
        graceCutoff.setDate(graceCutoff.getDate() - graceDays);
        const graceCutoffStr = graceCutoff.toISOString().slice(0, 10);

        const overdue = chargesData.data
          .filter((c: OverdueCharge) => c.dueDate < graceCutoffStr && c.type !== 'late_fee')
          .map((c: OverdueCharge) => {
            const dueDate = new Date(c.dueDate);
            const daysOverdue = Math.floor((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            return { ...c, daysOverdue };
          });
        setOverdueCharges(overdue);
      }
    } catch {
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [llcId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const res = await fetch(`/api/llcs/${llcId}/settings/late-fees`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lateFeeEnabled: settings.lateFeeEnabled,
          lateFeeType: settings.lateFeeType,
          lateFeeAmount: settings.lateFeeType === 'flat'
            ? Math.round((settings.lateFeeAmount || 0) * 100)
            : settings.lateFeeAmount,
          lateFeeMaxAmount: settings.lateFeeMaxAmount
            ? Math.round(settings.lateFeeMaxAmount * 100)
            : undefined,
          lateFeeGraceDays: settings.lateFeeGraceDays,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setSuccess('Settings saved successfully');
        fetchData();
      } else {
        setError(data.error?.message || 'Failed to save settings');
      }
    } catch {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyLateFee = async (chargeId: string) => {
    if (!confirm('Apply late fee to this charge?')) return;

    try {
      const res = await fetch(`/api/llcs/${llcId}/charges/${chargeId}/apply-late-fee`, {
        method: 'POST',
      });

      const data = await res.json();

      if (data.ok) {
        alert(`Late fee of ${formatMoney(data.data.lateFeeAmount)} applied successfully`);
        fetchData();
      } else {
        alert(data.error?.message || 'Failed to apply late fee');
      }
    } catch {
      alert('Failed to apply late fee');
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading settings...</div>;
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link
          href={`/llcs/${llcId}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          &larr; Back to Dashboard
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">Billing Settings</h1>

      <form onSubmit={handleSave} className="space-y-6">
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

        {/* Late Fee Settings */}
        <div className="border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-medium">Late Fee Configuration</h2>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="lateFeeEnabled"
              checked={settings.lateFeeEnabled}
              onChange={(e) => setSettings((prev) => ({ ...prev, lateFeeEnabled: e.target.checked }))}
              className="w-4 h-4"
            />
            <label htmlFor="lateFeeEnabled" className="text-sm font-medium">
              Enable late fees
            </label>
          </div>

          {settings.lateFeeEnabled && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Fee Type</label>
                  <select
                    value={settings.lateFeeType}
                    onChange={(e) => setSettings((prev) => ({
                      ...prev,
                      lateFeeType: e.target.value as 'flat' | 'percentage',
                    }))}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="flat">Flat Amount</option>
                    <option value="percentage">Percentage of Balance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {settings.lateFeeType === 'flat' ? 'Fee Amount ($)' : 'Fee Percentage (%)'}
                  </label>
                  <input
                    type="number"
                    step={settings.lateFeeType === 'flat' ? '0.01' : '0.1'}
                    min="0"
                    value={settings.lateFeeType === 'flat'
                      ? ((settings.lateFeeAmount || 0) / 100).toString()
                      : (settings.lateFeeAmount || 0).toString()}
                    onChange={(e) => setSettings((prev) => ({
                      ...prev,
                      lateFeeAmount: settings.lateFeeType === 'flat'
                        ? parseFloat(e.target.value) * 100
                        : parseFloat(e.target.value),
                    }))}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    placeholder={settings.lateFeeType === 'flat' ? '50.00' : '5'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Grace Period (days)</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={settings.lateFeeGraceDays ?? 5}
                    onChange={(e) => setSettings((prev) => ({
                      ...prev,
                      lateFeeGraceDays: parseInt(e.target.value),
                    }))}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Days after due date before late fee applies
                  </p>
                </div>
                {settings.lateFeeType === 'percentage' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Maximum Fee ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={settings.lateFeeMaxAmount ? (settings.lateFeeMaxAmount / 100).toString() : ''}
                      onChange={(e) => setSettings((prev) => ({
                        ...prev,
                        lateFeeMaxAmount: e.target.value ? parseFloat(e.target.value) * 100 : undefined,
                      }))}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      placeholder="Optional cap"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Optional maximum late fee amount
                    </p>
                  </div>
                )}
              </div>

              {/* Preview */}
              <div className="p-3 bg-secondary/30 rounded-md text-sm">
                <strong>Example:</strong> For a $1,000 balance,{' '}
                {settings.lateFeeType === 'flat' ? (
                  <>late fee would be {formatMoney(settings.lateFeeAmount || 0)}</>
                ) : (
                  <>
                    late fee would be {formatMoney(Math.round(100000 * (settings.lateFeeAmount || 0) / 100))}
                    {settings.lateFeeMaxAmount && (
                      <> (capped at {formatMoney(settings.lateFeeMaxAmount)})</>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>

      {/* Overdue Charges Section */}
      {settings.lateFeeEnabled && overdueCharges.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-medium mb-4">
            Overdue Charges ({overdueCharges.length})
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            These charges are past the grace period and can have late fees applied.
          </p>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Charge</th>
                  <th className="text-left px-4 py-3 font-medium">Due Date</th>
                  <th className="text-left px-4 py-3 font-medium">Days Overdue</th>
                  <th className="text-right px-4 py-3 font-medium">Balance</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {overdueCharges.map((charge) => (
                  <tr key={charge.id} className="hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <div className="font-medium capitalize">{charge.type}</div>
                      <div className="text-xs text-muted-foreground">{charge.period}</div>
                    </td>
                    <td className="px-4 py-3 text-red-600">{charge.dueDate}</td>
                    <td className="px-4 py-3">
                      <span className="text-red-600 font-medium">{charge.daysOverdue} days</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatMoney(charge.amount - charge.paidAmount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {charge.lateFeeAppliedAt ? (
                        <span className="text-xs text-muted-foreground">Fee applied</span>
                      ) : (
                        <button
                          onClick={() => handleApplyLateFee(charge.id)}
                          className="text-xs text-orange-600 hover:text-orange-800 font-medium"
                        >
                          Apply Late Fee
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
