import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { findUserById } from '@/lib/db';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token');

    if (!authToken) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    // Verify user exists
    const user = await findUserById(authToken.value);
    
    if (!user) {
      // Clear invalid cookie
      cookieStore.delete('auth-token');
      cookieStore.delete('user-session');
      
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { 
        authenticated: true,
        userId: user.id
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { authenticated: false },
      { status: 500 }
    );
  }
}
