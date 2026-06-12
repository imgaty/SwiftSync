//
//  route.ts
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Handles the /api/auth/[action] API endpoint for Argent, keeping request parsing,
//  business operations, and response formatting at the route boundary.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
/* Multi-action auth router.
 *
 * One catch-all handler for every session-touching auth verb: login, register,
 * logout, verify, profile, update, and delete-account. The `[action]`
 * segment dispatches to the matching `handle*` function below.
 *
 * Learn more in `docs/Authentication & Security.md`
 */

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import type { User } from '@/lib/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { verifyPassword, hashPassword, passwordNeedsRehash } from '@/lib/password';
import { createSessionToken, sessionVersionMatches, verifySessionToken } from '@/lib/session';
import { EMAIL_RE } from '@/lib/validation';
import { generateDefaultAvatarDataUrl } from '@/lib/avatar';
import { clientIp, rateLimit, rateLimitReset } from '@/lib/rate-limit';
import { sendEmailTwoFactorCode } from '@/lib/email';
import {
    cleanupPendingEmailTwoFactorSessions,
    createEmailTwoFactorExpiry,
    createEmailTwoFactorChallengePayload,
    createPendingEmailTwoFactorSession,
    EMAIL_TWO_FACTOR_CODE_TTL_MS,
    EMAIL_TWO_FACTOR_MAX_ATTEMPTS,
    hashEmailTwoFactorCode,
    isEmailTwoFactorCodeExpired,
    type PendingEmailTwoFactorStore,
    verifyEmailTwoFactorCodeHash,
    generateEmailTwoFactorCode,
} from '@/lib/email-two-factor';

export const dynamic = 'force-dynamic';

// --- Constants ---------------------------------------------------------------
const SESSION_MAX_AGE = 7 * 24 * 60 * 60;                                                                                       // Amount of time the login session cookies will persist (7 days)
const COOKIE_OPTS = {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/'
};
const LOGIN_WINDOW_MS = 30 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
// Per-account throttle. Defends against distributed/low-and-slow password spraying that
// rotates source IPs against a single account, which the per-IP limiter above cannot see.
// Keyed on the normalized email and reset on a correct password, so only failed attempts
// accumulate. The window is short enough that a victim lockout self-heals quickly.
const ACCOUNT_LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_ACCOUNT_LOGIN_ATTEMPTS = 10;
// Account creation and email-availability probes are cheap to automate; throttle by IP to
// blunt signup spam and email enumeration.
const REGISTER_WINDOW_MS = 60 * 60 * 1000;
const MAX_REGISTER_ATTEMPTS = 10;
const CHECK_EMAIL_WINDOW_MS = 15 * 60 * 1000;
const MAX_CHECK_EMAIL_ATTEMPTS = 20;
const EMAIL_TWO_FACTOR_RESEND_ATTEMPTS = 3;
const PW_MIN = 12;
const PW_MAX = 128;
const NAME_MAX_LEN = 100;

// --- In-memory stores --------------------------------------------------------
const pendingEmailTwoFactor: PendingEmailTwoFactorStore = new Map();

// --- Tiny helpers ------------------------------------------------------------
const ok = (data: object, status = 200) => NextResponse.json(data, { status });
const err = (error: string, status: number) => NextResponse.json({ error }, { status });

let _dummy: string | null = null;
const dummyHash = () => (_dummy ??= hashPassword(randomBytes(16).toString('hex')));

function ip(req: Request) {
    return clientIp(req);
}

function rateLimitError(message: string, retryAfter: number) {
    const res = err(message, 429);
    res.headers.set('Retry-After', retryAfter.toString());
    return res;
}

async function clearEmailTwoFactorCode(userId: string) {
    await prisma.user.update({
        where: { id: userId },
        data: {
            emailTwoFactorCode: null,
            emailTwoFactorCodeExpiry: null,
        },
    });
}

function validateEmail(raw?: string): string | null {
    const e = raw?.trim().toLowerCase();
    return e && EMAIL_RE.test(e) ? e : null;
}

