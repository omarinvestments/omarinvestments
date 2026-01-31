'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  WORK_ORDER_CATEGORIES,
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_CATEGORY_LABELS,
  WORK_ORDER_PRIORITY_LABELS,
  WorkOrderCategory,
  WorkOrderPriority,
} from '@shared/types';

interface PageProps {
  params: Promise<{ llcId: string }>;
}

interface Property {
  id: string;
  name: string;
  units?: { id: string; unitNumber: string }[];
}

export default function NewWorkOrderPage({ params }: PageProps) {
  const { llcId } = use(params);
  const router = useRouter();

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [propertyId, setPropertyId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<WorkOrderCategory>('general');
  const [priority, setPriority] = useState<WorkOrderPriority>('medium');
  const [scheduledDate, setScheduledDate] = useState('');

  // Fetch properties
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const res = await fetch(`/api/llcs/${llcId}/properties`);
        const data = await res.json();
        if (data.ok) {
          // Fetch units for each property
          const propertiesWithUnits = await Promise.all(
            data.data.map(async (prop: Property) => {
              const unitsRes = await fetch(`/api/llcs/${llcId}/properties/${prop.id}/units`);
              const unitsData = await unitsRes.json();
              return {
                ...prop,
                units: unitsData.ok ? unitsData.data : [],
              };
            })
          );
          setProperties(propertiesWithUnits);
        }
      } catch (err) {
        console.error('Error fetching properties:', err);
      }
    };
    fetchProperties();
  }, [llcId]);

  const selectedProperty = properties.find(p => p.id === propertyId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/llcs/${llcId}/work-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          unitId: unitId || undefined,
          title,
          description: description || undefined,
          category,
          priority,
          scheduledDate: scheduledDate || undefined,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error?.message || 'Failed to create work order');
      }

      router.push(`/llcs/${llcId}/work-orders/${data.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/llcs/${llcId}/work-orders`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Work Orders
        </Link>
        <span className="text-sm text-muted-foreground mx-2">/</span>
        <span className="text-sm">New</span>
      </div>

      <h1 className="text-2xl font-bold mb-6">New Work Order</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Property <span className="text-red-500">*</span>
          </label>
          <select
            value={propertyId}
            onChange={(e) => {
              setPropertyId(e.target.value);
              setUnitId('');
            }}
            className="w-full px-3 py-2 border rounded-md text-sm"
            required
          >
            <option value="">Select a property</option>
            {properties.map((prop) => (
              <option key={prop.id} value={prop.id}>
                {prop.name}
              </option>
            ))}
          </select>
        </div>

        {selectedProperty && selectedProperty.units && selectedProperty.units.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-1">Unit (optional)</label>
            <select
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
            >
              <option value="">All units / Common area</option>
              {selectedProperty.units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.unitNumber}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Brief description of the issue"
            className="w-full px-3 py-2 border rounded-md text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed description of the work needed"
            rows={4}
            className="w-full px-3 py-2 border rounded-md text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as WorkOrderCategory)}
              className="w-full px-3 py-2 border rounded-md text-sm"
            >
              {Object.entries(WORK_ORDER_CATEGORIES).map(([key, value]) => (
                <option key={key} value={value}>
                  {WORK_ORDER_CATEGORY_LABELS[value as WorkOrderCategory]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as WorkOrderPriority)}
              className="w-full px-3 py-2 border rounded-md text-sm"
            >
              {Object.entries(WORK_ORDER_PRIORITIES).map(([key, value]) => (
                <option key={key} value={value}>
                  {WORK_ORDER_PRIORITY_LABELS[value as WorkOrderPriority]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Scheduled Date (optional)</label>
          <input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Work Order'}
          </button>
          <Link
            href={`/llcs/${llcId}/work-orders`}
            className="px-4 py-2 border rounded-md text-sm hover:bg-secondary"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
