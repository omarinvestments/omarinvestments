import { adminDb } from '@/lib/firebase/admin';
import Link from 'next/link';

interface LlcDashboardProps {
  params: Promise<{ llcId: string }>;
}

interface LlcStats {
  propertyCount: number;
  unitCount: number;
  occupiedUnits: number;
  activeLeases: number;
  leasesExpiringSoon: number;
  outstandingBalance: number;
  openCases: number;
}

async function getLlcStats(llcId: string): Promise<LlcStats> {
  const llcRef = adminDb.collection('llcs').doc(llcId);

  // Fetch all data in parallel
  const [
    propertiesSnap,
    leasesSnap,
    chargesSnap,
    casesSnap,
  ] = await Promise.all([
    llcRef.collection('properties').get(),
    llcRef.collection('leases').get(),
    llcRef.collection('charges').where('status', 'in', ['open', 'partial']).get(),
    llcRef.collection('cases').where('status', '==', 'open').get(),
  ]);

  // Count properties
  const propertyCount = propertiesSnap.size;

  // Count units across all properties
  let unitCount = 0;
  let occupiedUnits = 0;
  for (const propDoc of propertiesSnap.docs) {
    const unitsSnap = await llcRef
      .collection('properties')
      .doc(propDoc.id)
      .collection('units')
      .get();
    unitCount += unitsSnap.size;
    occupiedUnits += unitsSnap.docs.filter(u => u.data().status === 'occupied').length;
  }

  // Count active leases and leases expiring within 60 days
  const today = new Date();
  const sixtyDaysFromNow = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
  const sixtyDaysIso = sixtyDaysFromNow.toISOString().split('T')[0] || '';

  let activeLeases = 0;
  let leasesExpiringSoon = 0;
  for (const leaseDoc of leasesSnap.docs) {
    const lease = leaseDoc.data();
    if (lease.status === 'active') {
      activeLeases++;
      // Check if lease ends within 60 days
      const endDate = lease.endDate?.substring(0, 10);
      if (endDate && sixtyDaysIso && endDate <= sixtyDaysIso) {
        leasesExpiringSoon++;
      }
    }
  }

  // Calculate outstanding balance (sum of unpaid charges)
  let outstandingBalance = 0;
  for (const chargeDoc of chargesSnap.docs) {
    const charge = chargeDoc.data();
    const amount = charge.amount || 0;
    const paidAmount = charge.paidAmount || 0;
    outstandingBalance += amount - paidAmount;
  }

  // Count open cases
  const openCases = casesSnap.size;

  return {
    propertyCount,
    unitCount,
    occupiedUnits,
    activeLeases,
    leasesExpiringSoon,
    outstandingBalance,
    openCases,
  };
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export default async function LlcDashboardPage({ params }: LlcDashboardProps) {
  const { llcId } = await params;

  const [llcDoc, stats] = await Promise.all([
    adminDb.collection('llcs').doc(llcId).get(),
    getLlcStats(llcId),
  ]);
  const llc = llcDoc.exists ? llcDoc.data() : null;

  const occupancyRate = stats.unitCount > 0
    ? Math.round((stats.occupiedUnits / stats.unitCount) * 100)
    : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          {llc?.legalName || 'LLC Dashboard'}
        </h1>
        <Link
          href={`/llcs/${llcId}/settings`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Settings
        </Link>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Link href={`/llcs/${llcId}/properties`} className="p-4 border rounded-lg hover:bg-secondary/30 transition-colors">
          <div className="text-sm text-muted-foreground">Properties</div>
          <div className="text-2xl font-bold">{stats.propertyCount}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {stats.unitCount} unit{stats.unitCount !== 1 ? 's' : ''} total
          </div>
        </Link>
        <Link href={`/llcs/${llcId}/leases`} className="p-4 border rounded-lg hover:bg-secondary/30 transition-colors">
          <div className="text-sm text-muted-foreground">Active Leases</div>
          <div className="text-2xl font-bold">{stats.activeLeases}</div>
          {stats.leasesExpiringSoon > 0 && (
            <div className="text-xs text-yellow-600 mt-1">
              {stats.leasesExpiringSoon} expiring soon
            </div>
          )}
        </Link>
        <Link href={`/llcs/${llcId}/billing`} className="p-4 border rounded-lg hover:bg-secondary/30 transition-colors">
          <div className="text-sm text-muted-foreground">Outstanding Balance</div>
          <div className={`text-2xl font-bold ${stats.outstandingBalance > 0 ? 'text-red-600' : ''}`}>
            {formatCurrency(stats.outstandingBalance)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            unpaid charges
          </div>
        </Link>
        <Link href={`/llcs/${llcId}/legal`} className="p-4 border rounded-lg hover:bg-secondary/30 transition-colors">
          <div className="text-sm text-muted-foreground">Open Cases</div>
          <div className={`text-2xl font-bold ${stats.openCases > 0 ? 'text-orange-600' : ''}`}>
            {stats.openCases}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            legal matters
          </div>
        </Link>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Occupancy Rate</div>
          <div className="text-2xl font-bold">{occupancyRate}%</div>
          <div className="text-xs text-muted-foreground mt-1">
            {stats.occupiedUnits} of {stats.unitCount} units occupied
          </div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Units Available</div>
          <div className="text-2xl font-bold">{stats.unitCount - stats.occupiedUnits}</div>
          <div className="text-xs text-muted-foreground mt-1">
            ready to lease
          </div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Lease Renewals Needed</div>
          <div className={`text-2xl font-bold ${stats.leasesExpiringSoon > 0 ? 'text-yellow-600' : ''}`}>
            {stats.leasesExpiringSoon}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            within 60 days
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/llcs/${llcId}/properties/new`}
            className="px-4 py-2 border rounded-md text-sm hover:bg-secondary transition-colors"
          >
            + Add Property
          </Link>
          <Link
            href={`/llcs/${llcId}/tenants/new`}
            className="px-4 py-2 border rounded-md text-sm hover:bg-secondary transition-colors"
          >
            + Add Tenant
          </Link>
          <Link
            href={`/llcs/${llcId}/leases/new`}
            className="px-4 py-2 border rounded-md text-sm hover:bg-secondary transition-colors"
          >
            + Create Lease
          </Link>
          <Link
            href={`/llcs/${llcId}/legal/new`}
            className="px-4 py-2 border rounded-md text-sm hover:bg-secondary transition-colors"
          >
            + New Case
          </Link>
        </div>
      </div>
    </div>
  );
}
