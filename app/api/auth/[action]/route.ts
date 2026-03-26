import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { randomBytes, randomInt, createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { verifyPassword, hashPassword, passwordShouldUpgrade } from '@/lib/adaptive-encryption';
import { send2FACode } from '@/lib/email';
import { createSessionToken, verifySessionToken } from '@/lib/session';

// --- Constants ---------------------------------------------------------------
const TRUST_DEVICE_MAX_AGE = 30 * 24 * 60 * 60;                                                                                 // Amount of time the device will be trusted for (30 days)
const SESSION_MAX_AGE = 30 * 24 * 60 * 60;                                                                                      // Amount of time the login session cookies will persist (30 days)
const TRUST_COOKIE = 'trusted-device';                                                                                          // Name of the cookie that stores the trusted device token
const COOKIE_OPTS = {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/'
};
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const MAX_2FA_ATTEMPTS = 5;
const MAX_PENDING = 10_000;
const PW_MIN = 8;
const PW_MAX = 128;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TEN_MIN = 10 * 60 * 1000;

// --- In-memory stores --------------------------------------------------------
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const pending2FA = new Map<string, { userId: string; expiresAt: number; attempts: number }>();

// --- Tiny helpers ------------------------------------------------------------
const ok = (data: object, status = 200) => NextResponse.json(data, { status });
const err = (error: string, status: number) => NextResponse.json({ error }, { status });
const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');
const token = () => randomBytes(32).toString('hex');

let _dummy: string | null = null;
const dummyHash = () => (_dummy ??= hashPassword(randomBytes(16).toString('hex')));

function ip(req: Request) {
    return req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? req.headers.get('x-real-ip') ?? 'unknown';
}

function rateOk(key: string): number | true {
    const now = Date.now();
    const e = rateLimits.get(key);
    
    if (!e || now > e.resetAt) return true;
    
    return e.count >= MAX_LOGIN_ATTEMPTS ? Math.ceil((e.resetAt - now) / 1000) : true;
}

function rateFail(key: string) {
    const now = Date.now();
    const e = rateLimits.get(key);
    
    if (!e || now > e.resetAt) rateLimits.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    else e.count++;
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

async function getAuth<T extends Record<string, boolean>>(select?: T) {
    const cs = await cookies();
    const tok = cs.get('auth-token')?.value;

    if (!tok) return null;

    const session = await verifySessionToken(tok);
    if (!session) return null;
    
    return prisma.user.findUnique({ where: { id: session.uid }, select: select as T });
}

async function setAuth(userId: string) {
    const cs = await cookies();
    const token = await createSessionToken(userId, SESSION_MAX_AGE);

    cs.set('auth-token', token, { httpOnly: true, ...COOKIE_OPTS, maxAge: SESSION_MAX_AGE });
    cs.set('user-session', JSON.stringify({ id: userId }), { httpOnly: false, ...COOKIE_OPTS, maxAge: SESSION_MAX_AGE });
}

async function maybeUpgrade(userId: string, password: string, storedHash: string, extraData?: object) {
    if (!passwordShouldUpgrade(storedHash)) return;
    
    await prisma.user.update({ where: { id: userId }, data: { password: hashPassword(password), ...extraData } });
    
    console.log(`🧬 User ${userId} password hash auto-upgraded`);
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
            select: { id: true, email: true, password: true, twoFactorEnabled: true, role: true },
        });

        if (!user) { 
            verifyPassword(password, dummyHash());
            rateFail(clientIp);

            return err('NO_ACCOUNT', 401);
        }

        if (!verifyPassword(password, user.password)) {
            rateFail(clientIp);

            return err('WRONG_PASSWORD', 401);
        }

        rateLimits.delete(clientIp);

        const upgrade = passwordShouldUpgrade(user.password) ? { password: hashPassword(password) } : {};
        const needsUpgrade = 'password' in upgrade;

        // 2FA path
        if (user.twoFactorEnabled) {
            const cs = await cookies();
            const raw = cs.get(TRUST_COOKIE)?.value;

            if (raw) {
                const td = await prisma.trustedDevice.findUnique({ where: { token: sha256(raw) } });

                if (td && td.userId === user.id && td.expiresAt > new Date()) {
                    await Promise.all([setAuth(user.id), needsUpgrade && prisma.user.update({ where: { id: user.id }, data: upgrade })]);

                    if (needsUpgrade) console.log(`🧬 User ${user.id} password hash auto-upgraded`);

                    return ok({ success: true, message: 'Login successful (trusted device)', userId: user.id, role: user.role });
                }

                if (td) await prisma.trustedDevice.delete({ where: { id: td.id } }).catch(() => {});
                cs.delete(TRUST_COOKIE);
            }

            const code = randomInt(100000, 999999).toString();

            await prisma.user.update({
                where: { id: user.id },
                data: { ...upgrade, twoFactorCode: sha256(code), twoFactorCodeExpiry: new Date(Date.now() + TEN_MIN) },
            });

            if (needsUpgrade) console.log(`🧬 User ${user.id} password hash auto-upgraded`);

            try { await send2FACode(user.email, code); }
            catch (e) { console.error('Failed to send 2FA email:', e); return err('Failed to send verification code', 500); }

            cleanup();
            
            if (pending2FA.size >= MAX_PENDING) {
                const k = pending2FA.keys().next().value;
                if (k) pending2FA.delete(k);
            }

            const tmp = token();
            pending2FA.set(tmp, {
                userId: user.id,
                expiresAt: Date.now() + TEN_MIN,
                attempts: 0
            });

            return ok({
                success: true,
                needs_2fa: true,
                tempToken: tmp,
                message: 'A verification code has been sent to your email'
            });
        }

        // Non-2FA path
        await Promise.all([setAuth(user.id), needsUpgrade && prisma.user.update({
            where: { id: user.id },
            data: upgrade
        })]);

        if (needsUpgrade) console.log(`🧬 User ${user.id} password hash auto-upgraded`);
        
        return ok({
            success: true,
            message: 'Login successful',
            userId: user.id,
            role: user.role
        });

    } catch (e) {
        console.error('Login error:', e); return err('Something went wrong while signing in. Please try again.', 500);
    }
}

