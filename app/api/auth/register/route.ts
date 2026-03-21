import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getAllUsers, createUser } from '@/lib/db';
import { 
  encrypt, 
  hashPassword, 
  decrypt,
  getCurrentSystemGeneration 
} from '@/lib/adaptive-encryption';

export async function POST(request: Request) {
  try {
    const { name, email, dateOfBirth, password } = await request.json();

    // Validate input
    if (!name || !email || !dateOfBirth || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const users = await getAllUsers();
    for (const user of users) {
      try {
        const decryptedEmail = decrypt(user.email);
        if (decryptedEmail === email) {
          return NextResponse.json(
            { error: 'User already exists' },
            { status: 409 }
          );
        }
      } catch {
        continue;
      }
    }

    // Encrypt all sensitive data with adaptive encryption (current generation)
    const encryptedEmail = encrypt(email);
    const encryptedName = encrypt(name);
    const encryptedDOB = encrypt(dateOfBirth);
    // Hash password with adaptive hashing (current generation)
    const hashedPassword = hashPassword(password);

    const currentGeneration = getCurrentSystemGeneration();
    console.log(`🧬 New user registered with encryption generation ${currentGeneration}`);

    // Create user in database
    const user = await createUser(
      encryptedEmail, 
      hashedPassword, 
      encryptedName,
      encryptedDOB,
      currentGeneration
    );

    // Set authentication cookie
    const cookieStore = await cookies();
    cookieStore.set('auth-token', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/'
    });

    // Also set user data cookie (non-sensitive)
    cookieStore.set('user-session', JSON.stringify({ 
      id: user.id,
      createdAt: user.createdAt 
    }), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/'
    });

    return NextResponse.json(
      { 
        success: true,
        message: 'Registration successful',
        userId: user.id
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
