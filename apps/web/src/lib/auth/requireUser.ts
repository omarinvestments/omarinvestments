import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';
import { DecodedIdToken } from 'firebase-admin/auth';

const SESSION_COOKIE_NAME = '__session';

export interface AuthenticatedUser {
  uid: string;
  email: string | undefined;
  token: DecodedIdToken;
}

/**
 * Verify the session cookie and return the authenticated user.
 * Use this in Server Components and Route Handlers.
 *
 * Returns null if not authenticated (does not throw).
 */
export async function getAuthUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return null;
  }

  try {
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      token: decodedToken,
    };
  } catch (error) {
    // Session cookie is invalid or expired
    return null;
  }
}

/**
 * Require authentication. Throws if not authenticated.
 * Use this when you want to guarantee the user is logged in.
 */
export async function requireUser(): Promise<AuthenticatedUser> {
  const user = await getAuthUser();
  if (!user) {
    throw new Error('UNAUTHENTICATED');
  }
  return user;
}
