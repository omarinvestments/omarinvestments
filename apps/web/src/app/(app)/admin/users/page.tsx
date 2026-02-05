'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PlatformUser, UserAssignment } from '@shared/types';

interface UserWithAssignments extends PlatformUser {
  assignments?: UserAssignment[];
}

function AdminUsersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<UserWithAssignments[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const superAdminsOnly = searchParams.get('superAdminsOnly') === 'true';
  const filter = searchParams.get('filter');
  const created = searchParams.get('created');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('includeAssignments', 'true');
      if (superAdminsOnly) params.set('superAdminsOnly', 'true');
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();

      if (!data.ok) {
        if (data.error?.code === 'PERMISSION_DENIED') {
          router.push('/llcs');
          return;
        }
        throw new Error(data.error?.message || 'Failed to fetch users');
      }

      let filteredUsers = data.data as UserWithAssignments[];

      // Apply client-side filters
      if (filter === 'managers') {
        filteredUsers = filteredUsers.filter(u =>
          u.assignments?.some(a => a.role === 'manager' && a.status === 'active')
        );
      } else if (filter === 'employees') {
        filteredUsers = filteredUsers.filter(u =>
          u.assignments?.some(a => a.role === 'employee' && a.status === 'active')
        );
      } else if (filter === 'assignments') {
        filteredUsers = filteredUsers.filter(u =>
          u.assignments && u.assignments.length > 0
        );
      }

      setUsers(filteredUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [router, superAdminsOnly, filter, searchQuery]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const getRoleBadge = (user: UserWithAssignments) => {
    if (user.isSuperAdmin) {
      return (
        <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs font-medium">
          Super Admin
        </span>
      );
    }

    const activeAssignments = user.assignments?.filter(a => a.status === 'active') || [];
    if (activeAssignments.length === 0) {
      return (
        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
          No Role
        </span>
      );
    }

    // Show highest role
    const hasManager = activeAssignments.some(a => a.role === 'manager');
    const hasEmployee = activeAssignments.some(a => a.role === 'employee');

    if (hasManager) {
      return (
        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
          Manager
        </span>
      );
    }
    if (hasEmployee) {
      return (
        <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium">
          Employee
        </span>
      );
    }

    return null;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
            Admin
          </Link>
          <span className="text-sm text-muted-foreground mx-2">/</span>
          <h1 className="text-2xl font-bold inline">Users</h1>
        </div>
        <Link
          href="/admin/staff/new"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90"
        >
          Add Staff
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Link
          href="/admin/users"
          className={`px-3 py-1.5 rounded-md text-sm ${
            !superAdminsOnly && !filter
              ? 'bg-primary text-primary-foreground'
              : 'border hover:bg-secondary'
          }`}
        >
          All Users
        </Link>
        <Link
          href="/admin/users?superAdminsOnly=true"
          className={`px-3 py-1.5 rounded-md text-sm ${
            superAdminsOnly
              ? 'bg-primary text-primary-foreground'
              : 'border hover:bg-secondary'
          }`}
        >
          Super Admins
        </Link>
        <Link
          href="/admin/users?filter=managers"
          className={`px-3 py-1.5 rounded-md text-sm ${
            filter === 'managers'
              ? 'bg-primary text-primary-foreground'
              : 'border hover:bg-secondary'
          }`}
        >
          Managers
        </Link>
        <Link
          href="/admin/users?filter=employees"
          className={`px-3 py-1.5 rounded-md text-sm ${
            filter === 'employees'
              ? 'bg-primary text-primary-foreground'
              : 'border hover:bg-secondary'
          }`}
        >
          Employees
        </Link>
      </div>

      {/* Success message */}
      {created === 'staff' && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm">
          Staff member created successfully. They can now activate their account at /activate using their date of birth and SSN.
        </div>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search by email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-md text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90"
          >
            Search
          </button>
        </div>
      </form>

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

      {/* Users List */}
      {!loading && users.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No users found
        </div>
      )}

      {!loading && users.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-secondary/50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium">User</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Role</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Assignments</th>
                <th className="text-right px-4 py-3 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-3">
                    <div className="font-medium text-sm">
                      {user.displayName || 'Unnamed User'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {user.email}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {getRoleBadge(user)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      {user.assignments?.filter(a => a.status === 'active').length || 0} active
                    </div>
                    {user.assignments && user.assignments.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {user.assignments
                          .filter(a => a.status === 'active')
                          .map(a => `${a.llcIds.length} LLC${a.llcIds.length !== 1 ? 's' : ''}`)
                          .join(', ') || 'None'}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      Manage
                    </Link>
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

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading...</div>}>
      <AdminUsersContent />
    </Suspense>
  );
}
