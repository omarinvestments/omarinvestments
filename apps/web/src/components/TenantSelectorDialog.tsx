'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface TenantOption {
  id: string;
  type: 'residential' | 'commercial';
  firstName?: string;
  lastName?: string;
  businessName?: string;
  email: string;
}

interface TenantSelectorDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (tenant: TenantOption) => void;
  selectedIds: string[];
  llcId: string;
}

function getTenantDisplayName(tenant: TenantOption): string {
  if (tenant.type === 'commercial') {
    return tenant.businessName || tenant.email;
  }
  return `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim() || tenant.email;
}

export function TenantSelectorDialog({
  open,
  onClose,
  onSelect,
  selectedIds,
  llcId,
}: TenantSelectorDialogProps) {
  const [search, setSearch] = useState('');
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [loading, setLoading] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch tenants when dialog opens or search changes
  useEffect(() => {
    if (!open) return;

    const fetchTenants = async () => {
      setLoading(true);
      try {
        const url = search.trim()
          ? `/api/tenants/search?q=${encodeURIComponent(search)}`
          : `/api/llcs/${llcId}/tenants`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.ok) {
          setTenants(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch tenants:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchTenants, 300);
    return () => clearTimeout(debounce);
  }, [open, search, llcId]);

  // Focus search input when dialog opens
  useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [open]);

  // Handle escape key
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  const handleCreateNew = () => {
    window.open('/tenants/new', '_blank');
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const url = search.trim()
        ? `/api/tenants/search?q=${encodeURIComponent(search)}`
        : `/api/llcs/${llcId}/tenants`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.ok) {
        setTenants(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        className="bg-background rounded-lg shadow-lg w-full max-w-md max-h-[80vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 id="dialog-title" className="text-lg font-semibold">
            Add Tenant
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-secondary rounded-md transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b">
          <div className="flex gap-2">
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="flex-1 px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={handleRefresh}
              className="px-3 py-2 border border-input rounded-md hover:bg-secondary transition-colors"
              title="Refresh list"
            >
              <svg
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Tenant List */}
        <div className="flex-1 overflow-y-auto p-2 min-h-[200px]">
          {loading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Loading...
            </div>
          ) : tenants.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
              <p>No tenants found</p>
              {search && (
                <p className="text-sm">Try a different search term</p>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {tenants.map((tenant) => {
                const isSelected = selectedIds.includes(tenant.id);
                return (
                  <div
                    key={tenant.id}
                    className={`flex items-center justify-between px-3 py-2 rounded-md ${
                      isSelected
                        ? 'bg-primary/10 border border-primary/20'
                        : 'hover:bg-secondary'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">
                        {getTenantDisplayName(tenant)}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {tenant.email}
                        <span className="ml-2 text-xs">({tenant.type})</span>
                      </p>
                    </div>
                    {isSelected ? (
                      <span className="text-sm text-primary font-medium px-3">
                        Added
                      </span>
                    ) : (
                      <button
                        onClick={() => onSelect(tenant)}
                        className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
                      >
                        Add
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t flex justify-between items-center">
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-input rounded-md hover:bg-secondary transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create New Tenant
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
