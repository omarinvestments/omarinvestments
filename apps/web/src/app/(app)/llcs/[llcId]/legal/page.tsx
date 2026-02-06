'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { use } from 'react';
import {
  SearchFilter,
  LEGAL_CASE_FILTERS,
  FilterValues,
  filterBySearch,
  filterByField,
} from '@/components/SearchFilter';

interface OpposingParty {
  type: 'tenant' | 'other';
  tenantId?: string;
  tenantName?: string;
  name?: string;
}

interface NextCourtDate {
  date: string;
  time?: string;
  type: string;
  judge?: string;
  courtroom?: string;
}

interface CaseItem {
  id: string;
  court: string;
  jurisdiction: string;
  docketNumber?: string;
  caseType: string;
  status: string;
  opposingParty?: OpposingParty | OpposingParty[];
  nextHearingDate?: string;
  nextCourtDate?: NextCourtDate;
  createdAt: string;
}

function getOpposingPartyName(party?: OpposingParty | OpposingParty[]): string {
  if (!party) return '—';

  // Handle array - get first party's name
  const first = Array.isArray(party) ? party[0] : party;
  if (!first) return '—';

  // For tenant type, use tenantName; for other, use name
  const name = first.type === 'tenant' ? first.tenantName : first.name;
  return name || '—';
}

interface LegalPageProps {
  params: Promise<{ llcId: string }>;
}

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  stayed: 'bg-yellow-100 text-yellow-800',
  settled: 'bg-green-100 text-green-800',
  judgment: 'bg-purple-100 text-purple-800',
  closed: 'bg-gray-100 text-gray-600',
};

const CASE_TYPE_LABELS: Record<string, string> = {
  eviction: 'Eviction',
  collections: 'Collections',
  property_damage: 'Property Damage',
  contract_dispute: 'Contract Dispute',
  personal_injury: 'Personal Injury',
  code_violation: 'Code Violation',
  other: 'Other',
};

const COURT_DATE_TYPE_LABELS: Record<string, string> = {
  hearing: 'Hearing',
  trial: 'Trial',
  motion: 'Motion',
  status_conference: 'Status Conference',
  pretrial_conference: 'Pretrial Conference',
  mediation: 'Mediation',
  settlement_conference: 'Settlement Conference',
  arraignment: 'Arraignment',
  sentencing: 'Sentencing',
  other: 'Other',
};

function formatDate(iso: string): string {
  // Parse date parts directly to avoid timezone offset issues
  const [datePart] = iso.split('T');
  if (!datePart) return '—';
  const parts = datePart.split('-').map(Number);
  const [year, month, day] = parts;
  if (!year || !month || !day) return '—';
  const date = new Date(year, month - 1, day); // month is 0-indexed
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(time: string | undefined): string {
  if (!time) return '';
  // Handle 24-hour format (HH:MM) from time input
  const parts = time.split(':');
  if (parts.length < 2) return time;
  let hours = parseInt(parts[0] || '0', 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${minutes}${ampm}`;
}


export default function LegalPage({ params }: LegalPageProps) {
  const { llcId } = use(params);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<FilterValues>({
    search: '',
    status: '',
    caseType: '',
  });

  const fetchCases = useCallback(async () => {
    try {
      const res = await fetch(`/api/llcs/${llcId}/cases`);
      const data = await res.json();

      if (data.ok) {
        setCases(data.data);
      } else {
        setError(data.error?.message || 'Failed to load cases');
      }
    } catch {
      setError('Failed to load cases');
    } finally {
      setLoading(false);
    }
  }, [llcId]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  // Apply filters to cases
  const filteredCases = useMemo(() => {
    let result = cases;

    // Text search across court, docketNumber, jurisdiction, opposingParty
    result = filterBySearch(result, filters.search, [
      'court',
      'docketNumber',
      'jurisdiction',
      'opposingParty.name',
    ]);

    // Filter by status
    result = filterByField(result, 'status', filters.status);

    // Filter by case type
    result = filterByField(result, 'caseType', filters.caseType);

    return result;
  }, [cases, filters]);

  const handleDelete = async (caseId: string, court: string) => {
    if (!confirm(`Are you sure you want to delete the case at "${court}"? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/llcs/${llcId}/cases/${caseId}`, { method: 'DELETE' });
      const data = await res.json();

      if (data.ok) {
        setCases((prev) => prev.filter((c) => c.id !== caseId));
      } else {
        alert(data.error?.message || 'Failed to delete case');
      }
    } catch {
      alert('Failed to delete case');
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading cases...</div>;
  }

  if (error) {
    return <div className="text-destructive">{error}</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Legal Cases</h1>
        <Link
          href={`/llcs/${llcId}/legal/new`}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity text-sm"
        >
          + New Case
        </Link>
      </div>

      {/* Search & Filters */}
      <SearchFilter
        filters={LEGAL_CASE_FILTERS}
        values={filters}
        onChange={setFilters}
        searchPlaceholder="Search court, docket number..."
        className="mb-6"
      />

      {/* Results count */}
      {cases.length > 0 && (
        <div className="text-sm text-muted-foreground mb-4">
          Showing {filteredCases.length} of {cases.length} cases
        </div>
      )}

      {cases.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            No legal cases yet.
          </p>
          <Link
            href={`/llcs/${llcId}/legal/new`}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity text-sm"
          >
            New Case
          </Link>
        </div>
      ) : filteredCases.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground">
            No cases match your filters.
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Opposing Party</th>
                <th className="text-left px-4 py-3 font-medium">Court</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Next Hearing</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredCases.map((c) => (
                <tr key={c.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/llcs/${llcId}/legal/${c.id}`} className="hover:underline">
                      <div className="font-medium">v. {getOpposingPartyName(c.opposingParty)}</div>
                      {c.docketNumber && (
                        <div className="text-muted-foreground text-xs">#{c.docketNumber}</div>
                      )}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.court}
                  </td>
                  <td className="px-4 py-3">
                    {CASE_TYPE_LABELS[c.caseType] || c.caseType}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs ${STATUS_STYLES[c.status] || 'bg-gray-100'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {c.nextCourtDate ? (
                      <div>
                        <div className="font-medium">
                          {formatDate(c.nextCourtDate.date)}
                          {c.nextCourtDate.time && ( 
                            <span className="text-muted-foreground ml-1">
                              @ {formatTime(c.nextCourtDate.time)}
                              <span className="ml-1 text-xs align-top text-muted-foreground/70">
                                (CDT)
                              </span>
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Hearing Type: {COURT_DATE_TYPE_LABELS[c.nextCourtDate.type] || c.nextCourtDate.type}<br/>
                          {c.nextCourtDate.judge && `Judge: ${c.nextCourtDate.judge}`}
                        </div>
                      </div>
                    ) : c.nextHearingDate ? (
                      <div className="text-muted-foreground">{formatDate(c.nextHearingDate)}</div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/llcs/${llcId}/legal/${c.id}`}
                      className="inline-flex p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                      title="Edit"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                        <path d="m15 5 4 4"/>
                      </svg>
                    </Link>
                    <button
                      onClick={() => handleDelete(c.id, c.court)}
                      className="inline-flex p-1.5 text-muted-foreground hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18"/>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                        <line x1="10" x2="10" y1="11" y2="17"/>
                        <line x1="14" x2="14" y1="11" y2="17"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
