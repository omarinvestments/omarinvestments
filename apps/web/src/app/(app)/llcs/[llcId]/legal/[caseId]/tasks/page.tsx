'use client';

import { useEffect, useState, useCallback, FormEvent } from 'react';
import Link from 'next/link';
import { use } from 'react';

interface TaskItem {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  status: string;
  priority: string;
  assignedToUserId?: string;
  completedAt?: string;
}

interface TasksPageProps {
  params: Promise<{ llcId: string; caseId: string }>;
}

const PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  canceled: 'bg-gray-100 text-gray-600',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isOverdue(dueDate: string, status: string): boolean {
  if (status === 'completed' || status === 'canceled') return false;
  return new Date(dueDate) < new Date();
}

export default function TasksPage({ params }: TasksPageProps) {
  const { llcId, caseId } = use(params);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  // New task form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [submitting, setSubmitting] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/llcs/${llcId}/cases/${caseId}/tasks`);
      const data = await res.json();

      if (data.ok) {
        setTasks(data.data);
      } else {
        setError(data.error?.message || 'Failed to load tasks');
      }
    } catch {
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [llcId, caseId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleAddTask = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch(`/api/llcs/${llcId}/cases/${caseId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || undefined,
          dueDate: new Date(dueDate).toISOString(),
          priority,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setTasks((prev) => [...prev, data.data]);
        setTitle('');
        setDescription('');
        setDueDate('');
        setPriority('medium');
        setShowForm(false);
      } else {
        alert(data.error?.message || 'Failed to create task');
      }
    } catch {
      alert('Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/llcs/${llcId}/cases/${caseId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (data.ok) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? data.data : t)));
      } else {
        alert(data.error?.message || 'Failed to update task');
      }
    } catch {
      alert('Failed to update task');
    }
  };

  const handleDelete = async (taskId: string, taskTitle: string) => {
    if (!confirm(`Delete task "${taskTitle}"?`)) return;

    try {
      const res = await fetch(`/api/llcs/${llcId}/cases/${caseId}/tasks/${taskId}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      } else {
        alert(data.error?.message || 'Failed to delete task');
      }
    } catch {
      alert('Failed to delete task');
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading tasks...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href={`/llcs/${llcId}/legal/${caseId}`}
            className="text-muted-foreground hover:text-foreground text-sm">&larr; Case</Link>
          <h1 className="text-2xl font-bold">Tasks</h1>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity text-sm">
          {showForm ? 'Cancel' : '+ Add Task'}
        </button>
      </div>

      {error && <div className="mb-4 text-destructive text-sm">{error}</div>}

      {showForm && (
        <form onSubmit={handleAddTask} className="mb-6 p-4 border rounded-lg space-y-3">
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-1">Title *</label>
            <input id="title" required value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. File response to motion"
              className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium mb-1">Due Date *</label>
              <input id="dueDate" type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
            </div>
            <div>
              <label htmlFor="priority" className="block text-sm font-medium mb-1">Priority</label>
              <select id="priority" value={priority} onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="desc" className="block text-sm font-medium mb-1">Description</label>
            <textarea id="desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
          </div>
          <button type="submit" disabled={submitting}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 text-sm disabled:opacity-50">
            {submitting ? 'Adding...' : 'Add Task'}
          </button>
        </form>
      )}

      {tasks.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No tasks yet.</p>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.id}
              className={`flex items-center justify-between p-3 border rounded-lg ${
                isOverdue(task.dueDate, task.status) ? 'border-red-300 bg-red-50/50' : ''
              }`}>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={task.status === 'completed'}
                  onChange={() => handleStatusChange(
                    task.id,
                    task.status === 'completed' ? 'pending' : 'completed'
                  )}
                  className="w-4 h-4"
                />
                <div>
                  <div className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                    {task.title}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      Due {formatDate(task.dueDate)}
                    </span>
                    <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${PRIORITY_STYLES[task.priority]}`}>
                      {task.priority}
                    </span>
                    <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${STATUS_STYLES[task.status]}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => handleDelete(task.id, task.title)}
                className="text-xs text-muted-foreground hover:text-destructive ml-2">
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
