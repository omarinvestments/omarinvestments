'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';

interface InvitePageProps {
  params: Promise<{ llcId: string }>;
}

const ROLES = [
  { value: 'admin', label: 'Admin', description: 'Full access to all features' },
  { value: 'manager', label: 'Manager', description: 'Manage properties, tenants, and leases' },
  { value: 'accounting', label: 'Accounting', description: 'Charges, payments, bills, and ledger' },
  { value: 'maintenance', label: 'Maintenance', description: 'Properties and work orders' },
  { value: 'legal', label: 'Legal', description: 'Cases, tasks, and documents' },
  { value: 'readOnly', label: 'Read Only', description: 'View-only access' },
];

export default function InviteMemberPage({ params }: InvitePageProps) {
  const { llcId } = use(params);
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState('manager');
  const [propertyScopes, setPropertyScopes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const body: { email: string; role: string; propertyScopes?: string[] } = {
        email: email.trim(),
        role,
      };

      // Parse property scopes if provided (comma-separated IDs)
      const scopeIds = propertyScopes
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (scopeIds.length > 0) {
        body.propertyScopes = scopeIds;
      }

      const res = await fetch(`/api/llcs/${llcId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.ok) {
        router.push(`/llcs/${llcId}/members`);
      } else {
        setError(data.error?.message || 'Failed to invite member');
      }
    } catch {
      setError('Failed to invite member');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Invite Member</h1>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email Address *
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className="w-full px-3 py-2 border rounded-md bg-background text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1">
            The user must already have an account on the platform.
          </p>
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium mb-1">
            Role *
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-background text-sm"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground mt-1">
            {ROLES.find((r) => r.value === role)?.description}
          </p>
        </div>

        <div>
          <label htmlFor="propertyScopes" className="block text-sm font-medium mb-1">
            Property Scopes (optional)
          </label>
          <input
            id="propertyScopes"
            type="text"
            value={propertyScopes}
            onChange={(e) => setPropertyScopes(e.target.value)}
            placeholder="property-id-1, property-id-2"
            className="w-full px-3 py-2 border rounded-md bg-background text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Comma-separated property IDs to limit access. Leave blank for all properties.
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity text-sm disabled:opacity-50"
          >
            {submitting ? 'Inviting...' : 'Send Invite'}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/llcs/${llcId}/members`)}
            className="px-4 py-2 border rounded-md text-sm hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
