'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ReactNode } from 'react';

interface Alert {
  id: string;
  type: 'lease_expiring' | 'charge_overdue' | 'payment_due' | 'case_hearing' | 'task_due' | 'mortgage_payment_due';
  severity: 'warning' | 'critical';
  title: string;
  description: string;
  llcId: string;
  llcName: string;
  entityType: string;
  entityId: string;
  dueDate?: string;
  amount?: number;
}

const alertIcons: Record<string, ReactNode> = {
  lease_expiring: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  charge_overdue: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  payment_due: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  case_hearing: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
    </svg>
  ),
  task_due: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  mortgage_payment_due: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
};

function getAlertLink(alert: Alert): string {
  switch (alert.entityType) {
    case 'lease':
      return `/llcs/${alert.llcId}/leases/${alert.entityId}`;
    case 'charge':
      return `/llcs/${alert.llcId}/leases`; // Navigate to leases, charges are under lease
    case 'case':
      return `/llcs/${alert.llcId}/legal/${alert.entityId}`;
    case 'task':
      return `/llcs/${alert.llcId}/legal`; // Navigate to legal cases
    case 'mortgage':
      return `/admin/mortgages/${alert.entityId}`;
    default:
      return `/llcs/${alert.llcId}`;
  }
}

interface AlertsPanelProps {
  maxItems?: number;
  compact?: boolean;
}

export default function AlertsPanel({ maxItems = 5, compact = false }: AlertsPanelProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const res = await fetch('/api/alerts');
        const data = await res.json();

        if (data.ok) {
          setAlerts(data.data);
        } else {
          setError(data.error?.message || 'Failed to load alerts');
        }
      } catch {
        setError('Failed to load alerts');
      } finally {
        setLoading(false);
      }
    }

    fetchAlerts();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-secondary rounded w-24 mb-3"></div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-secondary rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-destructive">{error}</div>;
  }

  if (alerts.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        No alerts - everything looks good!
      </div>
    );
  }

  const displayAlerts = alerts.slice(0, maxItems);
  const remainingCount = alerts.length - maxItems;

  return (
    <div>
      <div className="space-y-2">
        {displayAlerts.map((alert) => (
          <Link
            key={alert.id}
            href={getAlertLink(alert)}
            className={`
              flex items-start gap-3 p-3 rounded-lg border transition-colors
              hover:bg-secondary/50
              ${alert.severity === 'critical'
                ? 'border-red-500/50 bg-red-50/50'
                : 'border-yellow-500/50 bg-yellow-50/50'
              }
            `}
          >
            <div className={`
              mt-0.5
              ${alert.severity === 'critical' ? 'text-red-600' : 'text-yellow-600'}
            `}>
              {alertIcons[alert.type]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`
                  text-sm font-medium
                  ${alert.severity === 'critical' ? 'text-red-700' : 'text-yellow-700'}
                `}>
                  {alert.title}
                </span>
                {!compact && (
                  <span className="text-xs text-muted-foreground">
                    {alert.llcName}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {alert.description}
              </p>
            </div>
            {alert.dueDate && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {new Date(alert.dueDate).toLocaleDateString()}
              </span>
            )}
          </Link>
        ))}
      </div>

      {remainingCount > 0 && (
        <p className="text-xs text-muted-foreground mt-3 text-center">
          +{remainingCount} more alert{remainingCount > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
