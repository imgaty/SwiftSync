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
 * logout, verify, profile, update, delete-account, 2FA login, trusted-device
 * management. The `[action]` segment dispatches to the matching `handle*`
 * function below.
 *
 * Learn more in `docs/Authentication & Security.md`
 */

import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { randomBytes, createHash, createHmac } from 'crypto';
import type { User } from '@/lib/generated/prisma/client';
import * as OTPAuth from 'otpauth';
import { prisma } from '@/lib/prisma';
import { verifyPassword, hashPassword, passwordNeedsRehash } from '@/lib/password';
import { decrypt, encrypt } from '@/lib/encryption-v2';
import { createSessionToken, sessionVersionMatches, verifySessionToken } from '@/lib/session';
import { EMAIL_RE } from '@/lib/validation';
import { generateDefaultAvatarDataUrl } from '@/lib/avatar';
import { clientIp } from '@/lib/rate-limit';
import { consumeEncryptedBackupCode } from '@/lib/auth-2fa';
import {
    replacePendingTwoFactorSession,
    type PendingTwoFactorSession,
} from '@/lib/auth-2fa';

export const dynamic = 'force-dynamic';

// --- Constants ---------------------------------------------------------------
const TRUST_DEVICE_MAX_AGE = 30 * 24 * 60 * 60;                                                                                 // Amount of time the device will be trusted for (30 days)
const SESSION_MAX_AGE = 7 * 24 * 60 * 60;                                                                                       // Amount of time the login session cookies will persist (7 days)
const TRUST_COOKIE = 'trusted-device';                                                                                          // Name of the cookie that stores the trusted device token
const COOKIE_OPTS = {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/'
};
const LOGIN_WINDOW_MS = 30 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const MAX_2FA_ATTEMPTS = 5;
const MAX_PENDING = 10_000;
const PW_MIN = 8;
const PW_MAX = 128;
const TEN_MIN = 10 * 60 * 1000;

// --- In-memory stores --------------------------------------------------------
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const pending2FA = new Map<string, PendingTwoFactorSession>();

// --- Tiny helpers ------------------------------------------------------------
const ok = (data: object, status = 200) => NextResponse.json(data, { status });
const err = (error: string, status: number) => NextResponse.json({ error }, { status });
const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');
// HMAC-based hash for device tokens: mixes SESSION_PEPPER so a DB leak alone
// doesn't let an attacker confirm guessed raw tokens offline.
const _rawPepper = process.env.SESSION_PEPPER || process.env.ENCRYPTION_MASTER_KEY;
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production' && (!_rawPepper || _rawPepper.length < 32)) {
    throw new Error(
        'SESSION_PEPPER env var is required in production and must be at least 32 chars. ' +
        'Generate one with: openssl rand -hex 32'
    );
}
const SESSION_PEPPER = _rawPepper || '';
const deviceTokenHash = (v: string) =>
    SESSION_PEPPER
        ? createHmac('sha256', SESSION_PEPPER).update(v).digest('hex')
        : sha256(v);
// Produce a short opaque identifier for log correlation that doesn't leak
// the raw user ID to downstream log sinks.
const logId = (userId: string) =>
    (SESSION_PEPPER
        ? createHmac('sha256', SESSION_PEPPER).update(userId).digest('hex')
        : sha256(userId)
    ).slice(0, 12);
const token = () => randomBytes(32).toString('hex');

function validateTotpCode(user: { name: string; email: string; twoFactorSecret: string | null }, code: string) {
    if (!user.twoFactorSecret) return false;
    const secret = decrypt(user.twoFactorSecret);
    const totp = new OTPAuth.TOTP({
        issuer: 'Argent',
        label: user.name || user.email,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret),
    });
    return totp.validate({ token: code.trim(), window: 1 }) !== null;
}

let _dummy: string | null = null;
const dummyHash = () => (_dummy ??= hashPassword(randomBytes(16).toString('hex')));

function ip(req: Request) {
    return clientIp(req);
}

function rateOk(key: string, maxAttempts = MAX_LOGIN_ATTEMPTS): number | true {
    const now = Date.now();
    const e = rateLimits.get(key);
    
    if (!e || now > e.resetAt) return true;
    
    return e.count >= maxAttempts ? Math.ceil((e.resetAt - now) / 1000) : true;
}

function rateFail(key: string, windowMs = LOGIN_WINDOW_MS) {
    const now = Date.now();
    const e = rateLimits.get(key);
    
    if (!e || now > e.resetAt) rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    else e.count++;
}

function twoFactorRateKey(userId: string, clientIp: string) {
    return `2fa:${userId}:${clientIp}`;
}

