'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRole } from '@/lib/contexts/RoleContext';
import { useRouter } from 'next/navigation';

interface PortalLayoutProps {
  children: ReactNode;
}

export default function PortalLayout({ children }: PortalLayoutProps) {
  const { user, signOut } = useAuth();
  const { hasStaffRole, clearActiveRole } = useRole();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const handleSwitchToStaff = () => {
    clearActiveRole();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/portal" className="text-xl font-semibold">
            O.I. Properties
          </Link>
          <div className="flex items-center gap-4">
            {hasStaffRole && (
              <button
                onClick={handleSwitchToStaff}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Switch to Staff
              </button>
            )}
            {user && (
              <>
                <Link
                  href="/portal/profile"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  My Profile
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sign Out
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
