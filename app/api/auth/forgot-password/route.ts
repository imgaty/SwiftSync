import { NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email';

// POST /api/auth/forgot-password — Send password reset email
export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user by email (case-insensitive)
    const matchedUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });

    // Always return success to prevent email enumeration
    if (!matchedUser) {
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, a reset link has been sent.',
      });
    }

    // Generate a secure random token
    const rawToken = randomBytes(32).toString('hex');
    // Store a hash of the token in the database (so the raw token in the URL can't be stolen from DB)
    const hashedToken = createHash('sha256').update(rawToken).digest('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: matchedUser.id },
      data: {
        resetToken: hashedToken,
        resetTokenExpiry: expiry,
      },
    });

    // Send the email with the raw (unhashed) token
    try {
      await sendPasswordResetEmail(email, rawToken);
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
      // Clear the token since the email didn't go out
      await prisma.user.update({
        where: { id: matchedUser.id },
        data: {
          resetToken: null,
          resetTokenExpiry: null,
        },
      });
      return NextResponse.json(
        { error: 'Unable to send reset email. Please try again later or contact support.' },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
