import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/requireUser';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  phoneNumber?: string;
  photoURL?: string;
  userType: 'staff' | 'tenant';
  status: string;
  createdAt?: string;
}

/**
 * GET /api/portal/profile
 * Get the authenticated user's profile.
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const userDoc = await adminDb.collection('users').doc(user.uid).get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { ok: false, error: 'User profile not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const profile: UserProfile = {
      id: user.uid,
      email: userData?.email || user.email || '',
      displayName: userData?.displayName,
      phoneNumber: userData?.phoneNumber,
      photoURL: userData?.photoURL,
      userType: userData?.userType || 'tenant',
      status: userData?.status || 'active',
      createdAt: userData?.createdAt?.toDate?.()?.toISOString(),
    };

    return NextResponse.json({ ok: true, data: profile });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export interface UpdateProfileInput {
  displayName?: string;
  phoneNumber?: string;
}

/**
 * PATCH /api/portal/profile
 * Update the authenticated user's profile.
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json() as UpdateProfileInput;
    const updateData: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Only allow updating specific fields
    if (body.displayName !== undefined) {
      updateData.displayName = body.displayName.trim();
    }
    if (body.phoneNumber !== undefined) {
      updateData.phoneNumber = body.phoneNumber.trim() || null;
    }

    const userRef = adminDb.collection('users').doc(user.uid);
    await userRef.update(updateData);

    // Fetch updated profile
    const updatedDoc = await userRef.get();
    const userData = updatedDoc.data();

    const profile: UserProfile = {
      id: user.uid,
      email: userData?.email || user.email || '',
      displayName: userData?.displayName,
      phoneNumber: userData?.phoneNumber,
      photoURL: userData?.photoURL,
      userType: userData?.userType || 'tenant',
      status: userData?.status || 'active',
      createdAt: userData?.createdAt?.toDate?.()?.toISOString(),
    };

    return NextResponse.json({ ok: true, data: profile });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
