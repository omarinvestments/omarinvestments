'use client';

import Link from 'next/link';
import { BillingTable } from '@/components/portal';

export default function PortalBillingPage() {
  return (
    <div>
      <div className="mb-6">
        <Link
          href="/portal"
          className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-block"
        >
          ← Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold">Billing & Payments</h1>
        <p className="text-muted-foreground">
          View your charges and payment history across all leases.
        </p>
      </div>

      <BillingTable />
    </div>
  );
}
