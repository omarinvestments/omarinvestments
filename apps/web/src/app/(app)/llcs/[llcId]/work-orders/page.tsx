'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import {
  WorkOrderSummary,
  WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_PRIORITY_LABELS,
  WORK_ORDER_CATEGORY_LABELS,
  WORK_ORDER_STATUS_COLORS,
  WORK_ORDER_PRIORITY_COLORS,
  WorkOrderStatus,
} from '@shared/types';

interface PageProps {
  params: Promise<{ llcId: string }>;
}

export default function WorkOrdersPage({ params }: PageProps) {
  const { llcId } = use(params);
  const [workOrders, setWorkOrders] = useState<WorkOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<WorkOrderStatus | 'all'>('all');

  const fetchWorkOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      const res = await fetch(`/api/llcs/${llcId}/work-orders?${params.toString()}`);
      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error?.message || 'Failed to fetch work orders');
      }

      setWorkOrders(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [llcId, statusFilter]);

  useEffect(() => {
    fetchWorkOrders();
  }, [fetchWorkOrders]);

  const formatDate = (timestamp: { seconds: number } | string | undefined) => {
    if (!timestamp) return '-';
    const date = typeof timestamp === 'string'
      ? new Date(timestamp)
      : new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Work Orders</h1>
        <Link
          href={`/llcs/${llcId}/work-orders/new`}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90"
        >
          + New Work Order
        </Link>
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-md text-sm ${
            statusFilter === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'border hover:bg-secondary'
          }`}
        >
          All
        </button>
        {(['open', 'assigned', 'in_progress', 'pending_review', 'completed'] as WorkOrderStatus[]).map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-md text-sm ${
              statusFilter === status
                ? 'bg-primary text-primary-foreground'
                : 'border hover:bg-secondary'
            }`}
          >
            {WORK_ORDER_STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      )}

      {/* Empty State */}
      {!loading && workOrders.length === 0 && (
        <div className="text-center py-8 border rounded-lg">
          <p className="text-muted-foreground mb-4">No work orders found</p>
          <Link
            href={`/llcs/${llcId}/work-orders/new`}
            className="text-primary hover:underline"
          >
            Create your first work order
          </Link>
        </div>
      )}

      {/* Work Orders List */}
      {!loading && workOrders.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-secondary/50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium">Title</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Category</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Priority</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Scheduled</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {workOrders.map((wo) => (
                <tr key={wo.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-3">
                    <Link
                      href={`/llcs/${llcId}/work-orders/${wo.id}`}
                      className="font-medium text-sm hover:text-primary"
                    >
                      {wo.title}
                    </Link>
                    {wo.assignedEmployeeIds.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {wo.assignedEmployeeIds.length} assigned
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {WORK_ORDER_CATEGORY_LABELS[wo.category]}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${WORK_ORDER_PRIORITY_COLORS[wo.priority]}`}>
                      {WORK_ORDER_PRIORITY_LABELS[wo.priority]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${WORK_ORDER_STATUS_COLORS[wo.status]}`}>
                      {WORK_ORDER_STATUS_LABELS[wo.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {wo.scheduledDate || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formatDate(wo.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
