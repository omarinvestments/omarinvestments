'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

interface ActivityItem {
  id: string;
  llcId: string;
  llcName: string;
  action: 'create' | 'update' | 'delete' | 'void';
  entityType: string;
  entityId: string;
  description: string;
  actorUserId: string;
  createdAt: string;
}

const actionIcons: Record<string, ReactNode> = {
  create: (
    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
  ),
  update: (
    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  delete: (
    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  void: (
    <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  ),
};

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

interface ActivityFeedProps {
  maxItems?: number;
}

export default function ActivityFeed({ maxItems = 10 }: ActivityFeedProps) {
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchActivity() {
      try {
        const res = await fetch(`/api/activity?limit=${maxItems}`);
        const data = await res.json();

        if (data.ok) {
          setActivity(data.data);
        } else {
          setError(data.error?.message || 'Failed to load activity');
        }
      } catch {
        setError('Failed to load activity');
      } finally {
        setLoading(false);
      }
    }

    fetchActivity();
  }, [maxItems]);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-8 h-8 bg-secondary rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-secondary rounded w-3/4 mb-1"></div>
                <div className="h-3 bg-secondary rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-destructive">{error}</div>;
  }

  if (activity.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        No recent activity
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activity.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-3 p-2 rounded-lg hover:bg-secondary/30 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
            {actionIcons[item.action] || actionIcons.update}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              {item.description}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{item.llcName}</span>
              <span>·</span>
              <span>{getRelativeTime(item.createdAt)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