function validatePw(pw: string): string | null {
    if (pw.length < PW_MIN) return `Password must be at least ${PW_MIN} characters`;
    if (pw.length > PW_MAX) return 'Password too long';
    
    return null;
}

function validateName(raw?: unknown): string | null {
    if (typeof raw !== 'string') return null;
    const name = raw.trim();
    if (!name || name.length > NAME_MAX_LEN) return null;
    return name;
}

// Birth dates arrive from the client as YYYY-MM-DD. Reject anything that isn't a real
// calendar date, is in the future, or is implausibly old.
const DOB_RE = /^\d{4}-\d{2}-\d{2}$/;
function validateDob(raw?: unknown): string | null {
    if (typeof raw !== 'string') return null;
    const dob = raw.trim();
    if (!DOB_RE.test(dob)) return null;
    const date = new Date(`${dob}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return null;
    // Reject components that silently normalize away (e.g. 2026-02-31 -> 2026-03-03).
    if (date.toISOString().slice(0, 10) !== dob) return null;
    if (date.getTime() > Date.now()) return null;
    if (date.getUTCFullYear() < 1900) return null;
    return dob;
}

async function getAuth<T extends Record<string, boolean>>(select?: T): Promise<User | null> {
    const cs = await cookies();
    const tok = cs.get('auth-token')?.value;

    if (!tok) return null;

    const session = await verifySessionToken(tok);
    if (!session) return null;
    
    const requestedSelect = select ?? ({} as T);
    const user = await prisma.user.findUnique({
        where: { id: session.uid },
        select: { ...requestedSelect, status: true, sessionVersion: true } as T & { status: true, sessionVersion: true },
    });
    const authUser = user as ({ status: string; sessionVersion: number } & Record<string, unknown>) | null;
    if (!authUser || authUser.status !== 'active' || !sessionVersionMatches(session, authUser.sessionVersion)) return null;

    return user as User;
}

async function setAuth(userId: string, sessionVersion?: number) {
    const cs = await cookies();
    const resolvedSessionVersion = sessionVersion ?? (await prisma.user.findUnique({
        where: { id: userId },
        select: { sessionVersion: true },
    }))?.sessionVersion ?? 0;
    const sessionToken = await createSessionToken(userId, SESSION_MAX_AGE, resolvedSessionVersion);

    cs.set('auth-token', sessionToken, { httpOnly: true, ...COOKIE_OPTS, maxAge: SESSION_MAX_AGE });
    cs.delete('user-session');
}

async function finishAuthenticatedSession(userId: string, role?: string, message = 'Login successful', request?: Request) {
    const user = await prisma.user.update({
        where: { id: userId },
        data: {
            lastLoginAt: new Date(),
            ...(request ? { lastLoginIp: ip(request) } : {}),
        },
        select: { sessionVersion: true },
    });

    await setAuth(userId, user.sessionVersion);

    return ok({
        success: true,
        message,
        userId,
        role,
    });
}

// --- Route handlers ----------------------------------------------------------
const POST_ROUTES: Record<string, (r: Request) => Promise<NextResponse>> = {
    login: handleLogin, '2fa-login': handleEmailTwoFactorLogin, '2fa-resend': handleEmailTwoFactorResend, register: handleRegister,
    'check-email': handleCheckEmail, logout: handleLogout, update: handleUpdate,
    'delete-account': handleDeleteAccount,
};

const GET_ROUTES: Record<string, () => Promise<NextResponse>> = {
    verify: handleVerify, profile: handleProfile,
};

export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
    const handler = POST_ROUTES[(await params).action];
    return handler ? handler(request) : err('Invalid action', 404);
}

export async function GET(_request: Request, { params }: { params: Promise<{ action: string }> }) {
    const handler = GET_ROUTES[(await params).action];
    return handler ? handler() : err('Invalid action', 404);
}

// --- LOGIN -------------------------------------------------------------------
async function handleLogin(request: Request) {
    try {
        const clientIp = ip(request);
        const limit = rateLimit({
            scope: 'login',
            identifier: clientIp,
            max: MAX_LOGIN_ATTEMPTS,
            windowMs: LOGIN_WINDOW_MS,
        });

        if (!limit.ok) {
            return rateLimitError(`Too many login attempts. Try again in ${limit.retryAfter} seconds.`, limit.retryAfter);
        }

        const { email: rawEmail, password } = await request.json();
        const email = validateEmail(rawEmail);

        if (!email || !password) return err('Email and password are required', 400);
        if (!EMAIL_RE.test(email)) return err('Invalid email format', 400);
        if (password.length > PW_MAX) return err('Password too long', 400);

        // Per-account throttle, keyed on the email the caller is targeting. Applied before the
        // DB lookup and identical for existing/non-existing accounts, so it leaks no enumeration
        // signal. Reset below once the password is confirmed correct.
        const accountLimit = rateLimit({
            scope: 'login-account',
            identifier: email,
            max: MAX_ACCOUNT_LOGIN_ATTEMPTS,
            windowMs: ACCOUNT_LOGIN_WINDOW_MS,
        });
        if (!accountLimit.ok) {
            return rateLimitError(`Too many login attempts for this account. Try again in ${accountLimit.retryAfter} seconds.`, accountLimit.retryAfter);
        }

        const user = await prisma.user.findFirst({
            where: { email: { equals: email, mode: 'insensitive' } },
            select: { id: true, email: true, password: true, role: true, status: true, emailTwoFactorEnabled: true },
        });

        // Single error message for both branches (no email + wrong password) to
        // prevent user enumeration. Combined with the dummyHash work below,
        // request shape is indistinguishable.
        if (!user) {
            verifyPassword(password, dummyHash());
            return err('Invalid email or password', 401);
        }

        if (!verifyPassword(password, user.password)) {
            return err('Invalid email or password', 401);
        }
        if (user.status !== 'active') {
            return err('Account is not active', 403);
        }

        // Password is correct: this account is not being brute-forced, so clear its throttle.
        rateLimitReset('login-account', email);

        const upgrade = passwordNeedsRehash(user.password) ? { password: hashPassword(password) } : {};
        if (user.emailTwoFactorEnabled) {
            const code = generateEmailTwoFactorCode();
            const expiry = createEmailTwoFactorExpiry();

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    ...upgrade,
                    emailTwoFactorCode: hashEmailTwoFactorCode(code),
                    emailTwoFactorCodeExpiry: expiry,
                },
            });

            try {
                await sendEmailTwoFactorCode(user.email, code);
            } catch (emailError) {
                await clearEmailTwoFactorCode(user.id);
                console.error('Failed to send email 2FA code:', emailError);
                return err('Failed to send verification code', 500);
            }

            const tempToken = createPendingEmailTwoFactorSession(
                pendingEmailTwoFactor,
                user.id,
                expiry.getTime(),
            );

            return ok(createEmailTwoFactorChallengePayload(tempToken));
        }

        if ('password' in upgrade) {
            await prisma.user.update({
                where: { id: user.id },
                data: upgrade
            });
        }

        rateLimitReset('login', clientIp);
        return finishAuthenticatedSession(user.id, user.role, 'Login successful', request);

    } catch (e) {
        console.error('Login error:', e); return err('Something went wrong while signing in. Please try again.', 500);
    }
}

// --- EMAIL 2FA VERIFY --------------------------------------------------------
async function handleEmailTwoFactorLogin(request: Request) {
  try {
    const clientIp = ip(request);
    const limit = rateLimit({
      scope: 'email-2fa-verify',
      identifier: clientIp,
      max: EMAIL_TWO_FACTOR_MAX_ATTEMPTS,
      windowMs: EMAIL_TWO_FACTOR_CODE_TTL_MS,
    });

    if (!limit.ok) {
      return rateLimitError(`Too many verification attempts. Try again in ${limit.retryAfter} seconds.`, limit.retryAfter);
    }

    const { tempToken, code } = await request.json();
    const submittedCode = typeof code === 'string' ? code.trim() : '';
    if (!tempToken || typeof tempToken !== 'string' || !submittedCode) {
      return err('Temporary token and verification code are required', 400);
    }

    cleanupPendingEmailTwoFactorSessions(pendingEmailTwoFactor);
    const session = pendingEmailTwoFactor.get(tempToken);
    if (!session) return err('Session expired. Please log in again.', 401);

    if (session.expiresAt <= Date.now()) {
      pendingEmailTwoFactor.delete(tempToken);
      await clearEmailTwoFactorCode(session.userId);
      return err('Code expired. Please log in again.', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        role: true,
        status: true,
        emailTwoFactorEnabled: true,
        emailTwoFactorCode: true,
        emailTwoFactorCodeExpiry: true,
      },
    });

    if (!user || !user.emailTwoFactorEnabled) {
      pendingEmailTwoFactor.delete(tempToken);
      return err('Email verification is not configured for this account. Please log in again.', 400);
    }
    if (user.status !== 'active') {
      pendingEmailTwoFactor.delete(tempToken);
      return err('Account is not active', 403);
    }
    if (!user.emailTwoFactorCode || !user.emailTwoFactorCodeExpiry) {
      pendingEmailTwoFactor.delete(tempToken);
      return err('No verification code found. Please log in again.', 400);
    }
    if (isEmailTwoFactorCodeExpired(user.emailTwoFactorCodeExpiry)) {
      pendingEmailTwoFactor.delete(tempToken);
      await clearEmailTwoFactorCode(user.id);
      return err('Code expired. Please log in again.', 401);
    }

    if (!verifyEmailTwoFactorCodeHash(submittedCode, user.emailTwoFactorCode)) {
      const attempts = session.attempts + 1;
      if (attempts >= EMAIL_TWO_FACTOR_MAX_ATTEMPTS) {
        pendingEmailTwoFactor.delete(tempToken);
        await clearEmailTwoFactorCode(user.id);
        return err('Too many attempts. Please log in again.', 429);
      }

      pendingEmailTwoFactor.set(tempToken, { ...session, attempts });
      return err('Invalid verification code', 401);
    }

    pendingEmailTwoFactor.delete(tempToken);
    rateLimitReset('login', clientIp);
    rateLimitReset('email-2fa-verify', clientIp);
    await clearEmailTwoFactorCode(user.id);
    return finishAuthenticatedSession(user.id, user.role, 'Login successful', request);
  } catch (e) {
    console.error('Email 2FA verification error:', e);
    return err('Something went wrong while verifying the code. Please try again.', 500);
  }
}

// --- EMAIL 2FA RESEND --------------------------------------------------------
async function handleEmailTwoFactorResend(request: Request) {
  try {
    const clientIp = ip(request);
    const { tempToken } = await request.json();
    const tokenKey = typeof tempToken === 'string' ? tempToken : 'missing';
    const limit = rateLimit({
      scope: 'email-2fa-resend',
      identifier: `${clientIp}:${tokenKey}`,
      max: EMAIL_TWO_FACTOR_RESEND_ATTEMPTS,
      windowMs: EMAIL_TWO_FACTOR_CODE_TTL_MS,
    });

    if (!limit.ok) {
      return rateLimitError(`Too many resend attempts. Try again in ${limit.retryAfter} seconds.`, limit.retryAfter);
    }

    if (!tempToken || typeof tempToken !== 'string') {
      return err('Temporary token is required', 400);
    }

    cleanupPendingEmailTwoFactorSessions(pendingEmailTwoFactor);
    const session = pendingEmailTwoFactor.get(tempToken);
    if (!session) return err('Session expired. Please log in again.', 401);
    if (session.expiresAt <= Date.now()) {
      pendingEmailTwoFactor.delete(tempToken);
      await clearEmailTwoFactorCode(session.userId);
      return err('Code expired. Please log in again.', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        status: true,
        emailTwoFactorEnabled: true,
      },
    });

    if (!user || !user.emailTwoFactorEnabled) {
      pendingEmailTwoFactor.delete(tempToken);
      return err('Email verification is not configured for this account. Please log in again.', 400);
    }
    if (user.status !== 'active') {
      pendingEmailTwoFactor.delete(tempToken);
      return err('Account is not active', 403);
    }

    const code = generateEmailTwoFactorCode();
    const expiry = createEmailTwoFactorExpiry();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailTwoFactorCode: hashEmailTwoFactorCode(code),
        emailTwoFactorCodeExpiry: expiry,
      },
    });

    try {
      await sendEmailTwoFactorCode(user.email, code);
    } catch (emailError) {
      await clearEmailTwoFactorCode(user.id);
      console.error('Failed to resend email 2FA code:', emailError);
      return err('Failed to send verification code', 500);
    }

    pendingEmailTwoFactor.set(tempToken, { userId: user.id, expiresAt: expiry.getTime(), attempts: 0 });
    return ok({ success: true, message: 'A new verification code has been sent to your email' });
  } catch (e) {
    console.error('Email 2FA resend error:', e);
    return err('Something went wrong while resending the code. Please try again.', 500);
  }
}

// --- CHECK EMAIL -------------------------------------------------------------
async function handleCheckEmail(request: Request) {
  try {
    const limit = rateLimit({
      scope: 'check-email',
      identifier: ip(request),
      max: MAX_CHECK_EMAIL_ATTEMPTS,
      windowMs: CHECK_EMAIL_WINDOW_MS,
    });
    if (!limit.ok) {
      return rateLimitError(`Too many requests. Try again in ${limit.retryAfter} seconds.`, limit.retryAfter);
    }

    const { email: rawEmail } = await request.json();
    const email = validateEmail(rawEmail);
    if (!email) return err('Email is required', 400);

    const exists = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true } });
    return exists ? ok({ available: false, error: 'An account with this email already exists' }, 409) : ok({ available: true });
  } catch (e) { console.error('Check email error:', e); return err('Something went wrong while checking the email. Please try again.', 500); }
}

// --- REGISTER ----------------------------------------------------------------
async function handleRegister(request: Request) {
  try {
    const limit = rateLimit({
      scope: 'register',
      identifier: ip(request),
      max: MAX_REGISTER_ATTEMPTS,
      windowMs: REGISTER_WINDOW_MS,
    });
    if (!limit.ok) {
      return rateLimitError(`Too many registration attempts. Try again in ${limit.retryAfter} seconds.`, limit.retryAfter);
    }

    const {
      name: rawName,
      email: rawEmail,
      dateOfBirth: rawDob,
      password,
      recoveryEmail: rawRecoveryEmail,
    } = await request.json();

    const email = validateEmail(rawEmail);
    const name = validateName(rawName);
    const dateOfBirth = validateDob(rawDob);

    if (!name || !email || !dateOfBirth || typeof password !== 'string' || !password) {
      return err('All fields are required', 400);
    }
    const pwErr = validatePw(password);
    if (pwErr) return err(pwErr, 400);

    // Recovery email is optional, but when supplied it must be a valid address that
    // differs from the primary email (it is an alternate password-reset destination).
    let recoveryEmail: string | undefined;
    if (rawRecoveryEmail !== undefined && rawRecoveryEmail !== null && String(rawRecoveryEmail).trim() !== '') {
      const normalizedRecovery = validateEmail(rawRecoveryEmail);
      if (!normalizedRecovery) return err('Invalid recovery email format', 400);
      if (normalizedRecovery === email) return err('Recovery email must differ from your account email', 400);
      recoveryEmail = normalizedRecovery;
    }

    let createdUserId = '';

    try {
      const user = await prisma.user.create({
        data: {
          email,
          name,
          avatar: generateDefaultAvatarDataUrl(name),
          password: hashPassword(password),
          dateOfBirth,
          ...(recoveryEmail ? { recoveryEmail } : {}),
        },
        select: { id: true, sessionVersion: true },
      });

      createdUserId = user.id;
      await setAuth(user.id, user.sessionVersion);
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') return err('User already exists', 409);
      throw e;
    }

    return ok({
      success: true,
      message: 'Registration successful',
      userId: createdUserId,
    }, 201);
  } catch (e) { console.error('Registration error:', e); return err('Something went wrong during registration. Please try again.', 500); }
}

// --- LOGOUT ------------------------------------------------------------------
async function handleLogout() {
  try {
    const cs = await cookies();
    cs.delete('auth-token');
    cs.delete('user-session');
    return ok({ success: true, message: 'Logged out successfully' });
  } catch (e) { console.error('Logout error:', e); return err('Something went wrong while logging out. Please try again.', 500); }
}

// --- VERIFY ------------------------------------------------------------------
async function handleVerify() {
  try {
    const cs = await cookies();
    const tok = cs.get('auth-token');
    if (!tok) return ok({ authenticated: false }, 401);

    const session = await verifySessionToken(tok.value);
    if (!session) { cs.delete('auth-token'); cs.delete('user-session'); return ok({ authenticated: false }, 401); }

    const user = await prisma.user.findUnique({ where: { id: session.uid }, select: { id: true, status: true, sessionVersion: true } });
    if (!user || user.status !== 'active' || !sessionVersionMatches(session, user.sessionVersion)) { cs.delete('auth-token'); cs.delete('user-session'); return ok({ authenticated: false }, 401); }

    return ok({ authenticated: true, userId: user.id });
  } catch (e) { console.error('Verification error:', e); return ok({ authenticated: false }, 500); }
}

// --- PROFILE -----------------------------------------------------------------
async function handleProfile() {
  try {
    const user = await getAuth({ id: true, name: true, email: true, avatar: true, dateOfBirth: true, recoveryEmail: true, emailTwoFactorEnabled: true, createdAt: true, role: true } as const);
    if (!user) return err('Not authenticated', 401);

    const initials = (user.name || '').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
    return NextResponse.json({
      id: user.id, name: user.name || '', email: user.email,
      avatar: user.avatar || generateDefaultAvatarDataUrl(user.name || ''),
      dateOfBirth: user.dateOfBirth || '', recoveryEmail: user.recoveryEmail || '',
      emailTwoFactorEnabled: Boolean(user.emailTwoFactorEnabled),
      initials, createdAt: user.createdAt.toISOString(), role: user.role,
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (e) { console.error('Profile fetch error:', e); return err('Could not load your profile. Please try again.', 500); }
}

// --- UPDATE PROFILE ----------------------------------------------------------
async function handleUpdate(request: Request) {
  try {
    const user = await getAuth({ id: true, email: true, password: true, emailTwoFactorEnabled: true } as const);
    if (!user) return err('Not authenticated', 401);

    const { name, email, dateOfBirth, recoveryEmail, emailTwoFactorEnabled, currentPassword, newPassword } = await request.json();
    const updates: Record<string, unknown> = {};
    let passwordChanged = false;

    if (name !== undefined) {
      const trimmedName = typeof name === 'string' ? name.trim() : '';
      if (!trimmedName || trimmedName.length > NAME_MAX_LEN) {
        return err(`Name must be between 1 and ${NAME_MAX_LEN} characters`, 400);
      }
      updates.name = trimmedName;
    }

    let emailChange: string | null = null;
    if (email !== undefined && typeof email === 'string' && email.trim()) {
      const newEmail = email.trim().toLowerCase();
      if (newEmail !== user.email) {
        if (!EMAIL_RE.test(newEmail)) return err('Invalid email format', 400);
        const taken = await prisma.user.findFirst({ where: { email: { equals: newEmail, mode: 'insensitive' }, id: { not: user.id } }, select: { id: true } });
        if (taken) return err('Email is already in use', 409);
        emailChange = newEmail;
      }
    }

    let recoveryEmailChange: string | null | undefined = undefined;
    if (recoveryEmail !== undefined) {
      const trimmedRecovery = typeof recoveryEmail === 'string' ? recoveryEmail.trim() : '';
      if (!trimmedRecovery) {
        recoveryEmailChange = null;
      } else {
        const normalizedRecovery = validateEmail(trimmedRecovery);
        if (!normalizedRecovery) return err('Invalid recovery email format', 400);
        if (normalizedRecovery === (emailChange ?? user.email)) {
          return err('Recovery email must differ from your account email', 400);
        }
        recoveryEmailChange = normalizedRecovery;
      }
    }

    if (dateOfBirth !== undefined) {
      const trimmedDob = typeof dateOfBirth === 'string' ? dateOfBirth.trim() : '';
      if (!trimmedDob) {
        updates.dateOfBirth = '';
      } else {
        const validDob = validateDob(trimmedDob);
        if (!validDob) return err('Invalid date of birth', 400);
        updates.dateOfBirth = validDob;
      }
    }

    let emailTwoFactorChange: boolean | undefined = undefined;
    if (emailTwoFactorEnabled !== undefined) {
      emailTwoFactorChange = emailTwoFactorEnabled === true;
    }

    // Sensitive identity fields (email, recoveryEmail, password) require the current
    // password as proof. Email is the password-reset destination, so a hijacked session
    // could otherwise change the email and lock the legitimate owner out.
    const sensitiveChange =
      emailChange !== null ||
      recoveryEmailChange !== undefined ||
      (emailTwoFactorChange !== undefined && emailTwoFactorChange !== user.emailTwoFactorEnabled) ||
      (currentPassword && newPassword);

    if (sensitiveChange) {
      if (!currentPassword || typeof currentPassword !== 'string') {
        return err('Current password is required to change email, recovery email, or password.', 400);
      }
      if (currentPassword.length > PW_MAX) return err('Password too long', 400);
      if (!verifyPassword(currentPassword, user.password)) return err('Current password is incorrect', 400);
    }

    if (emailChange) {
      updates.email = emailChange;
      updates.emailVerified = false;
    }
    if (recoveryEmailChange !== undefined) updates.recoveryEmail = recoveryEmailChange;
    if (emailTwoFactorChange !== undefined && emailTwoFactorChange !== user.emailTwoFactorEnabled) {
      updates.emailTwoFactorEnabled = emailTwoFactorChange;
      updates.emailTwoFactorCode = null;
      updates.emailTwoFactorCodeExpiry = null;
    }

    if (currentPassword && newPassword) {
      if (newPassword.length > PW_MAX) return err('Password too long', 400);
      const pwValidation = validatePw(newPassword);
      if (pwValidation) return err(pwValidation, 400);
      updates.password = hashPassword(newPassword);
      passwordChanged = true;
    }

    if (!Object.keys(updates).length) return err('No updates provided', 400);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...updates,
        ...(passwordChanged ? { sessionVersion: { increment: 1 } } : {}),
      },
      select: { sessionVersion: true },
    });
    if (passwordChanged) await setAuth(user.id, updated.sessionVersion);
    return ok({ success: true, message: 'Profile updated successfully' });
  } catch (e) { console.error('Update error:', e); return err('Could not update your profile. Please try again.', 500); }
}

// --- DELETE ACCOUNT ----------------------------------------------------------
async function handleDeleteAccount(request: Request) {
  try {
    const user = await getAuth({
      id: true,
      name: true,
      email: true,
      password: true,
    } as const);
    if (!user) return err('Not authenticated', 401);

    const { password } = await request.json();
    if (!password || typeof password !== 'string') return err('Password is required', 400);
    if (!verifyPassword(password, user.password)) return err('Incorrect password', 403);

    // Delete user — cascading deletes handle related records
    await prisma.user.delete({ where: { id: user.id } });

    // Clear auth cookies
    const cs = await cookies();
    cs.delete('auth-token');
    cs.delete('user-session');

    return ok({ success: true, message: 'Account deleted successfully' });
  } catch (e) { console.error('Delete account error:', e); return err('Could not delete your account. Please try again.', 500); }
}
