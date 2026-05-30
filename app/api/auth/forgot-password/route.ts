//
//  route.ts
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Handles the /api/auth/forgot-password API endpoint for Argent, keeping request parsing,
//  business operations, and response formatting at the route boundary.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import { NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { EMAIL_RE } from '@/lib/validation';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';
const GENERIC_RESET_MESSAGE = 'If an account with that email exists, a reset link has been sent.';

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function buildResetUrl(rawToken: string) {
  return `${APP_URL}/reset-password?token=${rawToken}`;
}

function successResponse(extra?: Record<string, unknown>) {
  return NextResponse.json({
    success: true,
    message: GENERIC_RESET_MESSAGE,
    ...(extra && !isProduction() ? extra : {}),
  });
}

// POST /api/auth/forgot-password — Send password reset email
export async function POST(request: Request) {
  try {
    const rl = rateLimit({
      scope: 'forgot-password',
      identifier: clientIp(request),
      max: 5,
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

    const { email: rawEmail } = await request.json();
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Find user by primary or recovery email (case-insensitive)
    const matchedUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: email, mode: 'insensitive' } },
          { recoveryEmail: { equals: email, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        email: true,
        recoveryEmail: true,
      },
    });

    // Always return success to prevent email enumeration
    if (!matchedUser) {
      return successResponse({
        devNotice: 'No matching local user was found, so no reset email was sent. Register this account locally or point DATABASE_URL at the database that contains it.',
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

    const recipient = matchedUser.recoveryEmail?.trim().toLowerCase() === email
      ? matchedUser.recoveryEmail.trim()
      : matchedUser.email.trim();

    // Send the email with the raw (unhashed) token
    try {
      await sendPasswordResetEmail(recipient, rawToken);
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);

      const details = emailError instanceof Error ? emailError.message : String(emailError);
      const isResendTestMode = /testing emails to your own email address|verify a domain/i.test(details);

      // Local development fallback: when Resend is in test mode and no domain is
      // configured, return the reset URL directly so password reset still works.
      if (process.env.NODE_ENV !== 'production' && isResendTestMode) {
        return successResponse({
          message: 'Email delivery is unavailable in local test mode. Use the temporary reset link below.',
          devNotice: 'Resend sandbox delivery blocked the email. Use the temporary reset link below for local development.',
          devResetUrl: buildResetUrl(rawToken),
        });
      }

      // Clear the token since the email didn't go out
      await prisma.user.update({
        where: { id: matchedUser.id },
        data: {
          resetToken: null,
          resetTokenExpiry: null,
        },
      });

      const message = isResendTestMode
        ? 'Email service is in testing mode. Verify a domain in Resend and set RESEND_FROM_EMAIL before sending to other recipients.'
        : 'Unable to send reset email. Please try again later or contact support.';

      return NextResponse.json(
        { error: process.env.NODE_ENV === 'production' ? 'Unable to send reset email. Please try again later or contact support.' : message },
        { status: 503 }
      );
    }

    const devRecipientOverride = process.env.RESEND_DEV_TO_EMAIL?.trim();

    return successResponse({
      devNotice: devRecipientOverride
        ? `Local development: the reset email was sent to ${devRecipientOverride} because RESEND_DEV_TO_EMAIL is set. You can also use the temporary reset link below.`
        : 'Local development: use the temporary reset link below if email delivery is delayed.',
      devResetUrl: buildResetUrl(rawToken),
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
