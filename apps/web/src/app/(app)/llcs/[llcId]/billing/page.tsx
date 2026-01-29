import { adminDb } from '@/lib/firebase/admin';
import Link from 'next/link';

interface BillingPageProps {
  params: Promise<{ llcId: string }>;
}

interface BillingStats {
  totalCharges: number;
  totalPaid: number;
  outstanding: number;
  overdue: number;
  openChargeCount: number;
  overdueChargeCount: number;
  recentCharges: {
    id: string;
    leaseId: string;
    type: string;
    amount: number;
    paidAmount: number;
    status: string;
    dueDate: string;
  }[];
  recentPayments: {
    id: string;
    leaseId: string;
    amount: number;
    paymentMethod: string;
    createdAt: string;
  }[];
}

async function getBillingStats(llcId: string): Promise<BillingStats> {
  const llcRef = adminDb.collection('llcs').doc(llcId);
  const today = new Date().toISOString().split('T')[0] || '';

  // Fetch charges and payments in parallel
  const [chargesSnap, paymentsSnap] = await Promise.all([
    llcRef.collection('charges').orderBy('dueDate', 'desc').limit(100).get(),
    llcRef.collection('payments').orderBy('createdAt', 'desc').limit(10).get(),
  ]);

  let totalCharges = 0;
  let totalPaid = 0;
  let outstanding = 0;
  let overdue = 0;
  let openChargeCount = 0;
  let overdueChargeCount = 0;

  const recentCharges: BillingStats['recentCharges'] = [];

  for (const doc of chargesSnap.docs) {
    const data = doc.data();

    if (data.status === 'void') continue;

    totalCharges += data.amount || 0;
    totalPaid += data.paidAmount || 0;

    if (data.status === 'open' || data.status === 'partial') {
      const remaining = (data.amount || 0) - (data.paidAmount || 0);
      outstanding += remaining;
      openChargeCount++;

      if (data.dueDate < today) {
        overdue += remaining;
        overdueChargeCount++;
      }
    }

    // Collect recent charges (first 10)
    if (recentCharges.length < 10) {
      recentCharges.push({
        id: doc.id,
        leaseId: data.leaseId,
        type: data.type,
        amount: data.amount,
        paidAmount: data.paidAmount || 0,
        status: data.status,
        dueDate: data.dueDate,
      });
    }
  }

  const recentPayments: BillingStats['recentPayments'] = paymentsSnap.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      leaseId: data.leaseId,
      amount: data.amount,
      paymentMethod: data.paymentMethod?.type || 'unknown',
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    };
  });

  return {
    totalCharges,
    totalPaid,
    outstanding,
    overdue,
    openChargeCount,
    overdueChargeCount,
    recentCharges,
    recentPayments,
  };
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(iso: string): string {
  const dateStr = iso.substring(0, 10);
  const parts = dateStr.split('-').map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (!year || !month || !day) return iso;
  return new Date(year, month - 1, day).toLocaleDateString();
}

const CHARGE_TYPE_LABELS: Record<string, string> = {
  rent: 'Rent',
  late_fee: 'Late Fee',
  utility: 'Utility',
  deposit: 'Deposit',
  pet_deposit: 'Pet Deposit',
  pet_rent: 'Pet Rent',
  parking: 'Parking',
  damage: 'Damage',
  other: 'Other',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  check: 'Check',
  money_order: 'Money Order',
  bank_transfer: 'Bank Transfer',
  card: 'Card',
  us_bank_account: 'Bank Account',
  other: 'Other',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  partial: 'bg-blue-100 text-blue-800',
  void: 'bg-gray-100 text-gray-500',
};

