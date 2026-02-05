'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LeaseCard } from '@/components/portal';
import { LeaseStatus } from '@shared/types';

interface TenantLease {
  id: string;
  llcId: string;
  llcName: string;
  propertyId: string;
  propertyAddress: string;
  unitId: string;
  unitNumber: string;
  rentAmount: number;
  dueDay: number;
  startDate: string;
  endDate: string;
  status: LeaseStatus;
  balance: {
    totalCharges: number;
    totalPaid: number;
    balance: number;
    overdueAmount: number;
    openCharges: number;
  };
}

export default function PortalLeasesPage() {
  const [leases, setLeases] = useState<TenantLease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLeases() {
      try {
        const res = await fetch('/api/portal/leases');
        const data = await res.json();
        if (data.ok) {
          setLeases(data.data);
        } else {
          setError(data.error || 'Failed to load leases');
        }
      } catch (err) {
        setError('Failed to load leases');
      } finally {
        setLoading(false);
      }
    }
    fetchLeases();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href="/portal"
            className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold">My Leases</h1>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-muted/30 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-6 border rounded-lg border-destructive/50 bg-destructive/10">
          <p className="text-destructive">{error}</p>
        </div>
      ) : leases.length === 0 ? (
        <div className="p-6 text-center text-muted-foreground border rounded-lg">
          <p>No leases found.</p>
          <p className="text-sm mt-2">
            If you believe this is an error, please contact your property manager.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {leases.map((lease) => (
            <LeaseCard key={lease.id} lease={lease} />
          ))}
        </div>
      )}
    </div>
  );
}
