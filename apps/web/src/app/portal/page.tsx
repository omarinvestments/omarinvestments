import Link from 'next/link';
import { BalanceWidget } from '@/components/portal';

export default function PortalHomePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Welcome</h1>
      <p className="text-muted-foreground mb-8">
        View your lease details, check your balance, and make payments.
      </p>

      {/* Balance Widget */}
      <div className="mb-8">
        <BalanceWidget />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/portal/leases"
          className="p-6 border rounded-lg hover:border-primary transition-colors"
        >
          <h2 className="font-semibold mb-2">My Leases</h2>
          <p className="text-sm text-muted-foreground">
            View your active lease agreements and property details
          </p>
        </Link>

        <Link
          href="/portal/billing"
          className="p-6 border rounded-lg hover:border-primary transition-colors"
        >
          <h2 className="font-semibold mb-2">Billing & Payments</h2>
          <p className="text-sm text-muted-foreground">
            View charges, payment history, and make payments
          </p>
        </Link>

        <Link
          href="/portal/profile"
          className="p-6 border rounded-lg hover:border-primary transition-colors"
        >
          <h2 className="font-semibold mb-2">My Profile</h2>
          <p className="text-sm text-muted-foreground">
            View and update your account information
          </p>
        </Link>
      </div>
    </div>
  );
}
