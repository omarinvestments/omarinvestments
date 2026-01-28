'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';

export default function TopBar() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [invitationCount, setInvitationCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchInvitations = async () => {
      try {
        const res = await fetch('/api/invitations');
        const data = await res.json();
        if (data.ok) {
          setInvitationCount(data.data.length);
        }
      } catch {
        // Silently fail - not critical
      }
    };

    fetchInvitations();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <header className="border-b bg-card">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-4">
          <Link href="/llcs" className="text-lg font-semibold hover:opacity-80 transition-opacity">
            Property Platform
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/invitations"
            className="relative text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Invitations
            {invitationCount > 0 && (
              <span className="absolute -top-1 -right-3 min-w-[18px] h-[18px] flex items-center justify-center bg-primary text-primary-foreground text-xs font-medium rounded-full px-1">
                {invitationCount}
              </span>
            )}
          </Link>
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <button
            onClick={handleSignOut}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
