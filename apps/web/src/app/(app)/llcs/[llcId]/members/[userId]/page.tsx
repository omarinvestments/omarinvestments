'use client';

import { useEffect, useState, useCallback, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';

interface MemberDetail {
  userId: string;
  email: string;
  displayName: string | null;
  role: string;
  status: string;
  propertyScopes: string[];
  caseScopes: string[];
  invitedBy?: string;
  invitedAt?: string;
  joinedAt?: string;
  createdAt: string;
}

interface EditMemberPageProps {
  params: Promise<{ llcId: string; userId: string }>;
}

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'accounting', label: 'Accounting' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'legal', label: 'Legal' },
  { value: 'readOnly', label: 'Read Only' },
];

const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'invited', label: 'Invited' },
  { value: 'disabled', label: 'Disabled' },
];

export default function EditMemberPage({ params }: EditMemberPageProps) {
  const { llcId, userId } = use(params);
  const router = useRouter();

  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [propertyScopes, setPropertyScopes] = useState('');
  const [caseScopes, setCaseScopes] = useState('');

  const fetchMember = useCallback(async () => {
    try {
      const res = await fetch(`/api/llcs/${llcId}/members/${userId}`);
      const data = await res.json();

      if (data.ok) {
        const m: MemberDetail = data.data;
        setMember(m);
        setRole(m.role);
        setStatus(m.status);
        setPropertyScopes(m.propertyScopes.join(', '));
        setCaseScopes(m.caseScopes.join(', '));
      } else {
        setError(data.error?.message || 'Failed to load member');
      }
    } catch {
      setError('Failed to load member');
    } finally {
      setLoading(false);
    }
  }, [llcId, userId]);

  useEffect(() => {
    fetchMember();
  }, [fetchMember]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const body: {
        role?: string;
        status?: string;
        propertyScopes?: string[];
        caseScopes?: string[];
      } = {};

      if (role !== member?.role) {
        body.role = role;
      }
      if (status !== member?.status) {
        body.status = status;
      }

      const parsedPropertyScopes = propertyScopes
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const parsedCaseScopes = caseScopes
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      if (JSON.stringify(parsedPropertyScopes) !== JSON.stringify(member?.propertyScopes)) {
        body.propertyScopes = parsedPropertyScopes;
      }
      if (JSON.stringify(parsedCaseScopes) !== JSON.stringify(member?.caseScopes)) {
        body.caseScopes = parsedCaseScopes;
      }

      if (Object.keys(body).length === 0) {
        setSuccess('No changes to save.');
        setSubmitting(false);
        return;
      }

      const res = await fetch(`/api/llcs/${llcId}/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.ok) {
        setSuccess('Member updated successfully.');
        setMember(data.data);
      } else {
        setError(data.error?.message || 'Failed to update member');
      }
    } catch {
      setError('Failed to update member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async () => {
    const name = member?.displayName || member?.email || 'this member';
    if (!confirm(`Are you sure you want to remove "${name}" from this LLC? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/llcs/${llcId}/members/${userId}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.ok) {
        router.push(`/llcs/${llcId}/members`);
      } else {
        setError(data.error?.message || 'Failed to remove member');
      }
    } catch {
      setError('Failed to remove member');
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading member...</div>;
  }

  if (!member) {
    return <div className="text-destructive">{error || 'Member not found'}</div>;
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-2">Edit Member</h1>
      <p className="text-muted-foreground text-sm mb-6">
        {member.displayName || member.email}
        {member.displayName && (
          <span className="ml-2 text-xs">({member.email})</span>
        )}
      </p>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 text-green-800 rounded-md text-sm">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="role" className="block text-sm font-medium mb-1">
            Role
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
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium mb-1">
            Status
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-background text-sm"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="propertyScopes" className="block text-sm font-medium mb-1">
            Property Scopes
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
            Comma-separated property IDs. Leave blank for all properties.
          </p>
        </div>

        <div>
          <label htmlFor="caseScopes" className="block text-sm font-medium mb-1">
            Case Scopes
          </label>
          <input
            id="caseScopes"
            type="text"
            value={caseScopes}
            onChange={(e) => setCaseScopes(e.target.value)}
            placeholder="case-id-1, case-id-2"
            className="w-full px-3 py-2 border rounded-md bg-background text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Comma-separated case IDs. Leave blank for all cases.
          </p>
        </div>

        <div className="text-xs text-muted-foreground space-y-1 pt-2">
          {member.invitedAt && <p>Invited: {new Date(member.invitedAt).toLocaleDateString()}</p>}
          {member.joinedAt && <p>Joined: {new Date(member.joinedAt).toLocaleDateString()}</p>}
          <p>Added: {new Date(member.createdAt).toLocaleDateString()}</p>
        </div>

        <div className="flex items-center justify-between pt-4">
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity text-sm disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/llcs/${llcId}/members`)}
              className="px-4 py-2 border rounded-md text-sm hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="px-4 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors"
          >
            Remove Member
          </button>
        </div>
      </form>
    </div>
  );
}
