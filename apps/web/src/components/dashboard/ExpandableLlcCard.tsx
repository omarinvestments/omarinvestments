'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface LlcDashboardStats {
  llcId: string;
  legalName: string;
  propertyCount: number;
  unitCount: number;
  occupiedUnits: number;
  activeLeases: number;
  openCases: number;
  overdueCharges: number;
  overdueAmount: number;
  leasesExpiringSoon: number;
}

interface LlcItem {
  id: string;
  legalName: string;
  status: string;
  memberRole?: string;
}

interface ExpandableLlcCardProps {
  llc: LlcItem;
  defaultExpanded?: boolean;
}

export default function ExpandableLlcCard({ llc, defaultExpanded = false }: ExpandableLlcCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [stats, setStats] = useState<LlcDashboardStats | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch stats when expanded
  useEffect(() => {
    if (isExpanded && !stats) {
      setLoading(true);
      fetch(`/api/llcs/${llc.id}/stats`)
        .then(res => res.json())
        .then(data => {
          if (data.ok) {
            setStats(data.data);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [isExpanded, stats, llc.id]);

  const occupancyRate = stats && stats.unitCount > 0
    ? Math.round((stats.occupiedUnits / stats.unitCount) * 100)
    : 0;

  return (
    <div className="border rounded-lg bg-card overflow-hidden transition-all duration-200">
      {/* Header - Always visible */}
      <div
        className="p-4 cursor-pointer hover:bg-secondary/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold">{llc.legalName}</h3>
              {llc.memberRole && (
                <span className="text-xs px-2 py-0.5 bg-secondary text-secondary-foreground rounded">
                  {llc.memberRole}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Mini stats when collapsed */}
            {!isExpanded && stats && (
              <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
                <span>{stats.propertyCount} properties</span>
                <span>{stats.activeLeases} leases</span>
                {stats.openCases > 0 && (
                  <span className="text-yellow-600">{stats.openCases} cases</span>
                )}
              </div>
            )}

            {/* Expand/collapse chevron */}
            <svg
              className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t">
          {loading ? (
            <div className="p-4 animate-pulse">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 bg-secondary rounded"></div>
                ))}
              </div>
            </div>
          ) : stats ? (
            <>
              {/* Stats Grid */}
              <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Properties</p>
                  <p className="text-xl font-bold">{stats.propertyCount}</p>
                </div>
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Units</p>
                  <p className="text-xl font-bold">{stats.occupiedUnits}/{stats.unitCount}</p>
                  <p className="text-xs text-muted-foreground">{occupancyRate}% occupied</p>
                </div>
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Active Leases</p>
                  <p className="text-xl font-bold">{stats.activeLeases}</p>
                  {stats.leasesExpiringSoon > 0 && (
                    <p className="text-xs text-yellow-600">{stats.leasesExpiringSoon} expiring soon</p>
                  )}
                </div>
                <div className={`p-3 rounded-lg ${stats.overdueAmount > 0 ? 'bg-red-50' : 'bg-secondary/30'}`}>
                  <p className="text-xs text-muted-foreground">Overdue</p>
                  <p className={`text-xl font-bold ${stats.overdueAmount > 0 ? 'text-red-600' : ''}`}>
                    ${(stats.overdueAmount / 100).toFixed(0)}
                  </p>
                  {stats.overdueCharges > 0 && (
                    <p className="text-xs text-red-600">{stats.overdueCharges} charges</p>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="px-4 pb-4 flex flex-wrap gap-2">
                <Link
                  href={`/llcs/${llc.id}`}
                  className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
                >
                  Open Dashboard
                </Link>
                <Link
                  href={`/llcs/${llc.id}/properties`}
                  className="px-3 py-1.5 text-sm border rounded-md hover:bg-secondary transition-colors"
                >
                  Properties
                </Link>
                <Link
                  href={`/llcs/${llc.id}/leases`}
                  className="px-3 py-1.5 text-sm border rounded-md hover:bg-secondary transition-colors"
                >
                  Leases
                </Link>
                <Link
                  href={`/llcs/${llc.id}/tenants`}
                  className="px-3 py-1.5 text-sm border rounded-md hover:bg-secondary transition-colors"
                >
                  Tenants
                </Link>
                {stats.openCases > 0 && (
                  <Link
                    href={`/llcs/${llc.id}/legal`}
                    className="px-3 py-1.5 text-sm border border-yellow-500 text-yellow-700 rounded-md hover:bg-yellow-50 transition-colors"
                  >
                    Legal Cases ({stats.openCases})
                  </Link>
                )}
              </div>
            </>
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              Failed to load stats
            </div>
          )}
        </div>
      )}
    </div>
  );
}
