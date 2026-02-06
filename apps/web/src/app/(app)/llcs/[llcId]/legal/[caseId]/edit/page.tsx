'use client';

import { useEffect, useState, useCallback, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { use } from 'react';

interface PlaintiffData {
  type: 'individual' | 'llc';
  name?: string;
  llcId?: string;
  llcName?: string;
}

interface OpposingPartyData {
  type: 'tenant' | 'other';
  tenantId?: string;
  tenantName?: string;
  propertyAddress?: string;
  tenantStatus?: string;
  email?: string;
  phone?: string;
  name?: string;
}

interface CounselData {
  name: string;
  email?: string;
  phone?: string;
  firmName?: string;
  address?: string;
}

interface CaseResolution {
  type: string;
  date: string;
  amount?: number;
  terms?: string;
  notes?: string;
}

interface CaseDetail {
  id: string;
  court: string;
  jurisdiction: string;
  docketNumber?: string;
  caseType: string;
  status: string;
  visibility: string;
  plaintiff?: PlaintiffData;
  opposingParty?: OpposingPartyData[] | OpposingPartyData;
  opposingCounsel?: CounselData[] | CounselData;
  ourCounsel?: CounselData[] | CounselData | string;
  caseManagers: string[];
  filingDate?: string;
  nextHearingDate?: string;
  resolution?: CaseResolution;
  description?: string;
  tags: string[];
  createdAt: string;
}

interface LlcOption {
  id: string;
  legalName: string;
}

interface TenantOption {
  id: string;
  type: 'residential' | 'commercial';
  firstName?: string;
  lastName?: string;
  businessName?: string;
  email?: string;
  phone?: string;
  propertyId?: string;
}

interface PropertyOption {
  id: string;
  address?: string;
  name?: string;
}

interface MemberOption {
  userId: string;
  email: string;
  displayName: string | null;
  role: string;
}

interface CounselEntry {
  name: string;
  email: string;
  phone: string;
  firmName: string;
  address: string;
}

interface OpposingPartyEntry {
  type: 'tenant' | 'other';
  tenantId: string;
  name: string;
  tenantSearch: string;
}

interface CaseEditPageProps {
  params: Promise<{ llcId: string; caseId: string }>;
}

const CASE_TYPES = [
  { value: 'eviction', label: 'Eviction' },
  { value: 'collections', label: 'Collections' },
  { value: 'property_damage', label: 'Property Damage' },
  { value: 'contract_dispute', label: 'Contract Dispute' },
  { value: 'personal_injury', label: 'Personal Injury' },
  { value: 'code_violation', label: 'Code Violation' },
  { value: 'other', label: 'Other' },
];

const STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'stayed', label: 'Stayed' },
  { value: 'settled', label: 'Settled' },
  { value: 'judgment', label: 'Judgment' },
  { value: 'closed', label: 'Closed' },
];

const VISIBILITIES = [
  { value: 'llcWide', label: 'LLC-Wide' },
  { value: 'restricted', label: 'Restricted' },
];

const RESOLUTION_TYPES = [
  { value: 'settlement', label: 'Settlement' },
  { value: 'judgment_plaintiff', label: 'Judgment for Plaintiff' },
  { value: 'judgment_defendant', label: 'Judgment for Defendant' },
  { value: 'default_judgment', label: 'Default Judgment' },
  { value: 'dismissal', label: 'Dismissal' },
  { value: 'voluntary_dismissal', label: 'Voluntary Dismissal' },
  { value: 'other', label: 'Other' },
];

function toDateInput(iso: string | undefined): string {
  if (!iso) return '';
  return iso.substring(0, 10);
}

function getTenantDisplayName(t: TenantOption): string {
  if (t.type === 'commercial') return t.businessName || 'Unknown Business';
  return `${t.firstName || ''} ${t.lastName || ''}`.trim() || 'Unknown';
}

const emptyCounsel = (): CounselEntry => ({ name: '', email: '', phone: '', firmName: '', address: '' });
const emptyOpposingParty = (): OpposingPartyEntry => ({ type: 'other', tenantId: '', name: '', tenantSearch: '' });