// --- 2FA VERIFY --------------------------------------------------------------
async function handle2FALogin(request: Request) {
  try {
    const { tempToken, code, trustDevice } = await request.json();
    if (!tempToken || !code) return err('Temporary token and verification code are required', 400);

    cleanup();
    const session = pending2FA.get(tempToken);
    if (!session) return err('Session expired. Please log in again.', 401);
    if (session.attempts >= MAX_2FA_ATTEMPTS) { pending2FA.delete(tempToken); return err('Too many attempts. Please log in again.', 429); }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, twoFactorCode: true, twoFactorCodeExpiry: true },
    });
    if (!user?.twoFactorCode || !user.twoFactorCodeExpiry) { pending2FA.delete(tempToken); return err('No verification code found. Please log in again.', 400); }
    if (new Date() > user.twoFactorCodeExpiry) {
      pending2FA.delete(tempToken);
      await prisma.user.update({ where: { id: user.id }, data: { twoFactorCode: null, twoFactorCodeExpiry: null } });
      return err('Code expired. Please log in again.', 401);
    }

    if (sha256(code) !== user.twoFactorCode) { session.attempts++; return err('Invalid verification code', 401); }

    pending2FA.delete(tempToken);
    const fullUser = await prisma.user.findUnique({ where: { id: session.userId }, select: { role: true } });
    await Promise.all([
      prisma.user.update({ where: { id: user.id }, data: { twoFactorCode: null, twoFactorCodeExpiry: null } }),
      setAuth(session.userId),
    ]);

    if (trustDevice) {
      const raw = token();
      const hdr = await headers();
      await Promise.all([
        prisma.trustedDevice.deleteMany({ where: { userId: session.userId, expiresAt: { lt: new Date() } } }),
        prisma.trustedDevice.create({
          data: { userId: session.userId, token: sha256(raw), label: deviceLabel(hdr.get('user-agent')), expiresAt: new Date(Date.now() + TRUST_DEVICE_MAX_AGE * 1000) },
        }),
      ]);
      const cs = await cookies();
      cs.set(TRUST_COOKIE, raw, { httpOnly: true, ...COOKIE_OPTS, maxAge: TRUST_DEVICE_MAX_AGE });
    }

    return ok({ success: true, message: 'Login successful', userId: session.userId, role: fullUser?.role });
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
    const { name, email: rawEmail, dateOfBirth, password, recoveryEmail, enable2FA } = await request.json();
    const email = validateEmail(rawEmail);
    if (!name || !email || !dateOfBirth || !password) return err('All fields are required', 400);
    const pwErr = validatePw(password);
    if (pwErr) return err(pwErr, 400);

    let newUser: { id: string };
    try {
      newUser = await prisma.user.create({
        data: { email, name, password: hashPassword(password), dateOfBirth, ...(recoveryEmail ? { recoveryEmail } : {}), ...(enable2FA ? { twoFactorEnabled: true } : {}) },
        select: { id: true },
      });
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') return err('User already exists', 409);
      throw e;
    }

    await setAuth(newUser.id);
    return ok({ success: true, message: 'Registration successful', userId: newUser.id }, 201);
  } catch (e) { console.error('Registration error:', e); return err('Something went wrong during registration. Please try again.', 500); }
}