function cleanup() {
    const now = Date.now();

    for (const [k, v] of pending2FA) if (v.expiresAt < now) pending2FA.delete(k);
    for (const [k, v] of rateLimits) if (now > v.resetAt) rateLimits.delete(k);
}

function deviceLabel(ua: string | null) {
    if (!ua) return 'Unknown device';

    const map: [RegExp, string][] = [[/iPhone|iPad/, 'iPhone / iPad'], [/Android/, 'Android'], [/Macintosh|Mac OS/, 'Mac'], [/Windows/, 'Windows PC'], [/Linux/, 'Linux']];
    return map.find(([re]) => re.test(ua))?.[1] ?? 'Unknown device';
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

async function consumeBackupCodeForUser(userId: string, submittedCode: string) {
    return prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;

        const user = await tx.user.findUnique({
            where: { id: userId },
            select: { twoFactorBackupCodes: true },
        });
        const backupCodesAfterUse = consumeEncryptedBackupCode(
            user?.twoFactorBackupCodes ?? null,
            submittedCode,
            decrypt,
        );

        if (!backupCodesAfterUse) return false;

        await tx.user.update({
            where: { id: userId },
            data: { twoFactorBackupCodes: encrypt(JSON.stringify(backupCodesAfterUse)) },
        });

        return true;
    });
}

// --- Route handlers ----------------------------------------------------------
const POST_ROUTES: Record<string, (r: Request) => Promise<NextResponse>> = {
    login: handleLogin, '2fa-login': handle2FALogin, register: handleRegister,
    'check-email': handleCheckEmail, logout: handleLogout, update: handleUpdate,
    'trusted-devices': handleTrustedDevices, 'delete-account': handleDeleteAccount,
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
        const limit = rateOk(clientIp);

        if (limit !== true) {
            const res = err(`Too many login attempts. Try again in ${limit} seconds.`, 429);
            res.headers.set('Retry-After', limit.toString());

            return res;
        }

        const { email: rawEmail, password } = await request.json();
        const email = validateEmail(rawEmail);

        if (!email || !password) return err('Email and password are required', 400);
        if (!EMAIL_RE.test(email)) return err('Invalid email format', 400);
        if (password.length > PW_MAX) return err('Password too long', 400);

        const user = await prisma.user.findFirst({
            where: { email: { equals: email, mode: 'insensitive' } },
            select: { id: true, email: true, password: true, twoFactorEnabled: true, twoFactorSecret: true, role: true, status: true },
        });

        // Single error message for both branches (no email + wrong password) to
        // prevent user enumeration. Combined with the dummyHash work below,
        // request shape is indistinguishable.
        if (!user) {
            verifyPassword(password, dummyHash());
            rateFail(clientIp);
            return err('Invalid email or password', 401);
        }

        if (!verifyPassword(password, user.password)) {
            rateFail(clientIp);
            return err('Invalid email or password', 401);
        }
        if (user.status !== 'active') {
            return err('Account is not active', 403);
        }

        rateLimits.delete(clientIp);

        const upgrade = passwordNeedsRehash(user.password) ? { password: hashPassword(password) } : {};
        const needsUpgrade = 'password' in upgrade;

        // 2FA path
        if (user.twoFactorEnabled) {
            if (!user.twoFactorSecret) {
                return err('2FA is enabled but not fully configured. Please reset 2FA from settings or contact support.', 400);
            }

            const cs = await cookies();
            const raw = cs.get(TRUST_COOKIE)?.value;

            if (raw) {
                const td = await prisma.trustedDevice.findUnique({ where: { token: deviceTokenHash(raw) } });

                if (td && td.userId === user.id && td.expiresAt > new Date()) {
                    if (needsUpgrade) {
                        await prisma.user.update({ where: { id: user.id }, data: upgrade });
                        console.log(`🧬 User ${logId(user.id)} password hash auto-upgraded`);
                    }

                    return finishAuthenticatedSession(user.id, user.role, 'Login successful (trusted device)', request);
                }

                if (td) await prisma.trustedDevice.delete({ where: { id: td.id } }).catch((e) => { console.error('Trusted device delete (mismatch) failed:', e); });
                cs.delete(TRUST_COOKIE);
            }

            if (needsUpgrade) {
                await prisma.user.update({ where: { id: user.id }, data: upgrade });
                console.log(`🧬 User ${logId(user.id)} password hash auto-upgraded`);
            }

            cleanup();

            const twoFactorLimit = rateOk(twoFactorRateKey(user.id, clientIp), MAX_2FA_ATTEMPTS);
            if (twoFactorLimit !== true) {
                const res = err(`Too many verification attempts. Try again in ${twoFactorLimit} seconds.`, 429);
                res.headers.set('Retry-After', twoFactorLimit.toString());

                return res;
            }

            const tmp = token();
            replacePendingTwoFactorSession(pending2FA, tmp, {
                userId: user.id,
                expiresAt: Date.now() + TEN_MIN,
                attempts: 0,
                maxPending: MAX_PENDING,
            });

            return ok({
                success: true,
                needs_2fa: true,
                tempToken: tmp,
                message: 'Enter the 6-digit code from your authenticator app or a backup code'
            });
        }

        // Non-2FA path
        if (needsUpgrade) {
            await prisma.user.update({
                where: { id: user.id },
                data: upgrade
            });
            console.log(`🧬 User ${logId(user.id)} password hash auto-upgraded`);
        }
        
        return finishAuthenticatedSession(user.id, user.role, 'Login successful', request);

    } catch (e) {
        console.error('Login error:', e); return err('Something went wrong while signing in. Please try again.', 500);
    }
}

