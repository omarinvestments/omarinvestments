'use client';

import { useState, useEffect, useCallback } from 'react';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'date' | 'text';
  options?: FilterOption[];
  placeholder?: string;
}

export interface FilterValues {
  search: string;
  [key: string]: string;
}

interface SearchFilterProps {
  filters: FilterConfig[];
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  searchPlaceholder?: string;
  className?: string;
}

export function SearchFilter({
  filters,
  values,
  onChange,
  searchPlaceholder = 'Search...',
  className = '',
}: SearchFilterProps) {
  const [localSearch, setLocalSearch] = useState(values.search || '');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== values.search) {
        onChange({ ...values, search: localSearch });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, values, onChange]);

  const handleFilterChange = useCallback(
    (key: string, value: string) => {
      onChange({ ...values, [key]: value });
    },
    [values, onChange]
  );

  const handleClear = useCallback(() => {
    const cleared: FilterValues = { search: '' };
    filters.forEach((f) => {
      cleared[f.key] = '';
    });
    setLocalSearch('');
    onChange(cleared);
  }, [filters, onChange]);

  const hasActiveFilters =
    localSearch ||
    filters.some((f) => values[f.key] && values[f.key] !== '');

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-wrap gap-3 items-end">
        {/* Search Input */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Search
          </label>
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Dynamic Filters */}
        {filters.map((filter) => (
          <div key={filter.key} className="min-w-[140px]">
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              {filter.label}
            </label>
            {filter.type === 'select' && filter.options && (
              <select
                value={values[filter.key] || ''}
                onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All</option>
                {filter.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
            {filter.type === 'date' && (
              <input
                type="date"
                value={values[filter.key] || ''}
                onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                placeholder={filter.placeholder}
                className="w-full px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            )}
            {filter.type === 'text' && (
              <input
                type="text"
                value={values[filter.key] || ''}
                onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                placeholder={filter.placeholder}
                className="w-full px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            )}
          </div>
        ))}

        {/* Clear Button */}
        {hasActiveFilters && (
          <button
            onClick={handleClear}
            className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground border rounded-md hover:bg-secondary transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================
// Pre-configured filter sets for each feature
// ============================================

export const LEGAL_CASE_FILTERS: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'open', label: 'Open' },
      { value: 'stayed', label: 'Stayed' },
      { value: 'settled', label: 'Settled' },
      { value: 'judgment', label: 'Judgment' },
      { value: 'closed', label: 'Closed' },
    ],
  },
  {
    key: 'caseType',
    label: 'Type',
    type: 'select',
    options: [
      { value: 'eviction', label: 'Eviction' },
      { value: 'collections', label: 'Collections' },
      { value: 'property_damage', label: 'Property Damage' },
      { value: 'contract_dispute', label: 'Contract Dispute' },
      { value: 'personal_injury', label: 'Personal Injury' },
      { value: 'code_violation', label: 'Code Violation' },
      { value: 'other', label: 'Other' },
    ],
  },
];

export const LEASE_FILTERS: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'draft', label: 'Draft' },
      { value: 'active', label: 'Active' },
      { value: 'ended', label: 'Ended' },
      { value: 'terminated', label: 'Terminated' },
      { value: 'eviction', label: 'Eviction' },
    ],
  },
];

export const TENANT_FILTERS: FilterConfig[] = [
  {
    key: 'type',
    label: 'Type',
    type: 'select',
    options: [
      { value: 'residential', label: 'Residential' },
      { value: 'commercial', label: 'Commercial' },
    ],
  },
  {
    key: 'hasActiveLease',
    label: 'Lease Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Has Active Lease' },
      { value: 'inactive', label: 'No Active Lease' },
    ],
  },
];

export const PROPERTY_FILTERS: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'archived', label: 'Archived' },
    ],
  },
  {
    key: 'type',
    label: 'Type',
    type: 'select',
    options: [
      { value: 'residential', label: 'Residential' },
      { value: 'commercial', label: 'Commercial' },
      { value: 'mixed', label: 'Mixed Use' },
    ],
  },
];

export const CHARGE_FILTERS: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'open', label: 'Open' },
      { value: 'partial', label: 'Partial' },
      { value: 'paid', label: 'Paid' },
      { value: 'voided', label: 'Voided' },
    ],
  },
  {
    key: 'type',
    label: 'Type',
    type: 'select',
    options: [
      { value: 'rent', label: 'Rent' },
      { value: 'late_fee', label: 'Late Fee' },
      { value: 'deposit', label: 'Deposit' },
      { value: 'utility', label: 'Utility' },
      { value: 'maintenance', label: 'Maintenance' },
      { value: 'other', label: 'Other' },
    ],
  },
];

// ============================================
// Helper functions for filtering data
// ============================================

/**
 * Get a nested value from an object using dot notation path
 * e.g., getNestedValue(obj, 'opposingParty.name') returns obj.opposingParty?.name
 */
function getNestedValue(obj: unknown, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

export function filterBySearch<T>(
  items: T[],
  search: string,
  searchFields: string[]
): T[] {
  if (!search.trim()) return items;
  const lowerSearch = search.toLowerCase();
  return items.filter((item) =>
    searchFields.some((field) => {
      const value = getNestedValue(item, field);
      if (typeof value === 'string') {
        return value.toLowerCase().includes(lowerSearch);
      }
      if (typeof value === 'number') {
        return value.toString().includes(lowerSearch);
      }
      return false;
    })
  );
}

export function filterByField<T>(
  items: T[],
  field: keyof T,
  value: string | undefined
): T[] {
  if (!value) return items;
  return items.filter((item) => item[field] === value);
}
