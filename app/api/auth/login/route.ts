import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getAllUsers, updateUser } from '@/lib/db';
import { 
  decrypt, 
  verifyPassword, 
  shouldUpgrade, 
  passwordShouldUpgrade, 
  getCurrentSystemGeneration,
  encrypt,
  hashPassword
} from '@/lib/adaptive-encryption';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Get all users and decrypt to find matching email
    const users = await getAllUsers();
    let matchedUser = null;
    let userNeedsUpgrade = false;

    for (const user of users) {
      try {
        const decryptedEmail = decrypt(user.email);
        
        if (decryptedEmail === email) {
          matchedUser = user;
          userNeedsUpgrade = shouldUpgrade(user.email) || passwordShouldUpgrade(user.password);
          break;
        }
      } catch {
        // Skip invalid encrypted data
        continue;
      }
    }

    if (!matchedUser) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = verifyPassword(password, matchedUser.password);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // AUTO-EVOLUTION: Upgrade encryption if using old generation
    if (userNeedsUpgrade) {
      const updates = {
        email: encrypt(email),
        password: hashPassword(password),
        encryptionVersion: getCurrentSystemGeneration(),
      };
      
      await updateUser(matchedUser.id, updates);
      console.log(`🧬 User ${matchedUser.id} encryption evolved to generation ${updates.encryptionVersion}`);
    }

    // Set authentication cookie
    const cookieStore = await cookies();
    cookieStore.set('auth-token', matchedUser.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/'
    });

    // Also set user session cookie (non-sensitive)
    cookieStore.set('user-session', JSON.stringify({ 
      id: matchedUser.id,
      createdAt: matchedUser.createdAt 
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
        message: 'Login successful',
        userId: matchedUser.id
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
