'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface LlcItem {
  id: string;
  legalName: string;
  status: string;
  memberRole?: string;
  createdAt?: string;
}

export default function LlcsListPage() {
  const [llcs, setLlcs] = useState<LlcItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLlcs = useCallback(async () => {
    try {
      const res = await fetch('/api/llcs');
      const data = await res.json();

      if (data.ok) {
        setLlcs(data.data);
      } else {
        setError(data.error?.message || 'Failed to load LLCs');
      }
    } catch (err) {
      setError('Failed to load LLCs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLlcs();
  }, [fetchLlcs]);

  const handleArchive = async (llcId: string, legalName: string) => {
    if (!confirm(`Are you sure you want to archive "${legalName}"? It can be restored later.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/llcs/${llcId}/archive`, { method: 'POST' });
      const data = await res.json();

      if (data.ok) {
        setLlcs((prev) => prev.filter((llc) => llc.id !== llcId));
      } else {
        alert(data.error?.message || 'Failed to archive LLC');
      }
    } catch (err) {
      alert('Failed to archive LLC');
    }
  };

  const handleCopy = async (llcId: string, legalName: string) => {
    const newName = prompt('Enter a name for the new LLC:', `${legalName} (Copy)`);
    if (!newName) return;

    try {
      const res = await fetch(`/api/llcs/${llcId}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ legalName: newName }),
      });
      const data = await res.json();

      if (data.ok) {
        fetchLlcs(); // Refresh the list
      } else {
        alert(data.error?.message || 'Failed to copy LLC');
      }
    } catch (err) {
      alert('Failed to copy LLC');
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading LLCs...</div>;
  }

  if (error) {
    return <div className="text-destructive">{error}</div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Your LLCs</h1>
        <Link
          href="/llcs/new"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity text-sm"
        >
          + New LLC
        </Link>
      </div>

      {llcs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            No LLCs found. Create your first LLC to get started.
          </p>
          <Link
            href="/llcs/new"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity text-sm"
          >
            Create LLC
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {llcs.map((llc) => (
            <div
              key={llc.id}
              className="p-6 border rounded-lg hover:border-primary transition-colors group"
            >
              <Link href={`/llcs/${llc.id}`} className="block mb-3">
                <h2 className="font-semibold text-lg">{llc.legalName}</h2>
                {llc.memberRole && (
                  <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-secondary text-secondary-foreground rounded">
                    {llc.memberRole}
                  </span>
                )}
              </Link>

              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link
                  href={`/llcs/${llc.id}/settings`}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleCopy(llc.id, llc.legalName)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Copy
                </button>
                <button
                  onClick={() => handleArchive(llc.id, llc.legalName)}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Archive
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
