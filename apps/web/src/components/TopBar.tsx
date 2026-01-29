'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import GlobalSearch from './GlobalSearch';

export default function TopBar() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [invitationCount, setInvitationCount] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);

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

  // Global keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const closeSearch = useCallback(() => setSearchOpen(false), []);

  return (
    <>
      <header className="border-b bg-card">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <Link href="/llcs" className="text-lg font-semibold hover:opacity-80 transition-opacity">
              Property Platform
            </Link>
          </div>

          {/* Center - Search trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-secondary/50 rounded-md hover:bg-secondary transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Search...</span>
            <kbd className="px-1.5 py-0.5 text-xs bg-background rounded border">
              ⌘K
            </kbd>
          </button>

          <div className="flex items-center gap-4">
            {/* Mobile search button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="sm:hidden text-muted-foreground hover:text-foreground"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

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

      <GlobalSearch isOpen={searchOpen} onClose={closeSearch} />
    </>
  );
}
