import { Request } from 'firebase-functions/v2/https';
import { DecodedIdToken } from 'firebase-admin/auth';
import { auth } from '../firebase/admin';

export interface AuthenticatedUser {
  uid: string;
  email: string | undefined;
  token: DecodedIdToken;
}

/**
 * Verify Firebase ID token from Authorization header
 */
export async function verifyFirebaseToken(req: Request): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const idToken = authHeader.split('Bearer ')[1];

  if (!idToken) {
    return null;
  }

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      token: decodedToken,
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}
