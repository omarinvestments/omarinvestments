'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ActivationData {
  activationId: string;
  verificationToken: string;
  firstName: string;
  middleInitial?: string;
  lastName: string;
  role: string;
}

export default function ConfirmPage() {
  const [activationData, setActivationData] = useState<ActivationData | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Get activation data from sessionStorage
    const stored = sessionStorage.getItem('activationData');
    if (!stored) {
      router.push('/activate');
      return;
    }

    try {
      const data = JSON.parse(stored) as ActivationData;
      setActivationData(data);
    } catch {
      router.push('/activate');
    }
  }, [router]);

  const formatName = (data: ActivationData): string => {
    if (data.middleInitial) {
      return `${data.firstName} ${data.middleInitial}. ${data.lastName}`;
    }
    return `${data.firstName} ${data.lastName}`;
  };

  const getRoleLabel = (role: string): string => {
    const labels: Record<string, string> = {
      tenant: 'Tenant',
      employee: 'Employee',
      manager: 'Property Manager',
      admin: 'Administrator',
    };
    return labels[role] || role;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!confirmed) {
      setError('Please confirm that this is your account.');
      return;
    }

    if (!activationData) {
      setError('Session expired. Please start over.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/activate/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activationId: activationData.activationId,
          verificationToken: activationData.verificationToken,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        setError(data.error || 'Confirmation failed. Please start over.');
        return;
      }

      // Store confirmation token for the next step
      sessionStorage.setItem('confirmationData', JSON.stringify({
        confirmationToken: data.data.confirmationToken,
        activationId: data.data.activationId,
        name: formatName(activationData),
        role: activationData.role,
      }));

      // Navigate to create account step
      router.push('/activate/create-account');
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!activationData) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="text-muted-foreground">Loading...</div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-2 text-center">Confirm Your Identity</h1>
        <p className="text-sm text-muted-foreground mb-6 text-center">
          We found your account. Please confirm the information below.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Account Info Card */}
          <div className="p-6 border border-input rounded-lg bg-secondary/20">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Name</p>
              <p className="text-xl font-semibold mb-4">{formatName(activationData)}</p>
              <p className="text-sm text-muted-foreground mb-1">Account Type</p>
              <p className="text-lg">{getRoleLabel(activationData.role)}</p>
            </div>
          </div>

          {/* Confirmation Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="w-5 h-5 mt-0.5"
            />
            <span className="text-sm">
              Yes, this is me and I want to activate this account.
            </span>
          </label>

          <button
            type="submit"
            disabled={loading || !confirmed}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Continue'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Not you?{' '}
          <Link href="/activate" className="text-primary hover:underline">
            Start over
          </Link>
          {' '}or{' '}
          <Link href="/login" className="text-primary hover:underline">
            contact support
          </Link>
        </p>
      </div>
    </main>
  );
}
