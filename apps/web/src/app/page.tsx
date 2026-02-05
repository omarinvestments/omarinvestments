'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRole } from '@/lib/contexts/RoleContext';
import { RoleSelectionModal } from '@/components/RoleSelectionModal';

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const {
    loading: roleLoading,
    activeRole,
    needsRoleSelection,
    hasStaffRole,
    hasTenantRole,
    setActiveRole,
  } = useRole();
  const router = useRouter();
  const [showRoleModal, setShowRoleModal] = useState(false);

  useEffect(() => {
    if (authLoading || roleLoading) return;

    if (!user) {
      // Not authenticated - show landing page
      return;
    }

    // User is authenticated - handle routing
    if (needsRoleSelection) {
      setShowRoleModal(true);
    } else if (activeRole === 'staff') {
      router.replace('/llcs');
    } else if (activeRole === 'tenant') {
      router.replace('/portal');
    } else if (hasStaffRole) {
      // Fallback: has staff role but no active role set
      router.replace('/llcs');
    } else if (hasTenantRole) {
      // Fallback: has tenant role but no active role set
      router.replace('/portal');
    } else {
      // User has no roles yet (shouldn't happen with invitation flow)
      // Send to portal as default since new users are tenants by default
      router.replace('/portal');
    }
  }, [
    user,
    authLoading,
    roleLoading,
    activeRole,
    needsRoleSelection,
    hasStaffRole,
    hasTenantRole,
    router,
  ]);

  const handleSelectStaff = () => {
    setActiveRole('staff');
    setShowRoleModal(false);
    router.push('/llcs');
  };

  const handleSelectTenant = () => {
    setActiveRole('tenant');
    setShowRoleModal(false);
    router.push('/portal');
  };

  // Show loading while determining state
  if (authLoading || (user && roleLoading)) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </main>
    );
  }

  // Authenticated user waiting for redirect or role selection
  if (user && !showRoleModal) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center">
        <div className="text-muted-foreground">Redirecting...</div>
      </main>
    );
  }

  // Public landing page for unauthenticated users
  return (
    <>
      <main className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-xl font-semibold">O.I. Properties</h1>
            <Link
              href="/login"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
            >
              Log In
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <section className="container mx-auto px-4 py-24 text-center">
          <h2 className="text-4xl font-bold mb-4">
            Property Management Made Simple
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Manage your properties, tenants, and finances all in one place.
          </p>
          <Link
            href="/login"
            className="inline-block px-8 py-3 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity text-lg"
          >
            Get Started
          </Link>
        </section>
      </main>

      {/* Role selection modal for authenticated dual-role users */}
      <RoleSelectionModal
        open={showRoleModal}
        onSelectStaff={handleSelectStaff}
        onSelectTenant={handleSelectTenant}
      />
    </>
  );
}
