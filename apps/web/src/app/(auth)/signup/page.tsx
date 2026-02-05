'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignUpPage() {
  const router = useRouter();

  // Redirect to activate page after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/activate');
    }, 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="w-full max-w-md text-center">
        <div className="mb-6">
          <svg
            className="w-16 h-16 mx-auto text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold mb-4">Account Activation Required</h1>

        <p className="text-muted-foreground mb-6">
          To create an account, you must first be set up by a property manager or administrator.
          If you have been set up, you can activate your account using your verification information.
        </p>

        <div className="space-y-3">
          <Link
            href="/activate"
            className="block w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity text-center"
          >
            Activate My Account
          </Link>

          <Link
            href="/login"
            className="block w-full py-2 px-4 border border-input rounded-md hover:bg-secondary transition-colors text-center"
          >
            Already have an account? Sign in
          </Link>
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          Need assistance? Contact your property manager or administrator to get set up.
        </p>
      </div>
    </main>
  );
}
