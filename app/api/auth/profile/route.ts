import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { findUserById } from '@/lib/db';
import { decrypt } from '@/lib/adaptive-encryption';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token');

    if (!authToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const user = await findUserById(authToken.value);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Decrypt user data for the response
    let decryptedName = '';
    let decryptedEmail = '';
    let decryptedDOB = '';

    try {
      decryptedEmail = decrypt(user.email);
    } catch {
      decryptedEmail = 'Unable to decrypt';
    }

    try {
      if (user.name) {
        decryptedName = decrypt(user.name);
      }
    } catch {
      decryptedName = 'Unable to decrypt';
    }

    try {
      if (user.dateOfBirth) {
        decryptedDOB = decrypt(user.dateOfBirth);
      }
    } catch {
      decryptedDOB = '';
    }

    // Generate initials for avatar
    const initials = decryptedName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';

    return NextResponse.json({
      id: user.id,
      name: decryptedName,
      email: decryptedEmail,
      dateOfBirth: decryptedDOB,
      initials,
      createdAt: user.createdAt,
      encryptionVersion: user.encryptionVersion,
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
