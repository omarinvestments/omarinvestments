'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { SidebarProvider } from '@/lib/contexts/SidebarContext';
import TopBar from '@/components/TopBar';
import DashboardSidebar from '@/components/DashboardSidebar';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { loading } = useAuth();
  const pathname = usePathname();

  // Check if we're inside an LLC context (e.g., /llcs/abc123/properties)
  // The pattern /llcs/[llcId] means we have at least 3 segments: '', 'llcs', '[llcId]'
  const pathSegments = pathname.split('/').filter(Boolean);
  const isInsideLlc = pathSegments[0] === 'llcs' && pathSegments.length >= 2 && pathSegments[1] !== 'new';

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background">
        <TopBar />
        <div className="flex">
          {!isInsideLlc && <DashboardSidebar />}
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
