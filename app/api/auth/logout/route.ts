import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const cookieStore = await cookies();
    
    // Clear authentication cookies
    cookieStore.delete('auth-token');
    cookieStore.delete('user-session');

    return NextResponse.json(
      { 
        success: true,
        message: 'Logged out successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
