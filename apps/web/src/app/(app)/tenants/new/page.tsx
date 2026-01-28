'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type TenantType = 'residential' | 'commercial';

export default function NewTenantPage() {
  const router = useRouter();

  const [tenantType, setTenantType] = useState<TenantType>('residential');

  // Residential fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [ssn4, setSsn4] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelationship, setEmergencyRelationship] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // Commercial fields
  const [businessName, setBusinessName] = useState('');
  const [dba, setDba] = useState('');
  const [businessType, setBusinessType] = useState('llc');
  const [einLast4, setEinLast4] = useState('');
  const [stateOfIncorporation, setStateOfIncorporation] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactTitle, setContactTitle] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Shared fields
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    let body: Record<string, unknown>;

    if (tenantType === 'residential') {
      body = {
        type: 'residential',
        firstName,
        lastName,
        email,
        phone: phone || undefined,
        dateOfBirth: dateOfBirth || undefined,
        ssn4: ssn4 || undefined,
        emergencyContact: emergencyName
          ? { name: emergencyName, relationship: emergencyRelationship, phone: emergencyPhone }
          : undefined,
        notes: notes || undefined,
      };
    } else {
      body = {
        type: 'commercial',
        businessName,
        dba: dba || undefined,
        businessType,
        einLast4: einLast4 || undefined,
        stateOfIncorporation: stateOfIncorporation || undefined,
        primaryContact: {
          name: contactName,
          title: contactTitle || undefined,
          email: contactEmail || undefined,
          phone: contactPhone || undefined,
        },
        email,
        phone: phone || undefined,
        notes: notes || undefined,
      };
    }

    try {
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.ok) {
        router.push(`/tenants/${data.data.id}`);
      } else {
        setError(data.error?.message || 'Failed to create tenant');
      }
    } catch {
      setError('Failed to create tenant');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link
          href="/tenants"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to Tenants
        </Link>
      </div>

      <div className="flex-1 p-6 m-6 border rounded-lg">
      <h1 className="text-2xl font-bold mb-6">Add New Tenant</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Tenant Type Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Tenant Type *</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="residential"
                checked={tenantType === 'residential'}
                onChange={(e) => setTenantType(e.target.value as TenantType)}
                className="accent-primary"
              />
              <span>Residential (Individual)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="commercial"
                checked={tenantType === 'commercial'}
                onChange={(e) => setTenantType(e.target.value as TenantType)}
                className="accent-primary"
              />
              <span>Commercial (Business)</span>
            </label>
          </div>
        </div>

        {/* Residential Fields */}
        {tenantType === 'residential' && (
          <div className="space-y-4 p-4 border rounded-lg">
            <h2 className="font-medium">Personal Information</h2>
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
                  className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
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
                  className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
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
                  className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label htmlFor="ssn4" className="block text-sm font-medium mb-2">
                  SSN (Last 4)
                </label>
                <input
                  id="ssn4"
                  type="text"
                  maxLength={4}
                  pattern="\d{4}"
                  value={ssn4}
                  onChange={(e) => setSsn4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="1234"
                  className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <h3 className="font-medium pt-4">Emergency Contact</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="emergencyName" className="block text-sm font-medium mb-2">
                  Name
                </label>
                <input
                  id="emergencyName"
                  type="text"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label htmlFor="emergencyRelationship" className="block text-sm font-medium mb-2">
                  Relationship
                </label>
                <input
                  id="emergencyRelationship"
                  type="text"
                  value={emergencyRelationship}
                  onChange={(e) => setEmergencyRelationship(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label htmlFor="emergencyPhone" className="block text-sm font-medium mb-2">
                  Phone
                </label>
                <input
                  id="emergencyPhone"
                  type="tel"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>
        )}

        {/* Commercial Fields */}
        {tenantType === 'commercial' && (
          <div className="space-y-4 p-4 border rounded-lg">
            <h2 className="font-medium">Business Information</h2>
            <div className="grid grid-cols-2 gap-4">
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
                  className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
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
                  className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="businessType" className="block text-sm font-medium mb-2">
                  Business Type *
                </label>
                <select
                  id="businessType"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
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
                  EIN (Last 4)
                </label>
                <input
                  id="einLast4"
                  type="text"
                  maxLength={4}
                  pattern="\d{4}"
                  value={einLast4}
                  onChange={(e) => setEinLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="1234"
                  className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label htmlFor="stateOfIncorporation" className="block text-sm font-medium mb-2">
                  State of Incorporation
                </label>
                <input
                  id="stateOfIncorporation"
                  type="text"
                  maxLength={2}
                  value={stateOfIncorporation}
                  onChange={(e) => setStateOfIncorporation(e.target.value.toUpperCase().slice(0, 2))}
                  placeholder="TX"
                  className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <h3 className="font-medium pt-4">Primary Contact *</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="contactName" className="block text-sm font-medium mb-2">
                  Name *
                </label>
                <input
                  id="contactName"
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label htmlFor="contactTitle" className="block text-sm font-medium mb-2">
                  Title
                </label>
                <input
                  id="contactTitle"
                  type="text"
                  value={contactTitle}
                  onChange={(e) => setContactTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="contactEmail" className="block text-sm font-medium mb-2">
                  Email
                </label>
                <input
                  id="contactEmail"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label htmlFor="contactPhone" className="block text-sm font-medium mb-2">
                  Phone
                </label>
                <input
                  id="contactPhone"
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>
        )}

        {/* Shared Fields */}
        <div className="space-y-4">
          <h2 className="font-medium">Contact Information</h2>
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
                className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
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
                className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
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
            className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create Tenant'}
          </button>
          <Link
            href="/tenants"
            className="px-6 py-2 border rounded-md hover:bg-secondary transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
      </div>
    </div>
  );
}
