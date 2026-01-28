'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { use } from 'react';

interface EditTenantPageProps {
  params: Promise<{ llcId: string; tenantId: string }>;
}

interface PropertyOption {
  id: string;
  name?: string;
  address: { street1: string; city: string; state: string };
}

export default function EditTenantPage({ params }: EditTenantPageProps) {
  const { llcId, tenantId } = use(params);
  const router = useRouter();

  // Type (read-only after creation)
  const [tenantType, setTenantType] = useState<'residential' | 'commercial'>('residential');

  // Shared fields
  const [propertyId, setPropertyId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Residential fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [ssn4, setSsn4] = useState('');
  const [ecName, setEcName] = useState('');
  const [ecRelationship, setEcRelationship] = useState('');
  const [ecPhone, setEcPhone] = useState('');

  // Commercial fields
  const [businessName, setBusinessName] = useState('');
  const [dba, setDba] = useState('');
  const [businessType, setBusinessType] = useState('llc');
  const [einLast4, setEinLast4] = useState('');
  const [stateOfIncorporation, setStateOfIncorporation] = useState('');
  const [pcName, setPcName] = useState('');
  const [pcTitle, setPcTitle] = useState('');
  const [pcEmail, setPcEmail] = useState('');
  const [pcPhone, setPcPhone] = useState('');

  // UI state
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [tenantRes, propertiesRes] = await Promise.all([
          fetch(`/api/llcs/${llcId}/tenants/${tenantId}`),
          fetch(`/api/llcs/${llcId}/properties`),
        ]);

        const tenantData = await tenantRes.json();
        const propertiesData = await propertiesRes.json();

        if (propertiesData.ok) {
          setProperties(propertiesData.data);
        }

        if (tenantData.ok) {
          const t = tenantData.data;
          setTenantType(t.type);
          setPropertyId(t.propertyId || '');
          setEmail(t.email || '');
          setPhone(t.phone || '');
          setNotes(t.notes || '');

          if (t.type === 'residential') {
            setFirstName(t.firstName || '');
            setLastName(t.lastName || '');
            setDateOfBirth(t.dateOfBirth || '');
            setSsn4(t.ssn4 || '');
            setEcName(t.emergencyContact?.name || '');
            setEcRelationship(t.emergencyContact?.relationship || '');
            setEcPhone(t.emergencyContact?.phone || '');
          } else {
            setBusinessName(t.businessName || '');
            setDba(t.dba || '');
            setBusinessType(t.businessType || 'llc');
            setEinLast4(t.einLast4 || '');
            setStateOfIncorporation(t.stateOfIncorporation || '');
            setPcName(t.primaryContact?.name || '');
            setPcTitle(t.primaryContact?.title || '');
            setPcEmail(t.primaryContact?.email || '');
            setPcPhone(t.primaryContact?.phone || '');
          }
        } else {
          setError(tenantData.error?.message || 'Failed to load tenant');
        }
      } catch {
        setError('Failed to load tenant');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [llcId, tenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      let body: Record<string, unknown>;

      if (tenantType === 'residential') {
        body = {
          type: 'residential',
          propertyId,
          firstName,
          lastName,
          email,
          phone: phone || undefined,
          dateOfBirth: dateOfBirth || undefined,
          ssn4: ssn4 || undefined,
          emergencyContact: ecName
            ? { name: ecName, relationship: ecRelationship, phone: ecPhone }
            : undefined,
          notes: notes || undefined,
        };
      } else {
        body = {
          type: 'commercial',
          propertyId,
          businessName,
          dba: dba || undefined,
          businessType,
          einLast4: einLast4 || undefined,
          stateOfIncorporation: stateOfIncorporation || undefined,
          primaryContact: { name: pcName, title: pcTitle || undefined, email: pcEmail || undefined, phone: pcPhone || undefined },
          email,
          phone: phone || undefined,
          notes: notes || undefined,
        };
      }

      const res = await fetch(`/api/llcs/${llcId}/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.ok) {
        setSuccess('Tenant updated successfully.');
      } else {
        setError(data.error?.message || 'Failed to update tenant');
      }
    } catch {
      setError('Failed to update tenant');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this tenant? This cannot be undone.')) return;

    try {
      const res = await fetch(`/api/llcs/${llcId}/tenants/${tenantId}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.ok) {
        router.push(`/llcs/${llcId}/tenants`);
      } else {
        alert(data.error?.message || 'Failed to delete tenant');
      }
    } catch {
      alert('Failed to delete tenant');
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading tenant...</div>;
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link
          href={`/llcs/${llcId}/tenants`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to Tenants
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">Edit Tenant</h1>
        <span
          className={`px-2 py-0.5 rounded text-xs ${
            tenantType === 'commercial'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-purple-100 text-purple-800'
          }`}
        >
          {tenantType}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-green-50 text-green-800 rounded-md text-sm border border-green-200">
            {success}
          </div>
        )}

        {/* Property Selector */}
        <div>
          <label htmlFor="propertyId" className="block text-sm font-medium mb-2">
            Property *
          </label>
          <select
            id="propertyId"
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            required
            className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Select a property...</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name || p.address.street1} — {p.address.city}, {p.address.state}
              </option>
            ))}
          </select>
        </div>

        {/* Residential Fields */}
        {tenantType === 'residential' && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium">Personal Information</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium mb-2">
                  First Name *
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium mb-2">
                  Last Name *
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="dateOfBirth" className="block text-sm font-medium mb-2">
                  Date of Birth
                </label>
                <input
                  id="dateOfBirth"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label htmlFor="ssn4" className="block text-sm font-medium mb-2">
                  SSN (last 4)
                </label>
                <input
                  id="ssn4"
                  type="text"
                  value={ssn4}
                  onChange={(e) => setSsn4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  maxLength={4}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-medium text-muted-foreground">Emergency Contact</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="ecName" className="block text-sm font-medium mb-2">Name</label>
                  <input
                    id="ecName"
                    type="text"
                    value={ecName}
                    onChange={(e) => setEcName(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label htmlFor="ecRelationship" className="block text-sm font-medium mb-2">Relationship</label>
                  <input
                    id="ecRelationship"
                    type="text"
                    value={ecRelationship}
                    onChange={(e) => setEcRelationship(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label htmlFor="ecPhone" className="block text-sm font-medium mb-2">Phone</label>
                  <input
                    id="ecPhone"
                    type="tel"
                    value={ecPhone}
                    onChange={(e) => setEcPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Commercial Fields */}
        {tenantType === 'commercial' && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium">Business Information</h2>

            <div>
              <label htmlFor="businessName" className="block text-sm font-medium mb-2">
                Business Name *
              </label>
              <input
                id="businessName"
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label htmlFor="dba" className="block text-sm font-medium mb-2">
                DBA (Doing Business As)
              </label>
              <input
                id="dba"
                type="text"
                value={dba}
                onChange={(e) => setDba(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="businessType" className="block text-sm font-medium mb-2">
                  Business Type
                </label>
                <select
                  id="businessType"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="llc">LLC</option>
                  <option value="corporation">Corporation</option>
                  <option value="sole_proprietorship">Sole Proprietorship</option>
                  <option value="partnership">Partnership</option>
                  <option value="nonprofit">Nonprofit</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="einLast4" className="block text-sm font-medium mb-2">
                  EIN (last 4)
                </label>
                <input
                  id="einLast4"
                  type="text"
                  value={einLast4}
                  onChange={(e) => setEinLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  maxLength={4}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label htmlFor="stateOfIncorporation" className="block text-sm font-medium mb-2">
                  State of Inc.
                </label>
                <input
                  id="stateOfIncorporation"
                  type="text"
                  value={stateOfIncorporation}
                  onChange={(e) => setStateOfIncorporation(e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 2))}
                  maxLength={2}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring uppercase"
                />
              </div>
            </div>

            {/* Primary Contact */}
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-medium text-muted-foreground">Primary Contact</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="pcName" className="block text-sm font-medium mb-2">Name *</label>
                  <input
                    id="pcName"
                    type="text"
                    value={pcName}
                    onChange={(e) => setPcName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label htmlFor="pcTitle" className="block text-sm font-medium mb-2">Title</label>
                  <input
                    id="pcTitle"
                    type="text"
                    value={pcTitle}
                    onChange={(e) => setPcTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="pcEmail" className="block text-sm font-medium mb-2">Email</label>
                  <input
                    id="pcEmail"
                    type="email"
                    value={pcEmail}
                    onChange={(e) => setPcEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label htmlFor="pcPhone" className="block text-sm font-medium mb-2">Phone</label>
                  <input
                    id="pcPhone"
                    type="tel"
                    value={pcPhone}
                    onChange={(e) => setPcPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Shared Contact Fields */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Contact</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email *
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium mb-2">
                Phone
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium mb-2">
            Notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4">
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving || !propertyId || !email}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <Link
              href={`/llcs/${llcId}/tenants`}
              className="px-6 py-2 border border-input rounded-md hover:bg-secondary transition-colors"
            >
              Cancel
            </Link>
          </div>
          <button
            type="button"
            onClick={handleDelete}
            className="text-sm text-destructive hover:underline"
          >
            Delete Tenant
          </button>
        </div>
      </form>
    </div>
  );
}