export default async function BillingPage({ params }: BillingPageProps) {
  const { llcId } = await params;
  const stats = await getBillingStats(llcId);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Billing</h1>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Total Billed</div>
          <div className="text-2xl font-bold">{formatCurrency(stats.totalCharges)}</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Total Collected</div>
          <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalPaid)}</div>
        </div>
        <Link href={`/llcs/${llcId}/billing/charges?status=open`} className="p-4 border rounded-lg hover:bg-secondary/30 transition-colors">
          <div className="text-sm text-muted-foreground">Outstanding</div>
          <div className={`text-2xl font-bold ${stats.outstanding > 0 ? 'text-yellow-600' : ''}`}>
            {formatCurrency(stats.outstanding)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {stats.openChargeCount} open charge{stats.openChargeCount !== 1 ? 's' : ''}
          </div>
        </Link>
        <Link href={`/llcs/${llcId}/billing/charges?status=open`} className="p-4 border rounded-lg hover:bg-secondary/30 transition-colors">
          <div className="text-sm text-muted-foreground">Overdue</div>
          <div className={`text-2xl font-bold ${stats.overdue > 0 ? 'text-red-600' : ''}`}>
            {formatCurrency(stats.overdue)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {stats.overdueChargeCount} overdue charge{stats.overdueChargeCount !== 1 ? 's' : ''}
          </div>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Link
          href={`/llcs/${llcId}/billing/charges`}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 transition-opacity"
        >
          View All Charges
        </Link>
        <Link
          href={`/llcs/${llcId}/billing/payments`}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 transition-opacity"
        >
          View All Payments
        </Link>
        <Link
          href={`/llcs/${llcId}/billing/charges?status=open`}
          className="px-4 py-2 border rounded-md text-sm hover:bg-secondary transition-colors"
        >
          View Open Charges
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Charges */}
        <div className="border rounded-lg">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold">Recent Charges</h2>
            <Link href={`/llcs/${llcId}/billing/charges`} className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          {stats.recentCharges.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No charges yet</div>
          ) : (
            <div className="divide-y">
              {stats.recentCharges.map(charge => {
                const balance = charge.amount - charge.paidAmount;
                const isOverdue = charge.status !== 'paid' && charge.status !== 'void' && charge.dueDate < (new Date().toISOString().split('T')[0] || '');

                return (
                  <div key={charge.id} className="p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {CHARGE_TYPE_LABELS[charge.type] || charge.type}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-xs ${STATUS_COLORS[charge.status] || 'bg-gray-100'}`}>
                          {charge.status}
                        </span>
                      </div>
                      <div className={`text-xs ${isOverdue ? 'text-red-600' : 'text-muted-foreground'}`}>
                        Due {formatDate(charge.dueDate)}
                        {isOverdue && ' (overdue)'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-sm">{formatCurrency(charge.amount)}</div>
                      {balance > 0 && charge.status !== 'void' && (
                        <div className="text-xs text-red-600">
                          {formatCurrency(balance)} due
                        </div>
                      )}
                    </div>
                    <Link
                      href={`/llcs/${llcId}/leases/${charge.leaseId}`}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors"
                      title="View Lease"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div className="border rounded-lg">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold">Recent Payments</h2>
            <Link href={`/llcs/${llcId}/billing/payments`} className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          {stats.recentPayments.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No payments recorded yet</div>
          ) : (
            <div className="divide-y">
              {stats.recentPayments.map(payment => (
                <div key={payment.id} className="p-4 flex items-center gap-4">
                  <div className="p-2 bg-green-100 rounded-full">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-green-600">
                      +{formatCurrency(payment.amount)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {PAYMENT_METHOD_LABELS[payment.paymentMethod] || payment.paymentMethod} &bull; {formatDate(payment.createdAt)}
                    </div>
                  </div>
                  <Link
                    href={`/llcs/${llcId}/leases/${payment.leaseId}`}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors"
                    title="View Lease"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Collection Rate */}
      {stats.totalCharges > 0 && (
        <div className="mt-8 p-4 border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Collection Rate</span>
            <span className="text-sm font-bold">
              {Math.round((stats.totalPaid / stats.totalCharges) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${Math.min(100, (stats.totalPaid / stats.totalCharges) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            <span>Collected: {formatCurrency(stats.totalPaid)}</span>
            <span>Total: {formatCurrency(stats.totalCharges)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
