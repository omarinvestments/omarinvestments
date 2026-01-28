'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { use } from 'react';

interface MemberItem {
  userId: string;
  email: string;
  displayName: string | null;
  role: string;
  status: string;
  propertyScopes: string[];
  caseScopes: string[];
  invitedBy?: string;
  createdAt: string;
}

interface MembersPageProps {
  params: Promise<{ llcId: string }>;
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  invited: 'bg-yellow-100 text-yellow-800',
  disabled: 'bg-gray-100 text-gray-600',
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  accounting: 'Accounting',
  maintenance: 'Maintenance',
  legal: 'Legal',
  tenant: 'Tenant',
  readOnly: 'Read Only',
};

export default function MembersPage({ params }: MembersPageProps) {
  const { llcId } = use(params);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/llcs/${llcId}/members`);
      const data = await res.json();

      if (data.ok) {
        setMembers(data.data);
      } else {
        setError(data.error?.message || 'Failed to load members');
      }
    } catch {
      setError('Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [llcId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleRemove = async (userId: string, displayName: string) => {
    if (!confirm(`Are you sure you want to remove "${displayName}" from this LLC? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/llcs/${llcId}/members/${userId}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.ok) {
        setMembers((prev) => prev.filter((m) => m.userId !== userId));
      } else {
        alert(data.error?.message || 'Failed to remove member');
      }
    } catch {
      alert('Failed to remove member');
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading members...</div>;
  }

  if (error) {
    return <div className="text-destructive">{error}</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Members</h1>
        <Link
          href={`/llcs/${llcId}/members/invite`}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity text-sm"
        >
          + Invite Member
        </Link>
      </div>

      {members.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            No members yet. Invite your first team member.
          </p>
          <Link
            href={`/llcs/${llcId}/members/invite`}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity text-sm"
          >
            Invite Member
          </Link>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Member</th>
                <th className="text-left px-4 py-3 font-medium">Role</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Scopes</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {members.map((member) => {
                const name = member.displayName || member.email;
                return (
                  <tr key={member.userId} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/llcs/${llcId}/members/${member.userId}`}
                        className="hover:underline"
                      >
                        <div className="font-medium">{name}</div>
                        {member.displayName && (
                          <div className="text-muted-foreground text-xs">{member.email}</div>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {ROLE_LABELS[member.role] || member.role}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs ${
                          STATUS_STYLES[member.status] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {member.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {member.propertyScopes.length > 0
                        ? `${member.propertyScopes.length} properties`
                        : 'All'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/llcs/${llcId}/members/${member.userId}`}
                        className="text-xs text-muted-foreground hover:text-foreground mr-3"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleRemove(member.userId, name)}
                        className="text-xs text-muted-foreground hover:text-destructive"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
