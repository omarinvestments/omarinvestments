'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PlatformUser,
  UserAssignment,
  ROLE_DISPLAY_NAMES,
} from '@shared/types';

interface UserWithAssignments extends PlatformUser {
  assignments: UserAssignment[];
}

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default function AdminUserDetailPage({ params }: PageProps) {
  const { userId } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<UserWithAssignments | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state for new assignment
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [assignmentRole, setAssignmentRole] = useState<'manager' | 'employee'>('employee');
  const [assignmentLlcIds, setAssignmentLlcIds] = useState('');
  const [assignmentPropertyIds, setAssignmentPropertyIds] = useState('');
  const [workOrderAccess, setWorkOrderAccess] = useState(true);
  const [taskAccess, setTaskAccess] = useState(true);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      const data = await res.json();

      if (!data.ok) {
        if (data.error?.code === 'PERMISSION_DENIED') {
          router.push('/llcs');
          return;
        }
        throw new Error(data.error?.message || 'Failed to fetch user');
      }

      setUser(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [userId, router]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleToggleSuperAdmin = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSuperAdmin: !user.isSuperAdmin }),
      });
      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error?.message || 'Failed to update user');
      }

      setUser(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError(null);

    try {
      const llcIds = assignmentLlcIds.split(',').map(s => s.trim()).filter(Boolean);
      const propertyIds = assignmentPropertyIds.split(',').map(s => s.trim()).filter(Boolean);

      if (llcIds.length === 0) {
        throw new Error('At least one LLC ID is required');
      }

      const res = await fetch('/api/admin/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          role: assignmentRole,
          llcIds,
          propertyIds,
          capabilities: {
            workOrderAccess,
            taskAccess,
            paymentProcessing,
          },
        }),
      });
      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error?.message || 'Failed to create assignment');
      }

      // Refresh user data
      await fetchUser();
      setShowAssignmentForm(false);
      setAssignmentLlcIds('');
      setAssignmentPropertyIds('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/assignments/${assignmentId}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error?.message || 'Failed to delete assignment');
      }

      await fetchUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAssignmentStatus = async (assignment: UserAssignment) => {
    setSaving(true);
    try {
      const newStatus = assignment.status === 'active' ? 'disabled' : 'active';
      const res = await fetch(`/api/admin/assignments/${assignment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error?.message || 'Failed to update assignment');
      }

      await fetchUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center py-8 text-red-600">User not found</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
          Admin
        </Link>
        <span className="text-sm text-muted-foreground mx-2">/</span>
        <Link href="/admin/users" className="text-sm text-muted-foreground hover:text-foreground">
          Users
        </Link>
        <span className="text-sm text-muted-foreground mx-2">/</span>
        <span className="text-sm">{user.displayName || user.email}</span>
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

      {/* User Info Card */}
      <div className="border rounded-lg p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {user.displayName || 'Unnamed User'}
            </h1>
            <p className="text-muted-foreground">{user.email}</p>
            <p className="text-xs text-muted-foreground mt-1">ID: {user.id}</p>
          </div>
          <div className="flex items-center gap-2">
            {user.isSuperAdmin ? (
              <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                Super Admin
              </span>
            ) : (
              <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                Regular User
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <button
            onClick={handleToggleSuperAdmin}
            disabled={saving}
            className={`px-4 py-2 rounded-md text-sm ${
              user.isSuperAdmin
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
            } disabled:opacity-50`}
          >
            {saving ? 'Saving...' : user.isSuperAdmin ? 'Remove Super Admin' : 'Make Super Admin'}
          </button>
        </div>
      </div>

      {/* Assignments Section */}
      <div className="border rounded-lg overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between bg-secondary/30">
          <h2 className="font-semibold">Assignments</h2>
          <button
            onClick={() => setShowAssignmentForm(!showAssignmentForm)}
            className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90"
          >
            {showAssignmentForm ? 'Cancel' : '+ New Assignment'}
          </button>
        </div>

        {/* New Assignment Form */}
        {showAssignmentForm && (
          <form onSubmit={handleCreateAssignment} className="p-4 border-b bg-secondary/10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select
                  value={assignmentRole}
                  onChange={(e) => setAssignmentRole(e.target.value as 'manager' | 'employee')}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value="manager">Manager</option>
                  <option value="employee">Employee</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  LLC IDs (comma-separated)
                </label>
                <input
                  type="text"
                  value={assignmentLlcIds}
                  onChange={(e) => setAssignmentLlcIds(e.target.value)}
                  placeholder="llc123, llc456"
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Property IDs (comma-separated, optional)
                </label>
                <input
                  type="text"
                  value={assignmentPropertyIds}
                  onChange={(e) => setAssignmentPropertyIds(e.target.value)}
                  placeholder="prop123, prop456"
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Capabilities</label>
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={workOrderAccess}
                      onChange={(e) => setWorkOrderAccess(e.target.checked)}
                    />
                    Work Order Access
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={taskAccess}
                      onChange={(e) => setTaskAccess(e.target.checked)}
                    />
                    Task Access
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={paymentProcessing}
                      onChange={(e) => setPaymentProcessing(e.target.checked)}
                    />
                    Payment Processing
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create Assignment'}
              </button>
            </div>
          </form>
        )}

        {/* Assignments List */}
        {user.assignments.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No assignments yet
          </div>
        ) : (
          <div className="divide-y">
            {user.assignments.map((assignment) => (
              <div key={assignment.id} className="p-4 flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      assignment.role === 'manager'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {ROLE_DISPLAY_NAMES[assignment.role]}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      assignment.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {assignment.status}
                    </span>
                  </div>
                  <div className="text-sm mt-1">
                    <span className="text-muted-foreground">LLCs:</span>{' '}
                    {assignment.llcIds.join(', ')}
                  </div>
                  {assignment.propertyIds.length > 0 && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Properties:</span>{' '}
                      {assignment.propertyIds.join(', ')}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    Capabilities:{' '}
                    {[
                      assignment.capabilities.workOrderAccess && 'Work Orders',
                      assignment.capabilities.taskAccess && 'Tasks',
                      assignment.capabilities.paymentProcessing && 'Payments',
                    ]
                      .filter(Boolean)
                      .join(', ') || 'None'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleAssignmentStatus(assignment)}
                    disabled={saving}
                    className="px-3 py-1.5 text-sm border rounded-md hover:bg-secondary disabled:opacity-50"
                  >
                    {assignment.status === 'active' ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => handleDeleteAssignment(assignment.id)}
                    disabled={saving}
                    className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-md hover:bg-red-50 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