// Normalize data from Firestore: single object -> array, handle old string format for ourCounsel
function normalizeOpposingParty(val: OpposingPartyData[] | OpposingPartyData | undefined): OpposingPartyData[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return [val];
}

function normalizeOpposingCounsel(val: CounselData[] | CounselData | undefined): CounselData[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return [val];
}

function normalizeOurCounsel(val: CounselData[] | CounselData | string | undefined): CounselData[] {
  if (!val) return [];
  if (typeof val === 'string') return val ? [{ name: val }] : [];
  if (Array.isArray(val)) return val;
  return [val];
}

export default function CaseEditPage({ params }: CaseEditPageProps) {
  const { llcId, caseId } = use(params);
  const router = useRouter();

  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Data for dropdowns
  const [llcs, setLlcs] = useState<LlcOption[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);

  // Court Info
  const [court, setCourt] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [docketNumber, setDocketNumber] = useState('');
  const [caseType, setCaseType] = useState('');
  const [status, setStatus] = useState('');

  // Plaintiff
  const [plaintiffType, setPlaintiffType] = useState<'individual' | 'llc'>('individual');
  const [plaintiffName, setPlaintiffName] = useState('');
  const [plaintiffLlcId, setPlaintiffLlcId] = useState('');

  // Opposing Parties (array)
  const [opposingParties, setOpposingParties] = useState<OpposingPartyEntry[]>([]);

  // Opposing Counsel (array)
  const [opposingCounsels, setOpposingCounsels] = useState<CounselEntry[]>([]);

  // Our Counsel (array)
  const [ourCounsels, setOurCounsels] = useState<CounselEntry[]>([]);

  // Case Management
  const [caseManagers, setCaseManagers] = useState<string[]>([]);
  const [visibility, setVisibility] = useState('');

  // Dates & Details
  const [filingDate, setFilingDate] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');

  // Resolution
  const [hasResolution, setHasResolution] = useState(false);
  const [resolutionType, setResolutionType] = useState('');
  const [resolutionDate, setResolutionDate] = useState('');
  const [resolutionAmount, setResolutionAmount] = useState('');
  const [resolutionTerms, setResolutionTerms] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');

  const populateForm = useCallback((c: CaseDetail) => {
    setCourt(c.court);
    setJurisdiction(c.jurisdiction);
    setDocketNumber(c.docketNumber || '');
    setCaseType(c.caseType);
    setStatus(c.status);
    setVisibility(c.visibility);

    // Plaintiff
    if (c.plaintiff) {
      setPlaintiffType(c.plaintiff.type);
      if (c.plaintiff.type === 'individual') {
        setPlaintiffName(c.plaintiff.name || '');
      } else {
        setPlaintiffLlcId(c.plaintiff.llcId || '');
      }
    }

    // Opposing Parties - normalize from single or array
    const opArr = normalizeOpposingParty(c.opposingParty);
    setOpposingParties(opArr.map((op) => ({
      type: op.type,
      tenantId: op.type === 'tenant' ? (op.tenantId || '') : '',
      name: op.type === 'other' ? (op.name || '') : '',
      tenantSearch: '',
    })));

    // Opposing Counsel - normalize from single or array
    const ocArr = normalizeOpposingCounsel(c.opposingCounsel);
    setOpposingCounsels(ocArr.map((oc) => ({
      name: oc.name || '',
      email: oc.email || '',
      phone: oc.phone || '',
      firmName: oc.firmName || '',
      address: oc.address || '',
    })));

    // Our Counsel - normalize from string, single object, or array
    const ourArr = normalizeOurCounsel(c.ourCounsel);
    setOurCounsels(ourArr.map((oc) => ({
      name: oc.name || '',
      email: oc.email || '',
      phone: oc.phone || '',
      firmName: oc.firmName || '',
      address: oc.address || '',
    })));

    setCaseManagers(c.caseManagers || []);
    setFilingDate(toDateInput(c.filingDate));
    setDescription(c.description || '');
    setTags(c.tags.join(', '));

    // Resolution
    if (c.resolution) {
      setHasResolution(true);
      setResolutionType(c.resolution.type || '');
      setResolutionDate(toDateInput(c.resolution.date));
      setResolutionAmount(c.resolution.amount?.toString() || '');
      setResolutionTerms(c.resolution.terms || '');
      setResolutionNotes(c.resolution.notes || '');
    } else {
      setHasResolution(false);
      setResolutionType('');
      setResolutionDate('');
      setResolutionAmount('');
      setResolutionTerms('');
      setResolutionNotes('');
    }
  }, []);

  const fetchCase = useCallback(async () => {
    try {
      const res = await fetch(`/api/llcs/${llcId}/cases/${caseId}`);
      const data = await res.json();

      if (data.ok) {
        const c: CaseDetail = data.data;
        setCaseData(c);
        populateForm(c);
      } else {
        setError(data.error?.message || 'Failed to load case');
      }
    } catch {
      setError('Failed to load case');
    } finally {
      setLoading(false);
    }
  }, [llcId, caseId, populateForm]);

  useEffect(() => {
    fetchCase();
  }, [fetchCase]);

  useEffect(() => {
    // Fetch dropdown data
    Promise.all([
      fetch('/api/llcs').then((r) => r.json()),
      fetch(`/api/llcs/${llcId}/tenants`).then((r) => r.json()),
      fetch(`/api/llcs/${llcId}/properties`).then((r) => r.json()),
      fetch(`/api/llcs/${llcId}/members`).then((r) => r.json()),
    ]).then(([llcRes, tenantRes, propRes, memberRes]) => {
      if (llcRes.ok) setLlcs(llcRes.data);
      if (tenantRes.ok) setTenants(tenantRes.data);
      if (propRes.ok) setProperties(propRes.data);
      if (memberRes.ok) setMembers(memberRes.data);
    });
  }, [llcId]);

  const getPropertyAddress = (propertyId: string | undefined): string => {
    if (!propertyId) return '';
    const prop = properties.find((p) => p.id === propertyId);
    return prop?.address || prop?.name || '';
  };

  const getFilteredTenants = (search: string) => {
    return tenants.filter((t) => {
      if (!search) return true;
      const name = getTenantDisplayName(t).toLowerCase();
      return name.includes(search.toLowerCase());
    });
  };

  const handleCaseManagerToggle = (userId: string) => {
    setCaseManagers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Array helpers
  const updateOpposingParty = (index: number, updates: Partial<OpposingPartyEntry>) => {
    setOpposingParties((prev) => prev.map((p, i) => i === index ? { ...p, ...updates } : p));
  };

  const updateOpposingCounsel = (index: number, updates: Partial<CounselEntry>) => {
    setOpposingCounsels((prev) => prev.map((c, i) => i === index ? { ...c, ...updates } : c));
  };

  const updateOurCounsel = (index: number, updates: Partial<CounselEntry>) => {
    setOurCounsels((prev) => prev.map((c, i) => i === index ? { ...c, ...updates } : c));
  };

  const buildCurrentPlaintiff = (): PlaintiffData | undefined => {
    if (plaintiffType === 'individual' && plaintiffName) {
      return { type: 'individual', name: plaintiffName };
    } else if (plaintiffType === 'llc' && plaintiffLlcId) {
      const selectedLlc = llcs.find((l) => l.id === plaintiffLlcId);
      if (selectedLlc) {
        return { type: 'llc', llcId: selectedLlc.id, llcName: selectedLlc.legalName };
      }
    }
    return undefined;
  };

  const buildCurrentOpposingParties = (): OpposingPartyData[] => {
    const result: OpposingPartyData[] = [];
    for (const op of opposingParties) {
      if (op.type === 'tenant' && op.tenantId) {
        const tenant = tenants.find((t) => t.id === op.tenantId);
        if (tenant) {
          const tenantName = getTenantDisplayName(tenant);
          const propertyAddress = getPropertyAddress(tenant.propertyId);
          result.push({
            type: 'tenant',
            tenantId: tenant.id,
            tenantName,
            ...(propertyAddress && { propertyAddress }),
            ...(tenant.email && { email: tenant.email }),
            ...(tenant.phone && { phone: tenant.phone }),
          });
        }
      } else if (op.type === 'other' && op.name) {
        result.push({ type: 'other', name: op.name });
      }
    }
    return result;
  };

  const buildCurrentOpposingCounsels = (): CounselData[] => {
    return opposingCounsels
      .filter((c) => c.name)
      .map((c) => ({
        name: c.name,
        ...(c.email && { email: c.email }),
        ...(c.phone && { phone: c.phone }),
        ...(c.firmName && { firmName: c.firmName }),
        ...(c.address && { address: c.address }),
      }));
  };

  const buildCurrentOurCounsels = (): CounselData[] => {
    return ourCounsels
      .filter((c) => c.name)
      .map((c) => ({
        name: c.name,
        ...(c.email && { email: c.email }),
        ...(c.phone && { phone: c.phone }),
        ...(c.firmName && { firmName: c.firmName }),
        ...(c.address && { address: c.address }),
      }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const body: Record<string, unknown> = {};

      // Simple field diffs
      if (court !== caseData?.court) body.court = court;
      if (jurisdiction !== caseData?.jurisdiction) body.jurisdiction = jurisdiction;
      if (docketNumber !== (caseData?.docketNumber || '')) body.docketNumber = docketNumber;
      if (caseType !== caseData?.caseType) body.caseType = caseType;
      if (status !== caseData?.status) body.status = status;
      if (visibility !== caseData?.visibility) body.visibility = visibility;
      if (description !== (caseData?.description || '')) body.description = description;

      // Date diffs
      if (filingDate !== toDateInput(caseData?.filingDate)) {
        body.filingDate = filingDate ? new Date(filingDate).toISOString() : '';
      }

      // Resolution diff
      const currentResolution = hasResolution && resolutionType && resolutionDate
        ? {
            type: resolutionType,
            date: new Date(resolutionDate).toISOString(),
            ...(resolutionAmount && { amount: parseFloat(resolutionAmount) }),
            ...(resolutionTerms && { terms: resolutionTerms }),
            ...(resolutionNotes && { notes: resolutionNotes }),
          }
        : null;
      if (JSON.stringify(currentResolution) !== JSON.stringify(caseData?.resolution || null)) {
        body.resolution = currentResolution;
      }

      // Tags diff
      const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
      if (JSON.stringify(tagList) !== JSON.stringify(caseData?.tags)) {
        body.tags = tagList;
      }

      // Plaintiff diff
      const currentPlaintiff = buildCurrentPlaintiff();
      if (JSON.stringify(currentPlaintiff) !== JSON.stringify(caseData?.plaintiff)) {
        body.plaintiff = currentPlaintiff || null;
      }

      // Opposing Parties diff (always send as array)
      const currentOpposingParties = buildCurrentOpposingParties();
      const originalOpposingParties = normalizeOpposingParty(caseData?.opposingParty);
      if (JSON.stringify(currentOpposingParties) !== JSON.stringify(originalOpposingParties)) {
        body.opposingParty = currentOpposingParties.length > 0 ? currentOpposingParties : null;
      }

      // Opposing Counsel diff (always send as array)
      const currentOpposingCounsels = buildCurrentOpposingCounsels();
      const originalOpposingCounsels = normalizeOpposingCounsel(caseData?.opposingCounsel);
      if (JSON.stringify(currentOpposingCounsels) !== JSON.stringify(originalOpposingCounsels)) {
        body.opposingCounsel = currentOpposingCounsels.length > 0 ? currentOpposingCounsels : null;
      }

      // Our Counsel diff (always send as array)
      const currentOurCounsels = buildCurrentOurCounsels();
      const originalOurCounsels = normalizeOurCounsel(caseData?.ourCounsel);
      if (JSON.stringify(currentOurCounsels) !== JSON.stringify(originalOurCounsels)) {
        body.ourCounsel = currentOurCounsels.length > 0 ? currentOurCounsels : null;
      }

      // Case Managers diff
      const sortedCurrent = [...caseManagers].sort();
      const sortedOriginal = [...(caseData?.caseManagers || [])].sort();
      if (JSON.stringify(sortedCurrent) !== JSON.stringify(sortedOriginal)) {
        body.caseManagers = caseManagers;
      }

      if (Object.keys(body).length === 0) {
        setSuccess('No changes to save.');
        setSubmitting(false);
        return;
      }

      const res = await fetch(`/api/llcs/${llcId}/cases/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.ok) {
        setSuccess('Case updated successfully.');
        setCaseData(data.data);
        // Redirect back to case detail after brief delay
        setTimeout(() => router.push(`/llcs/${llcId}/legal/${caseId}`), 1000);
      } else {
        setError(data.error?.message || 'Failed to update case');
      }
    } catch {
      setError('Failed to update case');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading case...</div>;
  }

  if (!caseData) {
    return <div className="text-destructive">{error || 'Case not found'}</div>;
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Edit Case</h1>
          <p className="text-sm text-muted-foreground">
            {caseData.docketNumber || `${caseData.caseType} Case`}
          </p>
        </div>
        <Link
          href={`/llcs/${llcId}/legal/${caseId}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Cancel
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 text-green-800 rounded-md text-sm">{success}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Court Information */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Court Information
          </legend>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="court" className="block text-sm font-medium mb-1">Court</label>
              <input id="court" required value={court} onChange={(e) => setCourt(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
            </div>
            <div>
              <label htmlFor="jurisdiction" className="block text-sm font-medium mb-1">Jurisdiction</label>
              <input id="jurisdiction" required value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="docketNumber" className="block text-sm font-medium mb-1">Docket #</label>
              <input id="docketNumber" value={docketNumber} onChange={(e) => setDocketNumber(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
            </div>
            <div>
              <label htmlFor="caseType" className="block text-sm font-medium mb-1">Type</label>
              <select id="caseType" value={caseType} onChange={(e) => setCaseType(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm">
                {CASE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium mb-1">Status</label>
              <select id="status" value={status} onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm">
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
        </fieldset>

        {/* Plaintiff */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Plaintiff
          </legend>

          <div className="flex gap-4 mb-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="plaintiffType" value="individual"
                checked={plaintiffType === 'individual'}
                onChange={() => setPlaintiffType('individual')} />
              Individual
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="plaintiffType" value="llc"
                checked={plaintiffType === 'llc'}
                onChange={() => setPlaintiffType('llc')} />
              Business/LLC
            </label>
          </div>

          {plaintiffType === 'individual' ? (
            <div>
              <label htmlFor="plaintiffName" className="block text-sm font-medium mb-1">Name</label>
              <input id="plaintiffName" value={plaintiffName} onChange={(e) => setPlaintiffName(e.target.value)}
                placeholder="Plaintiff name"
                className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
            </div>
          ) : (
            <div>
              <label htmlFor="plaintiffLlc" className="block text-sm font-medium mb-1">Select LLC</label>
              <select id="plaintiffLlc" value={plaintiffLlcId} onChange={(e) => setPlaintiffLlcId(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm">
                <option value="">-- Select an LLC --</option>
                {llcs.map((l) => (
                  <option key={l.id} value={l.id}>{l.legalName}</option>
                ))}
              </select>
            </div>
          )}
        </fieldset>

        {/* Opposing Parties */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Opposing Parties
          </legend>

          {opposingParties.map((op, idx) => {
            const selectedTenant = tenants.find((t) => t.id === op.tenantId);
            const filtered = getFilteredTenants(op.tenantSearch);
            const savedOpData = normalizeOpposingParty(caseData?.opposingParty)[idx];
            return (
              <div key={idx} className="p-4 border rounded-md space-y-3 relative">
                <button type="button"
                  onClick={() => setOpposingParties((prev) => prev.filter((_, i) => i !== idx))}
                  className="absolute top-2 right-2 text-xs text-destructive hover:underline">
                  Remove
                </button>

                <div className="flex gap-4 mb-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name={`opType-${idx}`} value="tenant"
                      checked={op.type === 'tenant'}
                      onChange={() => updateOpposingParty(idx, { type: 'tenant' })} />
                    Tenant
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name={`opType-${idx}`} value="other"
                      checked={op.type === 'other'}
                      onChange={() => updateOpposingParty(idx, { type: 'other' })} />
                    Other
                  </label>
                </div>

                {op.type === 'tenant' ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Search Tenant</label>
                      <input value={op.tenantSearch}
                        onChange={(e) => updateOpposingParty(idx, { tenantSearch: e.target.value })}
                        placeholder="Type to filter tenants..."
                        className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
                    </div>
                    <div>
                      <select value={op.tenantId}
                        onChange={(e) => updateOpposingParty(idx, { tenantId: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md bg-background text-sm">
                        <option value="">-- Select a tenant --</option>
                        {filtered.map((t) => (
                          <option key={t.id} value={t.id}>{getTenantDisplayName(t)}</option>
                        ))}
                      </select>
                    </div>

                    {(selectedTenant || (op.tenantId && savedOpData?.type === 'tenant')) && (
                      <div className="p-3 bg-secondary/50 rounded-md text-sm space-y-1">
                        {selectedTenant ? (
                          <>
                            <p className="font-medium">{getTenantDisplayName(selectedTenant)}</p>
                            {selectedTenant.propertyId && (
                              <p className="text-muted-foreground">Property: {getPropertyAddress(selectedTenant.propertyId) || selectedTenant.propertyId}</p>
                            )}
                            {selectedTenant.email && <p className="text-muted-foreground">Email: {selectedTenant.email}</p>}
                            {selectedTenant.phone && <p className="text-muted-foreground">Phone: {selectedTenant.phone}</p>}
                          </>
                        ) : (
                          <>
                            <p className="font-medium">{savedOpData?.tenantName}</p>
                            {savedOpData?.propertyAddress && (
                              <p className="text-muted-foreground">Property: {savedOpData.propertyAddress}</p>
                            )}
                            {savedOpData?.email && <p className="text-muted-foreground">Email: {savedOpData.email}</p>}
                            {savedOpData?.phone && <p className="text-muted-foreground">Phone: {savedOpData.phone}</p>}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input value={op.name}
                      onChange={(e) => updateOpposingParty(idx, { name: e.target.value })}
                      placeholder="Opposing party name"
                      className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
                  </div>
                )}
              </div>
            );
          })}

          <button type="button"
            onClick={() => setOpposingParties((prev) => [...prev, emptyOpposingParty()])}
            className="text-sm text-primary hover:underline">
            + Add Opposing Party
          </button>
        </fieldset>

        {/* Opposing Counsel */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Opposing Counsel
          </legend>

          {opposingCounsels.map((oc, idx) => (
            <div key={idx} className="p-4 border rounded-md space-y-3 relative">
              <button type="button"
                onClick={() => setOpposingCounsels((prev) => prev.filter((_, i) => i !== idx))}
                className="absolute top-2 right-2 text-xs text-destructive hover:underline">
                Remove
              </button>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input value={oc.name}
                    onChange={(e) => updateOpposingCounsel(idx, { name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input type="email" value={oc.email}
                    onChange={(e) => updateOpposingCounsel(idx, { email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input value={oc.phone}
                    onChange={(e) => updateOpposingCounsel(idx, { phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Firm Name</label>
                  <input value={oc.firmName}
                    onChange={(e) => updateOpposingCounsel(idx, { firmName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <input value={oc.address}
                  onChange={(e) => updateOpposingCounsel(idx, { address: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
              </div>
            </div>
          ))}

          <button type="button"
            onClick={() => setOpposingCounsels((prev) => [...prev, emptyCounsel()])}
            className="text-sm text-primary hover:underline">
            + Add Opposing Counsel
          </button>
        </fieldset>

        {/* Case Management */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Case Management
          </legend>

          {/* Our Counsel */}
          <div className="space-y-3">
            <label className="block text-sm font-medium">Our Counsel</label>
            {ourCounsels.map((oc, idx) => (
              <div key={idx} className="p-4 border rounded-md space-y-3 relative">
                <button type="button"
                  onClick={() => setOurCounsels((prev) => prev.filter((_, i) => i !== idx))}
                  className="absolute top-2 right-2 text-xs text-destructive hover:underline">
                  Remove
                </button>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input value={oc.name}
                      onChange={(e) => updateOurCounsel(idx, { name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input type="email" value={oc.email}
                      onChange={(e) => updateOurCounsel(idx, { email: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone</label>
                    <input value={oc.phone}
                      onChange={(e) => updateOurCounsel(idx, { phone: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Firm Name</label>
                    <input value={oc.firmName}
                      onChange={(e) => updateOurCounsel(idx, { firmName: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Address</label>
                  <input value={oc.address}
                    onChange={(e) => updateOurCounsel(idx, { address: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
                </div>
              </div>
            ))}

            <button type="button"
              onClick={() => setOurCounsels((prev) => [...prev, emptyCounsel()])}
              className="text-sm text-primary hover:underline">
              + Add Our Counsel
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Case Managers</label>
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members available</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                {members.map((m) => (
                  <label key={m.userId} className="flex items-center gap-2 text-sm">
                    <input type="checkbox"
                      checked={caseManagers.includes(m.userId)}
                      onChange={() => handleCaseManagerToggle(m.userId)} />
                    <span>{m.displayName || m.email}</span>
                    <span className="text-muted-foreground text-xs">({m.role})</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="visibility" className="block text-sm font-medium mb-1">Visibility</label>
            <select id="visibility" value={visibility} onChange={(e) => setVisibility(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background text-sm">
              {VISIBILITIES.map((v) => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </select>
          </div>
        </fieldset>

        {/* Dates & Details */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Dates & Details
          </legend>

          <div>
            <label htmlFor="filingDate" className="block text-sm font-medium mb-1">Filing Date</label>
            <input id="filingDate" type="date" value={filingDate} onChange={(e) => setFilingDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background text-sm max-w-xs" />
          </div>

          {caseData?.nextHearingDate && (
            <div className="p-3 bg-secondary/50 rounded-md">
              <p className="text-sm text-muted-foreground">Next Hearing Date (auto-computed from court dates)</p>
              <p className="text-sm font-medium">{new Date(caseData.nextHearingDate).toLocaleDateString()}</p>
            </div>
          )}

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-1">Description</label>
            <textarea id="description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
          </div>

          <div>
            <label htmlFor="tags" className="block text-sm font-medium mb-1">Tags</label>
            <input id="tags" value={tags} onChange={(e) => setTags(e.target.value)}
              placeholder="urgent, appeal"
              className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
            <p className="text-xs text-muted-foreground mt-1">Comma-separated</p>
          </div>
        </fieldset>

        {/* Resolution */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Resolution
          </legend>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={hasResolution}
              onChange={(e) => setHasResolution(e.target.checked)}
            />
            Case has been resolved
          </label>

          {hasResolution && (
            <div className="space-y-4 p-4 border rounded-md bg-green-50/50">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="resolutionType" className="block text-sm font-medium mb-1">Resolution Type *</label>
                  <select
                    id="resolutionType"
                    required={hasResolution}
                    value={resolutionType}
                    onChange={(e) => setResolutionType(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                  >
                    <option value="">-- Select type --</option>
                    {RESOLUTION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="resolutionDate" className="block text-sm font-medium mb-1">Resolution Date *</label>
                  <input
                    id="resolutionDate"
                    type="date"
                    required={hasResolution}
                    value={resolutionDate}
                    onChange={(e) => setResolutionDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="resolutionAmount" className="block text-sm font-medium mb-1">Amount ($)</label>
                <input
                  id="resolutionAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={resolutionAmount}
                  onChange={(e) => setResolutionAmount(e.target.value)}
                  placeholder="Settlement or judgment amount"
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm max-w-xs"
                />
              </div>

              <div>
                <label htmlFor="resolutionTerms" className="block text-sm font-medium mb-1">Terms</label>
                <textarea
                  id="resolutionTerms"
                  rows={2}
                  value={resolutionTerms}
                  onChange={(e) => setResolutionTerms(e.target.value)}
                  placeholder="Key terms of settlement or judgment..."
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                />
              </div>

              <div>
                <label htmlFor="resolutionNotes" className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  id="resolutionNotes"
                  rows={2}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Additional notes..."
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                />
              </div>
            </div>
          )}
        </fieldset>

        <div className="flex items-center gap-3 pt-4">
          <button type="submit" disabled={submitting}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity text-sm disabled:opacity-50">
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
          <Link
            href={`/llcs/${llcId}/legal/${caseId}`}
            className="px-4 py-2 border rounded-md text-sm hover:bg-secondary transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
