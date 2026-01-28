'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Invitation {
  llcId: string;
  llcName: string;
  role: string;
  invitedBy?: string;
  invitedByEmail?: string;
  invitedAt?: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  legal: 'Legal',
  accounting: 'Accounting',
  maintenance: 'Maintenance',
  readOnly: 'Read Only',
};

function formatDate(iso: string | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function InvitationsPage() {
  const router = useRouter();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    try {
      const res = await fetch('/api/invitations');
      const data = await res.json();

      if (data.ok) {
        setInvitations(data.data);
      } else {
        setError(data.error?.message || 'Failed to load invitations');
      }
    } catch {
      setError('Failed to load invitations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const handleAccept = async (llcId: string) => {
    setProcessing(llcId);
    setError('');

    try {
      const res = await fetch(`/api/invitations/${llcId}/accept`, {
        method: 'POST',
      });
      const data = await res.json();

      if (data.ok) {
        // Remove from list and redirect to the LLC
        setInvitations((prev) => prev.filter((inv) => inv.llcId !== llcId));
        router.push(`/llcs/${llcId}`);
      } else {
        setError(data.error?.message || 'Failed to accept invitation');
      }
    } catch {
      setError('Failed to accept invitation');
    } finally {
      setProcessing(null);
    }
  };

  const handleDecline = async (llcId: string, llcName: string) => {
    if (!confirm(`Are you sure you want to decline the invitation to join "${llcName}"?`)) {
      return;
    }

    setProcessing(llcId);
    setError('');

    try {
      const res = await fetch(`/api/invitations/${llcId}/decline`, {
        method: 'POST',
      });
      const data = await res.json();

      if (data.ok) {
        setInvitations((prev) => prev.filter((inv) => inv.llcId !== llcId));
      } else {
        setError(data.error?.message || 'Failed to decline invitation');
      }
    } catch {
      setError('Failed to decline invitation');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">Invitations</h1>
        <p className="text-muted-foreground">Loading invitations...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Invitations</h1>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
          {error}
        </div>
      )}

      {invitations.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-secondary/20">
          <p className="text-muted-foreground">No pending invitations</p>
          <p className="text-sm text-muted-foreground mt-1">
            When someone invites you to join their organization, it will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {invitations.map((inv) => (
            <div
              key={inv.llcId}
              className="border rounded-lg p-4 bg-background"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h2 className="font-semibold text-lg">{inv.llcName}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Role: <span className="font-medium">{ROLE_LABELS[inv.role] || inv.role}</span>
                  </p>
                  {inv.invitedByEmail && (
                    <p className="text-sm text-muted-foreground">
                      Invited by: {inv.invitedByEmail}
                    </p>
                  )}
                  {inv.invitedAt && (
                    <p className="text-sm text-muted-foreground">
                      Sent: {formatDate(inv.invitedAt)}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(inv.llcId)}
                    disabled={processing === inv.llcId}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity text-sm disabled:opacity-50"
                  >
                    {processing === inv.llcId ? 'Processing...' : 'Accept'}
                  </button>
                  <button
                    onClick={() => handleDecline(inv.llcId, inv.llcName)}
                    disabled={processing === inv.llcId}
                    className="px-4 py-2 border rounded-md text-sm hover:bg-secondary transition-colors disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
