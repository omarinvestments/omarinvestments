import { adminDb } from '@/lib/firebase/admin';
import Link from 'next/link';

interface LlcDashboardProps {
  params: Promise<{ llcId: string }>;
}

export default async function LlcDashboardPage({ params }: LlcDashboardProps) {
  const { llcId } = await params;

  const llcDoc = await adminDb.collection('llcs').doc(llcId).get();
  const llc = llcDoc.exists ? llcDoc.data() : null;

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Properties</div>
          <div className="text-2xl font-bold">--</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Active Leases</div>
          <div className="text-2xl font-bold">--</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Outstanding Balance</div>
          <div className="text-2xl font-bold">$--</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Open Cases</div>
          <div className="text-2xl font-bold">--</div>
        </div>
      </div>
    </div>
  );
}
