'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import StatsCard from '@/components/dashboard/StatsCard';
import AlertsPanel from '@/components/dashboard/AlertsPanel';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import ExpandableLlcCard from '@/components/dashboard/ExpandableLlcCard';

interface LlcItem {
  id: string;
  legalName: string;
  status: string;
  memberRole?: string;
  createdAt?: string;
}

interface DashboardStats {
  totalLlcs: number;
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  occupancyRate: number;
  totalActiveLeases: number;
  totalOpenCases: number;
  totalOverdueAmount: number;
}

export default function OwnerDashboard() {
  const [llcs, setLlcs] = useState<LlcItem[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      // Fetch LLCs and dashboard stats in parallel
      const [llcsRes, statsRes] = await Promise.all([
        fetch('/api/llcs'),
        fetch('/api/dashboard'),
      ]);

      const llcsData = await llcsRes.json();
      const statsData = await statsRes.json();

      if (llcsData.ok) {
        setLlcs(llcsData.data);
      } else {
        setError(llcsData.error?.message || 'Failed to load LLCs');
      }

      if (statsData.ok) {
        setStats(statsData.data);
      }
    } catch {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-secondary rounded w-48 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-secondary rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-destructive">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Owner Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Overview of all your properties and LLCs
          </p>
        </div>
        <Link
          href="/llcs/new"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity text-sm"
        >
          + New LLC
        </Link>
      </div>

      {llcs.length === 0 ? (
        /* Empty state */
        <div className="text-center py-16 border rounded-lg">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
            <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">No LLCs yet</h2>
          <p className="text-muted-foreground mb-6">
            Create your first LLC to start managing properties
          </p>
          <Link
            href="/llcs/new"
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
          >
            Create Your First LLC
          </Link>
        </div>
      ) : (
        <>
          {/* Stats Overview */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatsCard
                label="Properties"
                value={stats.totalProperties}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                }
              />
              <StatsCard
                label="Occupancy"
                value={`${stats.occupancyRate}%`}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                }
              />
              <StatsCard
                label="Active Leases"
                value={stats.totalActiveLeases}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
              />
              <StatsCard
                label="Overdue Amount"
                value={`$${(stats.totalOverdueAmount / 100).toLocaleString()}`}
                variant={stats.totalOverdueAmount > 0 ? 'danger' : 'default'}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
            </div>
          )}

          {/* Main content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column - LLCs and Alerts */}
            <div className="lg:col-span-2 space-y-6">
              {/* Alerts */}
              <div className="border rounded-lg p-4">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Alerts
                </h2>
                <AlertsPanel maxItems={4} />
              </div>

              {/* LLCs */}
              <div>
                <h2 className="font-semibold mb-4">Your LLCs</h2>
                <div className="space-y-3">
                  {llcs.map((llc, index) => (
                    <ExpandableLlcCard
                      key={llc.id}
                      llc={llc}
                      defaultExpanded={index === 0}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Right column - Activity Feed */}
            <div className="border rounded-lg p-4">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Recent Activity
              </h2>
              <ActivityFeed maxItems={10} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
