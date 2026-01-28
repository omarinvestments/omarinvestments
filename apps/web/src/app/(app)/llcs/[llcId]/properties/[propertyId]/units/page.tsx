'use client';

import Link from 'next/link';
import { use } from 'react';
import { PropertyUnitsTable } from '@/components/PropertyUnitsTable';

interface UnitsPageProps {
  params: Promise<{ llcId: string; propertyId: string }>;
}

export default function UnitsPage({ params }: UnitsPageProps) {
  const { llcId, propertyId } = use(params);

  return (
    <div>
      <div className="mb-4">
        <Link
          href={`/llcs/${llcId}/properties/${propertyId}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to Property
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Units</h1>
        <Link
          href={`/llcs/${llcId}/properties/${propertyId}/units/new`}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity text-sm"
        >
          + Add Unit
        </Link>
      </div>

      <PropertyUnitsTable llcId={llcId} propertyId={propertyId} />
    </div>
  );
}
