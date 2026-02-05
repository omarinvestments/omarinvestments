'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type AccountType = 'residential' | 'commercial';

export default function ActivatePage() {
  const [accountType, setAccountType] = useState<AccountType>('residential');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [ssn4, setSsn4] = useState('');
  const [einLast4, setEinLast4] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const body = accountType === 'residential'
        ? { type: 'residential', dateOfBirth, ssn4 }
        : { type: 'commercial', dateOfBirth, einLast4, businessName };

      const res = await fetch('/api/activate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!data.ok) {
        setError(data.error || 'Verification failed. Please check your information.');
        return;
      }

      // Store verification data in sessionStorage for the next step
      sessionStorage.setItem('activationData', JSON.stringify(data.data));

      // Navigate to confirmation step
      router.push('/activate/confirm');
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-2 text-center">Activate Your Account</h1>
        <p className="text-sm text-muted-foreground mb-6 text-center">
          Enter your verification information to activate your account
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Account Type Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Account Type</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="accountType"
                  value="residential"
                  checked={accountType === 'residential'}
                  onChange={() => setAccountType('residential')}
                  className="w-4 h-4"
                />
                <span>Individual</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="accountType"
                  value="commercial"
                  checked={accountType === 'commercial'}
                  onChange={() => setAccountType('commercial')}
                  className="w-4 h-4"
                />
                <span>Business</span>
              </label>
            </div>
          </div>

          {/* Date of Birth */}
          <div>
            <label htmlFor="dateOfBirth" className="block text-sm font-medium mb-2">
              Date of Birth
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

          {accountType === 'residential' ? (
            /* SSN Last 4 for individuals */
            <div>
              <label htmlFor="ssn4" className="block text-sm font-medium mb-2">
                Last 4 Digits of SSN
              </label>
              <input
                id="ssn4"
                type="text"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                value={ssn4}
                onChange={(e) => setSsn4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                required
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="1234"
              />
            </div>
          ) : (
            /* EIN and Business Name for businesses */
            <>
              <div>
                <label htmlFor="einLast4" className="block text-sm font-medium mb-2">
                  Last 4 Digits of EIN
                </label>
                <input
                  id="einLast4"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{4}"
                  maxLength={4}
                  value={einLast4}
                  onChange={(e) => setEinLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  required
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="1234"
                />
              </div>
              <div>
                <label htmlFor="businessName" className="block text-sm font-medium mb-2">
                  Business Name
                </label>
                <input
                  id="businessName"
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Acme Corporation"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Continue'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
