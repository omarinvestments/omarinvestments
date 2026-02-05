'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface LlcOption {
  id: string;
  name: string;
}

interface PropertyOption {
  id: string;
  name?: string;
  address: { street1: string; city: string; state: string };
  llcId: string;
}

type StaffRole = 'employee' | 'manager' | 'admin';

export default function NewStaffPage() {
  const router = useRouter();

  // Personal info
  const [firstName, setFirstName] = useState('');
  const [middleInitial, setMiddleInitial] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [ssn4, setSsn4] = useState('');

  // Role and assignments
  const [role, setRole] = useState<StaffRole>('employee');
  const [selectedLlcIds, setSelectedLlcIds] = useState<string[]>([]);
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);

  // Capabilities (for employees)
  const [workOrderAccess, setWorkOrderAccess] = useState(true);
  const [taskAccess, setTaskAccess] = useState(true);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // UI state
  const [llcs, setLlcs] = useState<LlcOption[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch LLCs on mount
  useEffect(() => {
    async function fetchLlcs() {
      try {
        const res = await fetch('/api/llcs');
        const data = await res.json();
        if (data.ok) {
          setLlcs(data.data);
        }
      } catch {
        // silently fail
      }
    }
    fetchLlcs();
  }, []);

  // Fetch properties when LLCs change
  useEffect(() => {
    async function fetchProperties() {
      if (selectedLlcIds.length === 0) {
        setProperties([]);
        return;
      }

      try {
        const allProperties: PropertyOption[] = [];
        for (const llcId of selectedLlcIds) {
          const res = await fetch(`/api/llcs/${llcId}/properties`);
          const data = await res.json();
          if (data.ok) {
            allProperties.push(...data.data.map((p: PropertyOption) => ({ ...p, llcId })));
          }
        }
        setProperties(allProperties);
      } catch {
        // silently fail
      }
    }
    fetchProperties();
  }, [selectedLlcIds]);

  const handleLlcToggle = (llcId: string) => {
    setSelectedLlcIds(prev =>
      prev.includes(llcId)
        ? prev.filter(id => id !== llcId)
        : [...prev, llcId]
    );
    // Clear property selections when LLCs change
    setSelectedPropertyIds([]);
  };

  const handlePropertyToggle = (propertyId: string) => {
    setSelectedPropertyIds(prev =>
      prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (selectedLlcIds.length === 0) {
      setError('Please select at least one LLC');
      return;
    }

    if (ssn4.length !== 4) {
      setError('Please enter exactly 4 digits for SSN');
      return;
    }

    setLoading(true);

    try {
      const body = {
        type: 'residential' as const,
        role,
        firstName,
        middleInitial: middleInitial || undefined,
        lastName,
        dateOfBirth,
        ssn4,
        llcIds: selectedLlcIds,
        propertyIds: role === 'manager' ? selectedPropertyIds : [],
        capabilities: role === 'employee' || role === 'manager' ? {
          workOrderAccess,
          taskAccess,
          paymentProcessing,
        } : undefined,
      };

      const res = await fetch('/api/activations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!data.ok) {
        setError(data.error || 'Failed to create staff member');
        return;
      }

      router.push('/admin/users?created=staff');
    } catch {
      setError('Failed to create staff member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link
          href="/admin/users"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to Users
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-2">Add Staff Member</h1>
      <p className="text-muted-foreground mb-6">
        Create a new staff account. They will receive an activation code to set up their login.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Role Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Role *</label>
          <div className="flex gap-2">
            {(['employee', 'manager', 'admin'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium border transition-colors ${
                  role === r
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-input hover:bg-secondary'
                }`}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {role === 'admin' && 'Full access to manage LLC settings, members, and all properties.'}
            {role === 'manager' && 'Can manage assigned properties and tenants.'}
            {role === 'employee' && 'Can handle work orders, tasks, and payments based on capabilities.'}
          </p>
        </div>

        {/* Personal Information */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Personal Information</h2>

          <div className="grid grid-cols-6 gap-4">
            <div className="col-span-2">
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
            <div className="col-span-1">
              <label htmlFor="middleInitial" className="block text-sm font-medium mb-2">
                M.I.
              </label>
              <input
                id="middleInitial"
                type="text"
                value={middleInitial}
                onChange={(e) => setMiddleInitial(e.target.value.slice(0, 1).toUpperCase())}
                maxLength={1}
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring text-center"
              />
            </div>
            <div className="col-span-3">
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
                Date of Birth *
              </label>
              <input
                id="dateOfBirth"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                required
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="ssn4" className="block text-sm font-medium mb-2">
                SSN (last 4) *
              </label>
              <input
                id="ssn4"
                type="text"
                value={ssn4}
                onChange={(e) => setSsn4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                maxLength={4}
                required
                pattern="\d{4}"
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="1234"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            This information is used for account activation verification.
          </p>
        </div>

        {/* LLC Assignment */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium">LLC Assignment *</h2>
          <p className="text-sm text-muted-foreground">
            Select which LLCs this staff member should have access to.
          </p>
          <div className="space-y-2 max-h-48 overflow-y-auto border border-input rounded-md p-3">
            {llcs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Loading LLCs...</p>
            ) : (
              llcs.map((llc) => (
                <label key={llc.id} className="flex items-center gap-3 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={selectedLlcIds.includes(llc.id)}
                    onChange={() => handleLlcToggle(llc.id)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{llc.name}</span>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Property Assignment (for managers) */}
        {role === 'manager' && selectedLlcIds.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium">Property Assignment</h2>
            <p className="text-sm text-muted-foreground">
              Optionally limit this manager to specific properties. Leave empty for access to all properties in selected LLCs.
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-input rounded-md p-3">
              {properties.length === 0 ? (
                <p className="text-sm text-muted-foreground">No properties found</p>
              ) : (
                properties.map((prop) => (
                  <label key={prop.id} className="flex items-center gap-3 cursor-pointer py-1">
                    <input
                      type="checkbox"
                      checked={selectedPropertyIds.includes(prop.id)}
                      onChange={() => handlePropertyToggle(prop.id)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">
                      {prop.name || prop.address.street1} — {prop.address.city}, {prop.address.state}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        )}

        {/* Capabilities (for employees and managers) */}
        {(role === 'employee' || role === 'manager') && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium">Capabilities</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={workOrderAccess}
                  onChange={(e) => setWorkOrderAccess(e.target.checked)}
                  className="w-4 h-4"
                />
                <div>
                  <span className="text-sm font-medium">Work Order Access</span>
                  <p className="text-xs text-muted-foreground">Can view and manage work orders</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={taskAccess}
                  onChange={(e) => setTaskAccess(e.target.checked)}
                  className="w-4 h-4"
                />
                <div>
                  <span className="text-sm font-medium">Task Access</span>
                  <p className="text-xs text-muted-foreground">Can view and manage tasks</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={paymentProcessing}
                  onChange={(e) => setPaymentProcessing(e.target.checked)}
                  className="w-4 h-4"
                />
                <div>
                  <span className="text-sm font-medium">Payment Processing</span>
                  <p className="text-xs text-muted-foreground">Can process tenant payments</p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading || !firstName || !lastName || !dateOfBirth || selectedLlcIds.length === 0}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Staff Member'}
          </button>
          <Link
            href="/admin/users"
            className="px-6 py-2 border border-input rounded-md hover:bg-secondary transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
