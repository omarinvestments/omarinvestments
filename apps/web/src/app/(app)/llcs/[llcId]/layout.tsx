import { ReactNode } from 'react';
import { adminDb } from '@/lib/firebase/admin';
import LlcSidebar from '@/components/LlcSidebar';

interface LlcLayoutProps {
  children: ReactNode;
  params: Promise<{ llcId: string }>;
}

export default async function LlcLayout({ children, params }: LlcLayoutProps) {
  const { llcId } = await params;

  const llcDoc = await adminDb.collection('llcs').doc(llcId).get();
  const legalName = llcDoc.exists ? llcDoc.data()?.legalName : 'Unknown LLC';

  return (
    <div className="flex">
      <LlcSidebar llcId={llcId} legalName={legalName} />
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
