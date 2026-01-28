'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';

interface NewCasePageProps {
  params: Promise<{ llcId: string }>;
}

interface LlcOption {
  id: string;
  name: string;
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

const CASE_TYPES = [
  { value: 'eviction', label: 'Eviction' },
  { value: 'collections', label: 'Collections' },
  { value: 'property_damage', label: 'Property Damage' },
  { value: 'contract_dispute', label: 'Contract Dispute' },
  { value: 'personal_injury', label: 'Personal Injury' },
  { value: 'code_violation', label: 'Code Violation' },
  { value: 'other', label: 'Other' },
];

const VISIBILITIES = [
  { value: 'llcWide', label: 'LLC-Wide (all members can see)' },
  { value: 'restricted', label: 'Restricted (admin/legal + scoped members only)' },
];

function getTenantDisplayName(t: TenantOption): string {
  if (t.type === 'commercial') return t.businessName || 'Unknown Business';
  return `${t.firstName || ''} ${t.lastName || ''}`.trim() || 'Unknown';
}

export default function NewCasePage({ params }: NewCasePageProps) {
  const { llcId } = use(params);
  const router = useRouter();

  // Data for dropdowns
  const [llcs, setLlcs] = useState<LlcOption[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);

  // Court Info
  const [court, setCourt] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [docketNumber, setDocketNumber] = useState('');
  const [caseType, setCaseType] = useState('eviction');

  // Plaintiff
  const [plaintiffType, setPlaintiffType] = useState<'individual' | 'llc'>('individual');
  const [plaintiffName, setPlaintiffName] = useState('');
  const [plaintiffLlcId, setPlaintiffLlcId] = useState('');

  // Opposing Party
  const [opposingPartyType, setOpposingPartyType] = useState<'tenant' | 'other'>('other');
  const [opposingPartyTenantId, setOpposingPartyTenantId] = useState('');
  const [opposingPartyName, setOpposingPartyName] = useState('');
  const [tenantSearch, setTenantSearch] = useState('');

  // Opposing Counsel
  const [ocName, setOcName] = useState('');
  const [ocEmail, setOcEmail] = useState('');
  const [ocPhone, setOcPhone] = useState('');
  const [ocFirmName, setOcFirmName] = useState('');
  const [ocAddress, setOcAddress] = useState('');

  // Case Management
  const [ourCounsel, setOurCounsel] = useState('');
  const [caseManagers, setCaseManagers] = useState<string[]>([]);
  const [visibility, setVisibility] = useState('llcWide');

  // Dates & Details
  const [filingDate, setFilingDate] = useState('');
  const [nextHearingDate, setNextHearingDate] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch LLCs, tenants, properties, and members in parallel
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
    }).catch(() => {
      // Silently handle - dropdowns will just be empty
    });
  }, [llcId]);

  const selectedTenant = tenants.find((t) => t.id === opposingPartyTenantId);

  const getPropertyAddress = (propertyId: string | undefined): string => {
    if (!propertyId) return '';
    const prop = properties.find((p) => p.id === propertyId);
    return prop?.address || prop?.name || '';
  };

  const filteredTenants = tenants.filter((t) => {
    if (!tenantSearch) return true;
    const name = getTenantDisplayName(t).toLowerCase();
    return name.includes(tenantSearch.toLowerCase());
  });

  const handleCaseManagerToggle = (userId: string) => {
    setCaseManagers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const body: Record<string, unknown> = {
        court,
        jurisdiction,
        caseType,
        visibility,
      };

      if (docketNumber) body.docketNumber = docketNumber;

      // Plaintiff
      if (plaintiffType === 'individual' && plaintiffName) {
        body.plaintiff = { type: 'individual', name: plaintiffName };
      } else if (plaintiffType === 'llc' && plaintiffLlcId) {
        const selectedLlc = llcs.find((l) => l.id === plaintiffLlcId);
        if (selectedLlc) {
          body.plaintiff = { type: 'llc', llcId: selectedLlc.id, llcName: selectedLlc.name };
        }
      }

      // Opposing Party
      if (opposingPartyType === 'tenant' && opposingPartyTenantId && selectedTenant) {
        const tenantName = getTenantDisplayName(selectedTenant);
        const propertyAddress = getPropertyAddress(selectedTenant.propertyId);
        body.opposingParty = {
          type: 'tenant',
          tenantId: selectedTenant.id,
          tenantName,
          ...(propertyAddress && { propertyAddress }),
          ...(selectedTenant.email && { email: selectedTenant.email }),
          ...(selectedTenant.phone && { phone: selectedTenant.phone }),
        };
      } else if (opposingPartyType === 'other' && opposingPartyName) {
        body.opposingParty = { type: 'other', name: opposingPartyName };
      }

      // Opposing Counsel
      if (ocName) {
        body.opposingCounsel = {
          name: ocName,
          ...(ocEmail && { email: ocEmail }),
          ...(ocPhone && { phone: ocPhone }),
          ...(ocFirmName && { firmName: ocFirmName }),
          ...(ocAddress && { address: ocAddress }),
        };
      }

      if (ourCounsel) body.ourCounsel = ourCounsel;
      if (caseManagers.length > 0) body.caseManagers = caseManagers;
      if (filingDate) body.filingDate = new Date(filingDate).toISOString();
      if (nextHearingDate) body.nextHearingDate = new Date(nextHearingDate).toISOString();
      if (description) body.description = description;

      const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
      if (tagList.length > 0) body.tags = tagList;

      const res = await fetch(`/api/llcs/${llcId}/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.ok) {
        router.push(`/llcs/${llcId}/legal/${data.data.id}`);
      } else {
        setError(data.error?.message || 'Failed to create case');
      }
    } catch {
      setError('Failed to create case');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">New Legal Case</h1>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Court Information */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Court Information
          </legend>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="court" className="block text-sm font-medium mb-1">Court *</label>
              <input id="court" required value={court} onChange={(e) => setCourt(e.target.value)}
                placeholder="e.g. District Court of Hennepin County"
                className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
            </div>
            <div>
              <label htmlFor="jurisdiction" className="block text-sm font-medium mb-1">Jurisdiction *</label>
              <input id="jurisdiction" required value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)}
                placeholder="e.g. Minnesota"
                className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="docketNumber" className="block text-sm font-medium mb-1">Docket Number</label>
              <input id="docketNumber" value={docketNumber} onChange={(e) => setDocketNumber(e.target.value)}
                placeholder="e.g. 27-CV-24-12345"
                className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
            </div>
            <div>
              <label htmlFor="caseType" className="block text-sm font-medium mb-1">Case Type *</label>
              <select id="caseType" value={caseType} onChange={(e) => setCaseType(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm">
                {CASE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
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
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          )}
        </fieldset>

        {/* Opposing Party */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Opposing Party
          </legend>

          <div className="flex gap-4 mb-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="opposingPartyType" value="tenant"
                checked={opposingPartyType === 'tenant'}
                onChange={() => setOpposingPartyType('tenant')} />
              Tenant
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="opposingPartyType" value="other"
                checked={opposingPartyType === 'other'}
                onChange={() => setOpposingPartyType('other')} />
              Other
            </label>
          </div>

          {opposingPartyType === 'tenant' ? (
            <div className="space-y-3">
              <div>
                <label htmlFor="tenantSearch" className="block text-sm font-medium mb-1">Search Tenant</label>
                <input id="tenantSearch" value={tenantSearch} onChange={(e) => setTenantSearch(e.target.value)}
                  placeholder="Type to filter tenants..."
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
              </div>
              <div>
                <select value={opposingPartyTenantId} onChange={(e) => setOpposingPartyTenantId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm">
                  <option value="">-- Select a tenant --</option>
                  {filteredTenants.map((t) => (
                    <option key={t.id} value={t.id}>{getTenantDisplayName(t)}</option>
                  ))}
                </select>
              </div>

              {selectedTenant && (
                <div className="p-3 bg-secondary/50 rounded-md text-sm space-y-1">
                  <p className="font-medium">{getTenantDisplayName(selectedTenant)}</p>
                  {selectedTenant.propertyId && (
                    <p className="text-muted-foreground">Property: {getPropertyAddress(selectedTenant.propertyId) || selectedTenant.propertyId}</p>
                  )}
                  {selectedTenant.email && <p className="text-muted-foreground">Email: {selectedTenant.email}</p>}
                  {selectedTenant.phone && <p className="text-muted-foreground">Phone: {selectedTenant.phone}</p>}
                </div>
              )}
            </div>
          ) : (
            <div>
              <label htmlFor="opposingPartyName" className="block text-sm font-medium mb-1">Name</label>
              <input id="opposingPartyName" value={opposingPartyName} onChange={(e) => setOpposingPartyName(e.target.value)}
                placeholder="Opposing party name"
                className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
            </div>
          )}
        </fieldset>

        {/* Opposing Counsel */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Opposing Counsel
          </legend>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="ocName" className="block text-sm font-medium mb-1">Name</label>
              <input id="ocName" value={ocName} onChange={(e) => setOcName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
            </div>
            <div>
              <label htmlFor="ocEmail" className="block text-sm font-medium mb-1">Email</label>
              <input id="ocEmail" type="email" value={ocEmail} onChange={(e) => setOcEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="ocPhone" className="block text-sm font-medium mb-1">Phone</label>
              <input id="ocPhone" value={ocPhone} onChange={(e) => setOcPhone(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
            </div>
            <div>
              <label htmlFor="ocFirmName" className="block text-sm font-medium mb-1">Firm Name</label>
              <input id="ocFirmName" value={ocFirmName} onChange={(e) => setOcFirmName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
            </div>
          </div>

          <div>
            <label htmlFor="ocAddress" className="block text-sm font-medium mb-1">Address</label>
            <input id="ocAddress" value={ocAddress} onChange={(e) => setOcAddress(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
          </div>
        </fieldset>

        {/* Case Management */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Case Management
          </legend>

          <div>
            <label htmlFor="ourCounsel" className="block text-sm font-medium mb-1">Our Counsel</label>
            <input id="ourCounsel" value={ourCounsel} onChange={(e) => setOurCounsel(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="filingDate" className="block text-sm font-medium mb-1">Filing Date</label>
              <input id="filingDate" type="date" value={filingDate} onChange={(e) => setFilingDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
            </div>
            <div>
              <label htmlFor="nextHearingDate" className="block text-sm font-medium mb-1">Next Hearing</label>
              <input id="nextHearingDate" type="date" value={nextHearingDate} onChange={(e) => setNextHearingDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-1">Description</label>
            <textarea id="description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
          </div>

          <div>
            <label htmlFor="tags" className="block text-sm font-medium mb-1">Tags</label>
            <input id="tags" value={tags} onChange={(e) => setTags(e.target.value)}
              placeholder="urgent, appeal, discovery"
              className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
            <p className="text-xs text-muted-foreground mt-1">Comma-separated</p>
          </div>
        </fieldset>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={submitting}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity text-sm disabled:opacity-50">
            {submitting ? 'Creating...' : 'Create Case'}
          </button>
          <button type="button" onClick={() => router.push(`/llcs/${llcId}/legal`)}
            className="px-4 py-2 border rounded-md text-sm hover:bg-secondary transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