// --- 2FA VERIFY --------------------------------------------------------------
async function handle2FALogin(request: Request) {
  try {
    const { tempToken, code, trustDevice } = await request.json();
    const submittedCode = String(code || '').trim();
    if (!tempToken || !submittedCode) return err('Temporary token and verification code are required', 400);

    cleanup();
    const session = pending2FA.get(tempToken);
    if (!session) return err('Session expired. Please log in again.', 401);
    if (session.attempts >= MAX_2FA_ATTEMPTS) { pending2FA.delete(tempToken); return err('Too many attempts. Please log in again.', 429); }
    pending2FA.delete(tempToken);

    const clientIp = ip(request);
    const twoFactorKey = twoFactorRateKey(session.userId, clientIp);
    const limit = rateOk(twoFactorKey, MAX_2FA_ATTEMPTS);
    if (limit !== true) {
      return err(`Too many verification attempts. Try again in ${limit} seconds.`, 429);
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        twoFactorSecret: true,
      },
    });
    if (!user?.twoFactorSecret) {
      return err('2FA is not configured for this account. Please log in again.', 400);
    }
    if (user.status !== 'active') {
      return err('Account is not active', 403);
    }

    const isTotpValid = /^\d{6}$/.test(submittedCode) && validateTotpCode(user, submittedCode);
    const isBackupCodeValid = isTotpValid ? false : await consumeBackupCodeForUser(user.id, submittedCode);

    if (!isTotpValid && !isBackupCodeValid) {
      const nextAttempts = session.attempts + 1;
      rateFail(twoFactorKey, TEN_MIN);
      const limited = rateOk(twoFactorKey, MAX_2FA_ATTEMPTS);
      if (nextAttempts >= MAX_2FA_ATTEMPTS || limited !== true) {
        return err('Too many attempts. Please log in again.', 429);
      }
      pending2FA.set(tempToken, { ...session, attempts: nextAttempts });
      return err('Invalid verification code', 401);
    }

    rateLimits.delete(twoFactorKey);

    if (trustDevice) {
      const raw = token();
      const hdr = await headers();
      await Promise.all([
        prisma.trustedDevice.deleteMany({ where: { userId: session.userId, expiresAt: { lt: new Date() } } }),
        prisma.trustedDevice.create({
          data: { userId: session.userId, token: deviceTokenHash(raw), label: deviceLabel(hdr.get('user-agent')), expiresAt: new Date(Date.now() + TRUST_DEVICE_MAX_AGE * 1000) },
        }),
      ]);
      const cs = await cookies();
      cs.set(TRUST_COOKIE, raw, { httpOnly: true, ...COOKIE_OPTS, maxAge: TRUST_DEVICE_MAX_AGE });
    }

    return finishAuthenticatedSession(session.userId, user.role, 'Login successful', request);
  } catch (e) { console.error('2FA login error:', e); return err('Something went wrong while verifying your code. Please try again.', 500); }
}

