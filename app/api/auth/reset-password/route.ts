//
//  route.ts
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Handles the /api/auth/reset-password API endpoint for Argent, keeping request parsing,
//  business operations, and response formatting at the route boundary.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { rateLimit, clientIp } from '@/lib/rate-limit';

// POST /api/auth/reset-password — Validate token and set new password
export async function POST(request: Request) {
  try {
    const rl = rateLimit({
      scope: 'reset-password',
      identifier: clientIp(request),
      max: 10,
      windowMs: 15 * 60 * 1000,
    });
    if (!rl.ok) {
      const res = NextResponse.json(
        { error: `Too many requests. Try again in ${rl.retryAfter} seconds.` },
        { status: 429 },
      );
      res.headers.set('Retry-After', String(rl.retryAfter));
      return res;
    }

    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 12) {
      return NextResponse.json(
        { error: 'Password must be at least 12 characters long' },
        { status: 400 }
      );
    }

    if (password.length > 128) {
      return NextResponse.json(
        { error: 'Password too long' },
        { status: 400 }
      );
    }

    // Hash the token from the URL to compare with stored hash
    const hashedToken = createHash('sha256').update(token).digest('hex');

    // Find user with this reset token that hasn't expired
    const user = await prisma.user.findFirst({
      where: {
        resetToken: hashedToken,
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Hash the new password and clear the reset token
    const hashedPassword = hashPassword(password);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
        emailTwoFactorCode: null,
        emailTwoFactorCodeExpiry: null,
        sessionVersion: { increment: 1 },
      },
    });

    const response = NextResponse.json({
      success: true,
      message: 'Password has been reset successfully.',
    });
    response.cookies.delete('auth-token');
    response.cookies.delete('user-session');
    return response;
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
