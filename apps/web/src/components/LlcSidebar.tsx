'use client';

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
  { label: 'Legal', href: '/legal' },
  { label: 'Members', href: '/members' },
  { label: 'Settings', href: '/settings' },
];

export default function LlcSidebar({ llcId, legalName }: LlcSidebarProps) {
  const pathname = usePathname();
  const basePath = `/llcs/${llcId}`;

  return (
    <aside className="w-56 border-r bg-card min-h-[calc(100vh-57px)]">
      <div className="p-4 border-b">
        <Link href={basePath} className="font-semibold text-sm truncate block">
          {legalName}
        </Link>
      </div>
      <nav className="p-2">
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
    </aside>
  );
}