// --- CHECK EMAIL -------------------------------------------------------------
async function handleCheckEmail(request: Request) {
  try {
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
    const {
      name,
      email: rawEmail,
      dateOfBirth,
      password,
      recoveryEmail,
    } = await request.json();

    const email = validateEmail(rawEmail);
    if (!name || !email || !dateOfBirth || !password) return err('All fields are required', 400);
    const pwErr = validatePw(password);
    if (pwErr) return err(pwErr, 400);

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
    const raw = cs.get(TRUST_COOKIE)?.value;
    if (raw) { await prisma.trustedDevice.deleteMany({ where: { token: deviceTokenHash(raw) } }).catch((e) => { console.error('Trusted device cleanup failed on logout:', e); }); cs.delete(TRUST_COOKIE); }
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
    const user = await getAuth({ id: true, name: true, email: true, avatar: true, dateOfBirth: true, recoveryEmail: true, createdAt: true, role: true } as const);
    if (!user) return err('Not authenticated', 401);

    const initials = (user.name || '').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
    return NextResponse.json({
      id: user.id, name: user.name || '', email: user.email,
      avatar: user.avatar || generateDefaultAvatarDataUrl(user.name || ''),
      dateOfBirth: user.dateOfBirth || '', recoveryEmail: user.recoveryEmail || '',
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
    const user = await getAuth({ id: true, email: true, password: true } as const);
    if (!user) return err('Not authenticated', 401);

    const { name, email, dateOfBirth, recoveryEmail, currentPassword, newPassword } = await request.json();
    const updates: Record<string, unknown> = {};
    let passwordChanged = false;

    if (name !== undefined) updates.name = name.trim() || '';

    let emailChange: string | null = null;
    if (email !== undefined && email.trim()) {
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
      recoveryEmailChange = recoveryEmail.trim() || null;
    }

    if (dateOfBirth !== undefined) updates.dateOfBirth = dateOfBirth.trim() || '';

    // Sensitive identity fields (email, recoveryEmail, password) require the current
    // password as proof. Email is the password-reset destination, so a hijacked session
    // could otherwise change the email and lock the legitimate owner out.
    const sensitiveChange =
      emailChange !== null || recoveryEmailChange !== undefined || (currentPassword && newPassword);

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
      twoFactorEnabled: true,
      twoFactorSecret: true,
    } as const);
    if (!user) return err('Not authenticated', 401);

    const { password, code } = await request.json();
    if (!password || typeof password !== 'string') return err('Password is required', 400);
    if (!verifyPassword(password, user.password)) return err('Incorrect password', 403);

    // If 2FA is enabled, also require a valid TOTP code so a stolen password
    // alone cannot destroy the account.
    if (user.twoFactorEnabled) {
      if (!code || typeof code !== 'string') {
        return err('A 2FA code is required to delete this account.', 400);
      }
      if (!user.twoFactorSecret) {
        return err('2FA is enabled but not fully configured.', 400);
      }
      const secret = decrypt(user.twoFactorSecret);
      const totp = new OTPAuth.TOTP({
        issuer: 'Argent',
        label: user.name || user.email,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret),
      });
      if (totp.validate({ token: code, window: 1 }) === null) {
        return err('Invalid 2FA code', 403);
      }
    }

    // Delete user — cascading deletes handle related records
    await prisma.user.delete({ where: { id: user.id } });

    // Clear auth cookies
    const cs = await cookies();
    const raw = cs.get(TRUST_COOKIE)?.value;
    if (raw) cs.delete(TRUST_COOKIE);
    cs.delete('auth-token');
    cs.delete('user-session');

    return ok({ success: true, message: 'Account deleted successfully' });
  } catch (e) { console.error('Delete account error:', e); return err('Could not delete your account. Please try again.', 500); }
}

// --- TRUSTED DEVICES ---------------------------------------------------------
async function handleTrustedDevices(request: Request) {
  try {
    const cs = await cookies();
    const tok = cs.get('auth-token')?.value;
    if (!tok) return err('Not authenticated', 401);

    const session = await verifySessionToken(tok);
    if (!session) return err('Not authenticated', 401);
    const user = await prisma.user.findUnique({
      where: { id: session.uid },
      select: { id: true, status: true, sessionVersion: true },
    });
    if (!user || user.status !== 'active' || !sessionVersionMatches(session, user.sessionVersion)) {
      return err('Not authenticated', 401);
    }
    const userId = user.id;

    const { action: act, deviceId } = (await request.json().catch(() => ({}))) as { action?: string; deviceId?: string };

    if (act === 'revoke' && deviceId) {
      await prisma.trustedDevice.deleteMany({ where: { id: deviceId, userId } });
      return ok({ success: true, message: 'Device revoked' });
    }
    if (act === 'revoke-all') {
      await Promise.all([
        prisma.trustedDevice.deleteMany({ where: { userId } }),
        prisma.user.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } }),
      ]);
      cs.delete(TRUST_COOKIE);
      cs.delete('auth-token');
      cs.delete('user-session');
      return ok({ success: true, message: 'All devices and sessions revoked' });
    }

    const curHash = cs.get(TRUST_COOKIE)?.value ? deviceTokenHash(cs.get(TRUST_COOKIE)!.value) : null;
    const [devices, cur] = await Promise.all([
      prisma.trustedDevice.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, select: { id: true, label: true, createdAt: true, expiresAt: true } }),
      curHash ? prisma.trustedDevice.findUnique({ where: { token: curHash }, select: { id: true } }) : null,
    ]);

    return ok({ devices: devices.map(d => ({ ...d, isCurrent: d.id === (cur?.id ?? null) })) });
  } catch (e) { console.error('Trusted devices error:', e); return err('Could not load trusted devices. Please try again.', 500); }
}
