import { redirect } from 'next/navigation';
import Link from 'next/link';
import { adminDb } from '@/lib/firebase/admin';
import { requireSuperAdmin } from '@/lib/auth/checkPermission';

interface AdminStats {
  totalUsers: number;
  superAdminCount: number;
  totalAssignments: number;
  activeAssignments: number;
  totalLlcs: number;
}

async function getAdminStats(): Promise<AdminStats> {
  const [usersSnap, assignmentsSnap, llcsSnap] = await Promise.all([
    adminDb.collection('platformUsers').get(),
    adminDb.collection('userAssignments').get(),
    adminDb.collection('llcs').where('status', '!=', 'archived').get(),
  ]);

  const superAdminCount = usersSnap.docs.filter(
    doc => doc.data().isSuperAdmin === true
  ).length;

  const activeAssignments = assignmentsSnap.docs.filter(
    doc => doc.data().status === 'active'
  ).length;

  return {
    totalUsers: usersSnap.size,
    superAdminCount,
    totalAssignments: assignmentsSnap.size,
    activeAssignments,
    totalLlcs: llcsSnap.size,
  };
}

export default async function AdminDashboardPage() {
  try {
    await requireSuperAdmin();
  } catch {
    redirect('/llcs');
  }

  const stats = await getAdminStats();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Platform Administration</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link
          href="/admin/users"
          className="p-4 border rounded-lg hover:bg-secondary/30 transition-colors"
        >
          <div className="text-sm text-muted-foreground">Platform Users</div>
          <div className="text-2xl font-bold">{stats.totalUsers}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {stats.superAdminCount} super-admin{stats.superAdminCount !== 1 ? 's' : ''}
          </div>
        </Link>

        <Link
          href="/admin/users?filter=assignments"
          className="p-4 border rounded-lg hover:bg-secondary/30 transition-colors"
        >
          <div className="text-sm text-muted-foreground">User Assignments</div>
          <div className="text-2xl font-bold">{stats.activeAssignments}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {stats.totalAssignments - stats.activeAssignments} disabled
          </div>
        </Link>

        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Active LLCs</div>
          <div className="text-2xl font-bold">{stats.totalLlcs}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/users"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 transition-opacity"
          >
            Manage Users
          </Link>
          <Link
            href="/admin/users?action=new-assignment"
            className="px-4 py-2 border rounded-md text-sm hover:bg-secondary transition-colors"
          >
            + New Assignment
          </Link>
        </div>
      </div>

      {/* Admin Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3">User Management</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/admin/users" className="text-primary hover:underline">
                View all platform users
              </Link>
            </li>
            <li>
              <Link href="/admin/users?superAdminsOnly=true" className="text-primary hover:underline">
                View super-admins
              </Link>
            </li>
            <li>
              <Link href="/admin/users?filter=managers" className="text-primary hover:underline">
                View managers
              </Link>
            </li>
            <li>
              <Link href="/admin/users?filter=employees" className="text-primary hover:underline">
                View employees
              </Link>
            </li>
          </ul>
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Platform Info</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>RBAC System: 4-Role Model</li>
            <li>Roles: Super-Admin, Admin, Manager, Employee</li>
            <li>Cross-LLC assignments enabled</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
