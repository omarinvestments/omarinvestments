'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface LlcSidebarProps {
  llcId: string;
  legalName: string;
}

const NAV_ITEMS = [
  { label: 'Dashboard', href: '' },
  { label: 'Properties', href: '/properties' },
  { label: 'Tenants', href: '/tenants' },
  { label: 'Leases', href: '/leases' },
  { label: 'Billing', href: '/billing' },
  { label: 'Work Orders', href: '/work-orders' },
  { label: 'Legal', href: '/legal' },
  { label: 'Members', href: '/members' },
  { label: 'Settings', href: '/settings' },
];

export default function LlcSidebar({ llcId, legalName }: LlcSidebarProps) {
  const pathname = usePathname();
  const basePath = `/llcs/${llcId}`;
  const [isOpen, setIsOpen] = useState(false);

  // Close sidebar when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Close sidebar on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const sidebarContent = (
    <>
      <div className="p-4 border-b flex items-center justify-between">
        <Link href={basePath} className="font-semibold text-sm truncate block">
          {legalName}
        </Link>
        {/* Close button - only visible on mobile */}
        <button
          onClick={() => setIsOpen(false)}
          className="lg:hidden p-1 text-muted-foreground hover:text-foreground"
          aria-label="Close menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <nav className="p-2 flex-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const fullPath = `${basePath}${item.href}`;
          const isActive =
            item.href === ''
              ? pathname === basePath
              : pathname.startsWith(fullPath);

          return (
            <Link
              key={item.href}
              href={fullPath}
              onClick={() => setIsOpen(false)}
              className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-secondary text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <>
      {/* Mobile menu toggle button - fixed position */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed bottom-4 left-4 z-40 p-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:opacity-90 transition-opacity"
        aria-label="Open menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Desktop sidebar - always visible */}
      <aside className="hidden lg:block w-56 border-r bg-card min-h-[calc(100vh-57px)] flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50"
          onClick={() => setIsOpen(false)}
        >
          {/* Sidebar panel */}
          <aside
            className="absolute left-0 top-0 h-full w-64 bg-card shadow-xl flex flex-col overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
