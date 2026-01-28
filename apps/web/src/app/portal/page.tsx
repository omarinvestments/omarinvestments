import Link from 'next/link';

export default function PortalHomePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Welcome</h1>
      <p className="text-muted-foreground mb-8">
        View your lease details, check your balance, and make payments.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/portal/leases"
          className="p-6 border rounded-lg hover:border-primary transition-colors"
        >
          <h2 className="font-semibold mb-2">My Leases</h2>
          <p className="text-sm text-muted-foreground">
            View your active lease agreements
          </p>
        </Link>

        <Link
          href="/portal/charges"
          className="p-6 border rounded-lg hover:border-primary transition-colors"
        >
          <h2 className="font-semibold mb-2">Balance Due</h2>
          <p className="text-sm text-muted-foreground">
            Check your current balance and charges
          </p>
        </Link>

        <Link
          href="/portal/payments"
          className="p-6 border rounded-lg hover:border-primary transition-colors"
        >
          <h2 className="font-semibold mb-2">Payment History</h2>
          <p className="text-sm text-muted-foreground">
            View your past payments and receipts
          </p>
        </Link>
      </div>
    </div>
  );
}