// --- LOGOUT ------------------------------------------------------------------
async function handleLogout() {
  try {
    const cs = await cookies();
    const raw = cs.get(TRUST_COOKIE)?.value;
    if (raw) { await prisma.trustedDevice.deleteMany({ where: { token: sha256(raw) } }).catch(() => {}); cs.delete(TRUST_COOKIE); }
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

    const user = await prisma.user.findUnique({ where: { id: session.uid }, select: { id: true } });
    if (!user) { cs.delete('auth-token'); cs.delete('user-session'); return ok({ authenticated: false }, 401); }
    return ok({ authenticated: true, userId: user.id });
  } catch (e) { console.error('Verification error:', e); return ok({ authenticated: false }, 500); }
}

// --- PROFILE -----------------------------------------------------------------
async function handleProfile() {
  try {
    const user = await getAuth({ id: true, name: true, email: true, dateOfBirth: true, recoveryEmail: true, createdAt: true } as const);
    if (!user) return err('Not authenticated', 401);

    const initials = (user.name || '').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
    return ok({
      id: user.id, name: user.name || '', email: user.email,
      dateOfBirth: user.dateOfBirth || '', recoveryEmail: user.recoveryEmail || '',
      initials, createdAt: user.createdAt.toISOString(),
    });
  } catch (e) { console.error('Profile fetch error:', e); return err('Could not load your profile. Please try again.', 500); }
}

// --- UPDATE PROFILE ----------------------------------------------------------
async function handleUpdate(request: Request) {
  try {
    const user = await getAuth({ id: true, password: true } as const);
    if (!user) return err('Not authenticated', 401);

    const { name, email, dateOfBirth, recoveryEmail, currentPassword, newPassword } = await request.json();
    const updates: Record<string, string | number | null> = {};

    if (name !== undefined) updates.name = name.trim() || '';

    if (email !== undefined && email.trim()) {
      const newEmail = email.trim().toLowerCase();
      if (!EMAIL_RE.test(newEmail)) return err('Invalid email format', 400);
      const taken = await prisma.user.findFirst({ where: { email: { equals: newEmail, mode: 'insensitive' }, id: { not: user.id } }, select: { id: true } });
      if (taken) return err('Email is already in use', 409);
      updates.email = newEmail;
    }

    if (dateOfBirth !== undefined) updates.dateOfBirth = dateOfBirth.trim() || '';
    if (recoveryEmail !== undefined) updates.recoveryEmail = recoveryEmail.trim() || '';

    if (currentPassword && newPassword) {
      if (currentPassword.length > PW_MAX || newPassword.length > PW_MAX) return err('Password too long', 400);
      const pwValidation = validatePw(newPassword);
      if (pwValidation) return err(pwValidation, 400);
      if (!verifyPassword(currentPassword, user.password)) return err('Current password is incorrect', 400);
      updates.password = hashPassword(newPassword);
    }

    if (!Object.keys(updates).length) return err('No updates provided', 400);

    await prisma.user.update({ where: { id: user.id }, data: updates });
    return ok({ success: true, message: 'Profile updated successfully' });
  } catch (e) { console.error('Update error:', e); return err('Could not update your profile. Please try again.', 500); }
}

// --- DELETE ACCOUNT ----------------------------------------------------------
async function handleDeleteAccount(request: Request) {
  try {
    const user = await getAuth({ id: true, password: true } as const);
    if (!user) return err('Not authenticated', 401);

    const { password } = await request.json();
    if (!password || typeof password !== 'string') return err('Password is required', 400);
    if (!verifyPassword(password, user.password)) return err('Incorrect password', 403);

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
    const userId = session.uid;

    const { action: act, deviceId } = (await request.json().catch(() => ({}))) as { action?: string; deviceId?: string };

    if (act === 'revoke' && deviceId) {
      await prisma.trustedDevice.deleteMany({ where: { id: deviceId, userId } });
      return ok({ success: true, message: 'Device revoked' });
    }
    if (act === 'revoke-all') {
      await prisma.trustedDevice.deleteMany({ where: { userId } });
      cs.delete(TRUST_COOKIE);
      return ok({ success: true, message: 'All devices revoked' });
    }

    const curHash = cs.get(TRUST_COOKIE)?.value ? sha256(cs.get(TRUST_COOKIE)!.value) : null;
    const [devices, cur] = await Promise.all([
      prisma.trustedDevice.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, select: { id: true, label: true, createdAt: true, expiresAt: true } }),
      curHash ? prisma.trustedDevice.findUnique({ where: { token: curHash }, select: { id: true } }) : null,
    ]);

    return ok({ devices: devices.map(d => ({ ...d, isCurrent: d.id === (cur?.id ?? null) })) });
  } catch (e) { console.error('Trusted devices error:', e); return err('Could not load trusted devices. Please try again.', 500); }
}
