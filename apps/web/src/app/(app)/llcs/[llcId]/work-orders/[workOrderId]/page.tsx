'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import {
  WorkOrder,
  WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_PRIORITY_LABELS,
  WORK_ORDER_CATEGORY_LABELS,
  WORK_ORDER_STATUS_COLORS,
  WORK_ORDER_PRIORITY_COLORS,
  WorkOrderStatus,
} from '@shared/types';

interface PageProps {
  params: Promise<{ llcId: string; workOrderId: string }>;
}

export default function WorkOrderDetailPage({ params }: PageProps) {
  const { llcId, workOrderId } = use(params);
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Note form
  const [noteContent, setNoteContent] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);

  const fetchWorkOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/llcs/${llcId}/work-orders/${workOrderId}`);
      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error?.message || 'Failed to fetch work order');
      }

      setWorkOrder(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [llcId, workOrderId]);

  useEffect(() => {
    fetchWorkOrder();
  }, [fetchWorkOrder]);

  const handleStatusChange = async (newStatus: WorkOrderStatus) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/llcs/${llcId}/work-orders/${workOrderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status', status: newStatus }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error?.message);
      setWorkOrder(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/llcs/${llcId}/work-orders/${workOrderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error?.message);
      setWorkOrder(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/llcs/${llcId}/work-orders/${workOrderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'note',
          content: noteContent,
          isInternal: isInternalNote,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error?.message);
      setWorkOrder(data.data);
      setNoteContent('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add note');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (timestamp: { seconds: number } | string | undefined) => {
    if (!timestamp) return '-';
    const date = typeof timestamp === 'string'
      ? new Date(timestamp)
      : new Date(timestamp.seconds * 1000);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="p-6">
        <div className="text-center py-8 text-red-600">Work order not found</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href={`/llcs/${llcId}/work-orders`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Work Orders
        </Link>
        <span className="text-sm text-muted-foreground mx-2">/</span>
        <span className="text-sm">{workOrder.title}</span>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="border rounded-lg p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">{workOrder.title}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Created {formatDate(workOrder.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${WORK_ORDER_PRIORITY_COLORS[workOrder.priority]}`}>
              {WORK_ORDER_PRIORITY_LABELS[workOrder.priority]}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${WORK_ORDER_STATUS_COLORS[workOrder.status]}`}>
              {WORK_ORDER_STATUS_LABELS[workOrder.status]}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Category:</span>{' '}
            {WORK_ORDER_CATEGORY_LABELS[workOrder.category]}
          </div>
          <div>
            <span className="text-muted-foreground">Property:</span>{' '}
            {workOrder.propertyId}
          </div>
          {workOrder.unitId && (
            <div>
              <span className="text-muted-foreground">Unit:</span>{' '}
              {workOrder.unitId}
            </div>
          )}
          {workOrder.scheduledDate && (
            <div>
              <span className="text-muted-foreground">Scheduled:</span>{' '}
              {workOrder.scheduledDate}
            </div>
          )}
        </div>

        {workOrder.description && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-sm text-muted-foreground mb-1">Description</div>
            <p className="text-sm whitespace-pre-wrap">{workOrder.description}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      {workOrder.status !== 'completed' && workOrder.status !== 'canceled' && (
        <div className="border rounded-lg p-4 mb-6">
          <h2 className="font-semibold mb-3">Actions</h2>
          <div className="flex flex-wrap gap-2">
            {workOrder.status === 'open' && (
              <button
                onClick={() => handleStatusChange('in_progress')}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200 disabled:opacity-50"
              >
                Start Work
              </button>
            )}
            {workOrder.status === 'assigned' && (
              <button
                onClick={() => handleStatusChange('in_progress')}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200 disabled:opacity-50"
              >
                Start Work
              </button>
            )}
            {workOrder.status === 'in_progress' && (
              <>
                <button
                  onClick={() => handleStatusChange('pending_review')}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-orange-100 text-orange-700 rounded-md text-sm hover:bg-orange-200 disabled:opacity-50"
                >
                  Submit for Review
                </button>
                <button
                  onClick={handleComplete}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-green-100 text-green-700 rounded-md text-sm hover:bg-green-200 disabled:opacity-50"
                >
                  Mark Complete
                </button>
              </>
            )}
            {workOrder.status === 'pending_review' && (
              <button
                onClick={handleComplete}
                disabled={actionLoading}
                className="px-4 py-2 bg-green-100 text-green-700 rounded-md text-sm hover:bg-green-200 disabled:opacity-50"
              >
                Approve & Complete
              </button>
            )}
            <button
              onClick={() => handleStatusChange('canceled')}
              disabled={actionLoading}
              className="px-4 py-2 border border-red-200 text-red-600 rounded-md text-sm hover:bg-red-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="border rounded-lg overflow-hidden mb-6">
        <div className="p-4 border-b bg-secondary/30">
          <h2 className="font-semibold">Notes</h2>
        </div>

        {/* Add Note Form */}
        <form onSubmit={handleAddNote} className="p-4 border-b">
          <textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Add a note..."
            rows={2}
            className="w-full px-3 py-2 border rounded-md text-sm mb-2"
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isInternalNote}
                onChange={(e) => setIsInternalNote(e.target.checked)}
              />
              Internal note (not visible to tenants)
            </label>
            <button
              type="submit"
              disabled={actionLoading || !noteContent.trim()}
              className="px-4 py-1.5 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 disabled:opacity-50"
            >
              Add Note
            </button>
          </div>
        </form>

        {/* Notes List */}
        {workOrder.notes.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No notes yet</div>
        ) : (
          <div className="divide-y">
            {workOrder.notes.map((note) => (
              <div key={note.id} className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">
                    {note.authorName || 'Unknown'}
                  </span>
                  {note.isInternal && (
                    <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">
                      Internal
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatDate(note.createdAt)}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status History */}
      <div className="border rounded-lg overflow-hidden">
        <div className="p-4 border-b bg-secondary/30">
          <h2 className="font-semibold">Status History</h2>
        </div>
        <div className="divide-y">
          {workOrder.statusHistory.map((change) => (
            <div key={change.id} className="p-4 flex items-center gap-4">
              <div className="text-sm">
                {change.fromStatus ? (
                  <>
                    <span className="text-muted-foreground">
                      {WORK_ORDER_STATUS_LABELS[change.fromStatus]}
                    </span>
                    <span className="mx-2">→</span>
                  </>
                ) : null}
                <span className="font-medium">
                  {WORK_ORDER_STATUS_LABELS[change.toStatus]}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDate(change.createdAt)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
