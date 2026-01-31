'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  GlobalTaskSummary,
  GLOBAL_TASK_STATUS_LABELS,
  GLOBAL_TASK_PRIORITY_LABELS,
  GLOBAL_TASK_STATUS_COLORS,
  GLOBAL_TASK_PRIORITY_COLORS,
  GlobalTaskStatus,
  GlobalTaskPriority,
} from '@shared/types';

export default function TasksPage() {
  const [tasks, setTasks] = useState<GlobalTaskSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'mine' | 'pending'>('mine');

  // New task form
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<GlobalTaskPriority>('medium');
  const [saving, setSaving] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filter === 'mine') {
        params.set('assignedToMe', 'true');
      } else if (filter === 'pending') {
        params.set('status', 'pending');
      }

      const res = await fetch(`/api/tasks?${params.toString()}`);
      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error?.message || 'Failed to fetch tasks');
      }

      setTasks(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          dueDate,
          priority,
        }),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error?.message);

      setShowForm(false);
      setTitle('');
      setDueDate('');
      fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: GlobalTaskStatus) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: newStatus === 'completed' ? 'complete' : 'status',
          status: newStatus,
        }),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error?.message);

      fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    }
  };

  const isOverdue = (dueDate: string, status: GlobalTaskStatus) => {
    if (status === 'completed' || status === 'canceled') return false;
    const today = new Date().toISOString().split('T')[0];
    return dueDate < (today || '');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90"
        >
          {showForm ? 'Cancel' : '+ New Task'}
        </button>
      </div>

      {/* New Task Form */}
      {showForm && (
        <form onSubmit={handleCreateTask} className="border rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                className="w-full px-3 py-2 border rounded-md text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
                required
              />
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as GlobalTaskPriority)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="mt-6 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('mine')}
          className={`px-3 py-1.5 rounded-md text-sm ${
            filter === 'mine'
              ? 'bg-primary text-primary-foreground'
              : 'border hover:bg-secondary'
          }`}
        >
          My Tasks
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-3 py-1.5 rounded-md text-sm ${
            filter === 'pending'
              ? 'bg-primary text-primary-foreground'
              : 'border hover:bg-secondary'
          }`}
        >
          Pending
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-md text-sm ${
            filter === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'border hover:bg-secondary'
          }`}
        >
          All Tasks
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      )}

      {/* Empty State */}
      {!loading && tasks.length === 0 && (
        <div className="text-center py-8 border rounded-lg">
          <p className="text-muted-foreground">No tasks found</p>
        </div>
      )}

      {/* Tasks List */}
      {!loading && tasks.length > 0 && (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`border rounded-lg p-4 flex items-center gap-4 ${
                task.status === 'completed' ? 'opacity-60' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={task.status === 'completed'}
                onChange={() =>
                  handleStatusChange(
                    task.id,
                    task.status === 'completed' ? 'pending' : 'completed'
                  )
                }
                className="w-5 h-5 rounded"
              />
              <div className="flex-1 min-w-0">
                <div className={`font-medium text-sm ${
                  task.status === 'completed' ? 'line-through' : ''
                }`}>
                  {task.title}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs ${
                    isOverdue(task.dueDate, task.status)
                      ? 'text-red-600 font-medium'
                      : 'text-muted-foreground'
                  }`}>
                    Due: {task.dueDate}
                    {isOverdue(task.dueDate, task.status) && ' (overdue)'}
                  </span>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${GLOBAL_TASK_PRIORITY_COLORS[task.priority]}`}>
                {GLOBAL_TASK_PRIORITY_LABELS[task.priority]}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${GLOBAL_TASK_STATUS_COLORS[task.status]}`}>
                {GLOBAL_TASK_STATUS_LABELS[task.status]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
