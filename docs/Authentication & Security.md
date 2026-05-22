# **Authentication & Security**

<details>
  <summary><strong>Table of Contents</strong></summary>

- [Password Hashing](#password-hashing)
  - [Scrypt](#scrypt)
  - [Salt](#salt)
  - [Pepper](#pepper)
  - [Storage Format](#storage-format)
- [Secrets & Environment](#secrets--environment)
- [Login Flow](#login-flow)
- [Rate Limiting](#rate-limiting)
- [Sessions & Cookies](#sessions--cookies)
  - [What is HMAC](#what-is-hmac)
  - [Token Structure](#token-structure)
  - [How `getAuthUserId()` Works](#how-getauthuserid-works)
- [Two-Factor Authentication (2FA)](#two-factor-authentication-2fa)
  - [What is TOTP](#what-is-totp)
  - [Setup Flow](#setup-flow)
  - [Login with 2FA](#login-with-2fa)
  - [Trusted Devices](#trusted-devices)
  - [Backup Codes](#backup-codes)
- [OAuth](#oauth)
- [Route Protection](#route-protection)
  - [Proxy (Page Protection)](#proxy-page-protection)
  - [API Route Protection](#api-route-protection)
  - [HTTP Security Headers](#http-security-headers)
- [Password Recovery](#password-recovery)

</details>

<br>

## Password Hashing

Passwords are never stored in plaintext. Argent uses **scrypt** with a per-hash random salt and a server-side pepper, via [`lib/password.ts`](../lib/password.ts).

The scheme replaces the earlier "adaptive" multi-generation system, which has been removed. The previous design rotated a pepper derived from the current time window, which — because the rotation function was deterministic from a public constant — provided no real security on top of scrypt + salt, and forced an unnecessary re-hash on roughly every login. The new scheme is a single fixed algorithm using one industry-standard primitive.

<br>

#### Scrypt

Scrypt (RFC 7914) is a password-based key derivation function designed to be slow and memory-hard. It resists both CPU-only brute-force and ASIC acceleration, which are the two ways an attacker would scale password cracking if they ever obtained a database dump.

Argent uses the OWASP 2024 minimum parameters:

| Parameter | Value     | Meaning                                       |
| :-------- | :-------- | :-------------------------------------------- |
| `N`       | `32768`   | CPU/memory cost factor (2¹⁵)                  |
| `r`       | `8`       | Block size — total memory ≈ `128 × N × r` = 32 MB per hash |
| `p`       | `1`       | Parallelization factor                        |
| key len   | `64`      | 512-bit derived key                           |

A single hash takes roughly 50 ms on modern server hardware, which is fast enough for login but makes large-scale offline attacks infeasible.

<br>

#### Salt

A salt is a random value generated fresh for every password. It's stored alongside the hash so verification can reproduce it, but because it's unique per password, two users with the same password get two completely different stored values — defeating rainbow-table attacks.

Argent uses 32 random bytes per salt, read from `crypto.randomBytes`.

<br>

#### Pepper

A pepper is a server-side secret that's concatenated with the password *before* hashing. Unlike the salt, the pepper is **never** stored in the database — it lives in the `PASSWORD_PEPPER` environment variable. That means a database-only breach (leaked backup, SQL injection that reads the `User` table) still doesn't let the attacker brute-force the hashes: they'd also need filesystem/secrets-store access to recover the pepper.

The pepper is fixed per deployment. Rotating it without a migration makes every existing hash unverifiable, so changing it is a deliberate, planned operation, not an automatic background task.

<br>

#### Storage Format

Every stored password hash follows the same format:

```
scrypt$v1$<saltB64>$<hashB64>
```

- `scrypt$v1$` — algorithm and version prefix. New schemes get a new prefix so both can coexist during a migration.
- `<saltB64>` — 32 bytes of random salt, base64.
- `<hashB64>` — 64-byte scrypt output, base64.

Verification splits the stored string, derives the candidate hash with the same parameters, and compares using `timingSafeEqual` to prevent timing-based side-channel attacks.

<br>

#### Summary

| Component   | What it is                                               | Where it's stored                                            |
| :---------- | :------------------------------------------------------- | :----------------------------------------------------------- |
| **Hash**    | Irreversible scrypt output (64 bytes, base64)            | Database, as the last segment of the stored string           |
| **Salt**    | Random bytes unique per password (32 bytes, base64)      | Database, as the middle segment of the stored string         |
| **Pepper**  | Server-side secret (≥ 32 characters)                     | `PASSWORD_PEPPER` env var — never in the database            |
| **Version** | Algorithm identifier (`scrypt$v1$`)                      | Database, as the prefix of the stored string                 |

<br>

## Secrets & Environment

The server requires three secrets. All three are rejected at startup (thrown error) if missing in production.

| Variable                | Purpose                                                  | Size          |
| :---------------------- | :------------------------------------------------------- | :------------ |
| `SESSION_SECRET`        | HMAC-SHA256 key for signing session tokens               | ≥ 32 chars    |
| `ENCRYPTION_MASTER_KEY` | AES-256-GCM master key for [`lib/encryption-v2.ts`](../lib/encryption-v2.ts) (TOTP secrets, etc.) | ≥ 32 chars    |
| `PASSWORD_PEPPER`       | Server-side pepper for password hashing                  | ≥ 32 chars    |

Generate each one with `openssl rand -hex 32`. Store them in `.env.local` for development and in your host's secret store (Vercel env vars, AWS Secrets Manager, etc.) for production.

Rotation consequences:
- Rotating `SESSION_SECRET` invalidates every outstanding session — every user is logged out.
- Rotating `ENCRYPTION_MASTER_KEY` makes previously encrypted blobs (TOTP secrets) undecryptable — users will need to re-enroll 2FA unless you decrypt-then-re-encrypt first.
- Rotating `PASSWORD_PEPPER` makes every stored hash unverifiable — plan it as a forced password reset.

<br>

## Login Flow

1. User submits email and password to `POST /api/auth/login`.
2. A per-IP rate-limit bucket is checked (5 attempts per 30 seconds). Over the limit returns **429** with a `Retry-After` header.
3. The server looks up the user by email.
   - If no account exists, the server still performs a dummy scrypt run against a throwaway hash to keep response time constant (defeats timing-based user enumeration), then returns `{"error":"No account with that email"}`.
   - If the account exists but the password is wrong, returns `{"error":"Incorrect password"}`.
4. The stored hash is split via the `scrypt$v1$salt$hash` format. The server derives the candidate hash using the same salt, scrypt parameters, and pepper, then compares byte-for-byte with `timingSafeEqual`.
5. If the stored hash uses an older format (e.g. a leftover `generation:salt:hash` row from before the migration), `passwordNeedsRehash` flags it and the password is transparently re-hashed with the new scheme on the current login.
6. If 2FA is enabled, the server returns a challenge instead of a session. The user must verify the code before receiving cookies.
7. On success, the session cookies are set (`auth-token` and `user-session`) and the user is redirected to the dashboard.

<br>

## Rate Limiting

All sensitive auth endpoints are throttled by a shared sliding-window limiter ([`lib/rate-limit.ts`](../lib/rate-limit.ts)):

| Endpoint                          | Limit               | Key              |
| :-------------------------------- | :------------------ | :--------------- |
| `POST /api/auth/login`            | 5 per 30 s          | client IP        |
| `POST /api/auth/forgot-password`  | 5 per 15 min        | client IP        |
| `POST /api/auth/reset-password`   | 10 per 15 min       | client IP        |
| `POST /api/auth/2fa/verify`       | 10 per 10 min       | user id          |

The limiter stores counters in-process, which means on multi-instance/serverless deploys the effective limit is `max × N` (one bucket per instance). For production traffic, swap the in-memory store for Redis / Upstash — the module exposes the same `rateLimit()` / `rateLimitReset()` API regardless of backend.

<br>

## Sessions & Cookies

Sessions are not stored in the database. Instead, the server issues signed tokens that contain all the information needed to identify the user. This is called a **stateless session** — the server does not need to look up a session table on every request, it just verifies the token's signature.

<br>

#### What is HMAC

HMAC (Hash-based Message Authentication Code) is a way to prove that a piece of data has not been tampered with. It works by combining the data with a secret key and running them through a hash function (SHA-256 in this case). Only someone who knows the secret key can produce a valid signature. If even a single byte of the data is changed, the signature will not match.

Argent uses HMAC-SHA256 to sign session tokens. The secret key is the `SESSION_SECRET` environment variable. If someone tries to forge or modify a token, the signature check will fail and the request will be rejected.

<br>

#### Token Structure

The session token follows the format: `v1.payload.signature`

- **`v1`** — Version prefix. Allows future changes to the token format without breaking existing tokens.
- **`payload`** — A base64url-encoded JSON object containing:
  - `uid` — The user's database ID.
  - `iat` — "Issued at" timestamp (Unix seconds).
  - `exp` — Expiration timestamp (Unix seconds). The token is invalid after this time.
  - `v` — Payload version (always `1`).
- **`signature`** — The HMAC-SHA256 signature of the payload, encoded in base64url.

To verify a token, the server re-signs the payload with the same secret key and compares the result to the signature using `timingSafeEqual`. If they match, the token is authentic and has not been modified.

<br>

#### Cookies

Two cookies are set after successful authentication:

| Cookie         | Specs             | Purpose                                                                                                                                                                                                                                                                                     |
| :------------- | :---------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `auth-token`   | HttpOnly, 30 days | The HMAC-signed session token. Used for all server-side authentication. The `HttpOnly` flag means JavaScript running in the browser cannot read this cookie — it is only sent automatically with HTTP requests. This prevents cross-site scripting (XSS) attacks from stealing the session. |
| `user-session` | 30 days           | Non-sensitive UI context (user name, preferences). This cookie *is* readable by client-side JavaScript, so the frontend can display the user's name without making an API call. It contains no secrets.                                                                                     |

<br>

#### How `getAuthUserId()` Works

Every API route starts by calling `getAuthUserId()`. This function is the single checkpoint for authentication:

1. Read the `auth-token` cookie from the incoming request.
2. If the cookie is missing, return `null` (unauthenticated).
3. Split the token into `version`, `payload`, and `signature`.
4. Re-sign the payload using the server's `SESSION_SECRET` and compare to the received signature using `timingSafeEqual`.
5. If the signature does not match, return `null` (token was forged or corrupted).
6. Decode the payload and check that `exp` has not passed (token not expired).
7. Look up the user in the database by `uid` and confirm their status is `"active"`.
8. If the user exists and is active, return their ID. Otherwise, return `null`.

If `getAuthUserId()` returns `null`, the API route responds with 401 Unauthorized.

<br>

## Two-Factor Authentication (2FA)

Two-factor authentication adds a second layer of verification beyond the password. Even if an attacker knows the password, they cannot log in without also having access to the user's authenticator device.

<br>

#### What is TOTP

TOTP (Time-based One-Time Password) is an algorithm that generates a short numeric code (usually 6 digits) that changes every 30 seconds. It works by combining a shared secret with the current time and running them through HMAC-SHA1. Both the server and the authenticator app know the secret, so they independently produce the same code at the same time.

Argent uses TOTP via the `otpauth` library and is compatible with any authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.).

<br>

#### Setup Flow

1. The user goes to Settings and enables 2FA.
2. The server generates a random **TOTP secret** — a base32-encoded string that serves as the shared key.
3. The server returns a **QR code** containing an `otpauth://` URI. This URI encodes the secret, the app name ("Argent"), and the user's email.
4. The user scans the QR code with their authenticator app. The app stores the secret and begins generating codes.
5. The user is asked to type in the current code displayed by the app to prove it was set up correctly.
6. If the code is valid, the server stores the TOTP secret on the user record and 2FA is now active.

<br>

#### Login with 2FA

1. The user submits their email and password as normal.
2. The server verifies the password using AES (as described above).
3. If 2FA is enabled on the account, the server does **not** issue session cookies yet. Instead, it returns a response indicating a 2FA challenge is required.
4. The user is shown a 2FA input screen and enters the 6-digit code from their authenticator app.
5. The server generates the expected TOTP code for the current 30-second window (and typically one window before/after to account for clock drift).
6. The submitted code is hashed with SHA-256 and compared to the expected hash. This ensures the code is never stored in plaintext, even temporarily.
7. If the code matches, it is immediately invalidated so it cannot be reused.
8. Session cookies are issued and the user is logged in.

<br>

#### Trusted Devices

After a successful 2FA check, the user can choose to "trust this device." This saves a unique token to the `TrustedDevice` table, linked to the user, with an expiration date. The token is also stored in the browser (as a cookie or local storage).

On future logins from the same browser, the server checks if a valid trusted device token exists. If it does, the 2FA step is skipped entirely. This avoids forcing the user to enter a code every time they log in from their own computer.

Trusted device tokens expire after a set period. They can also be revoked manually by the user or by an admin resetting 2FA.

<br>

#### Backup Codes

When 2FA is enabled, the server generates a set of one-time backup codes. These are stored encrypted on the user record. If the user loses access to their authenticator app (e.g., phone lost or reset), they can use a backup code instead of a TOTP code to log in.

Each backup code can only be used once. After use, it is removed from the stored set.

<br>

## OAuth

OAuth is an open standard that allows users to sign in using an existing account from another service (Google, GitHub, etc.) without sharing their password with Argent. Instead of Argent storing a password, the third-party provider vouches for the user's identity.

OAuth accounts are stored in the `OAuthAccount` table. Each record links a `provider` (e.g., `"google"`) and a `providerAccountId` (the user's unique ID on that provider) to a Argent `userId`. A unique constraint on `[provider, providerAccountId]` prevents duplicate links.

<br>

#### OAuth Flow Step by Step

1. The user clicks "Sign in with Google" (or another provider) on the login page.
2. The browser is redirected to `GET /api/auth/oauth/[provider]`. The server constructs an authorization URL for the provider, including a `redirect_uri` (where the provider should send the user back) and the requested scopes (e.g., email and profile).
3. The browser is redirected to the provider's consent screen (e.g., Google's "Choose an account" page).
4. The user authorizes access. The provider redirects back to `GET /api/auth/oauth/[provider]/callback` with an authorization code.
5. The server exchanges the authorization code for an access token by calling the provider's token endpoint.
6. The server uses the access token to fetch the user's profile (email, name, provider ID) from the provider's API.
7. The server checks if an `OAuthAccount` record already exists for this provider + provider ID combination:
   - **If it exists** — The linked Argent user is retrieved.
   - **If it does not exist** — The server checks if a Argent user with the same email already exists. If so, the OAuth account is linked to that user. If not, a new user account is created.
8. Session cookies are set (same as a normal login) and the user is redirected to the dashboard.

> [!NOTE]
> OAuth users may not have a password set on their account (since they authenticated through the provider). They can still set one later in Settings if they want to enable password-based login as well.

<br>

## Route Protection

Route protection determines who can access which pages. It operates at three layers: **proxy** (pre-routing gate for pages), **inline guards** (for API routes), and **HTTP security headers** (browser-enforced policy).

<br>

#### Proxy (Page Protection)

Next.js 16 renamed middleware to `proxy.ts`. A proxy function runs **before** every page request reaches the actual page component. It can inspect cookies, headers, and the request URL, then decide whether to allow the request, redirect it, or block it.

[`proxy.ts`](../proxy.ts) defines two lists:
- **Public routes** — `/login`, `/register`, `/forgot-password`, `/reset-password`, `/docs`. Accessible to everyone.
- **Auth routes** — `/login`, `/register`. Pages that only make sense for unauthenticated users.

The logic (important: the proxy **verifies the HMAC signature**, not just the presence of the cookie):
1. Read the `auth-token` cookie.
2. Call `verifySessionToken(token)` — this reconstructs the HMAC signature with the server's `SESSION_SECRET` and compares with `timingSafeEqual`. A missing, malformed, expired, or forged token returns `null`.
3. If the token is valid and the requested path is an auth route (`/login` or `/register`), redirect to `/`.
4. If the path is a public prefix, allow the request through.
5. Otherwise, if the token is invalid, redirect to `/login` with `callbackUrl` set to the original path, and clear the stale `auth-token` / `user-session` cookies so the login page isn't stuck in a redirect loop.
6. Otherwise, allow the request through.

The proxy matcher skips static files (`_next/static`), images (`_next/image`), favicons, data/lang assets, and all `/api/` routes. API routes enforce auth themselves with `getAuthContext()`.

<br>

#### HTTP Security Headers

Configured in [`next.config.ts`](../next.config.ts) via the `headers()` hook, applied to every response:

| Header                       | Value / Effect                                                    |
| :--------------------------- | :---------------------------------------------------------------- |
| `Strict-Transport-Security`  | `max-age=63072000; includeSubDomains; preload` — forces HTTPS for 2 years |
| `X-Frame-Options`            | `DENY` — prevents clickjacking via iframes                        |
| `X-Content-Type-Options`     | `nosniff` — disables MIME sniffing                                |
| `Referrer-Policy`            | `strict-origin-when-cross-origin`                                 |
| `Permissions-Policy`         | Disables camera, microphone, geolocation, interest-cohort         |
| `Content-Security-Policy`    | Restricts scripts/styles/connects to `self` + explicit third parties (Salt Edge, Resend, OAuth providers) |

`poweredByHeader` is disabled so `X-Powered-By: Next.js` is not advertised.

<br>

#### API Route Protection

API routes are **not** protected by middleware. Each API route handler protects itself by calling `getAuthUserId()` (described above under Sessions) as its first action. If the function returns `null`, the route returns a 401 response immediately.

Admin routes go one step further by calling `requireAdmin()`, which first runs the same session verification, then additionally checks that the user's `role` is `"admin"` or `"superadmin"`. If the role is insufficient, the route returns 403 Forbidden.

This dual-layer design means:
- Middleware handles **page-level redirects** (pleasant UX — the user sees a login page instead of a blank error).
- API routes handle **data-level security** (prevents unauthorized data access even if middleware is bypassed).

<br>

#### Personal Data Access

Beyond user authentication, financial routes use `lib/data-access.ts` to apply a consistent `userId` scope to list, create, update, and delete operations. Admin routes remain separate and are guarded by `requireAdmin()`.

<br>

## Password Recovery

If a user forgets their password, they can request a reset via email. The flow is designed so that even if an attacker intercepts the email, the token has a limited window and the original token is never stored in the database (only its hash).

<br>

#### Why the Token is Hashed

The reset token is a random string sent to the user's email. If stored in plaintext in the database, anyone with database access (e.g., during a breach) could use the token to reset any user's password. Instead, the token is hashed before storage using SHA-256. The plaintext token is only ever known to the email recipient. When the user submits the token, it is hashed again and compared to the stored hash.

<br>

#### Full Flow

1. User navigates to the forgot password page and submits their email address.
2. `POST /api/auth/forgot-password` receives the email.
3. The server looks up the user by email. If the user does not exist, the server still returns a success response (to prevent email enumeration — an attacker should not be able to discover which emails have accounts).
4. A random reset token is generated using a cryptographically secure random number generator.
5. The token is hashed with SHA-256. The hash and an expiry timestamp (1 hour from now) are saved on the user record in the `resetPasswordToken` and `resetPasswordExpires` fields.
6. The plaintext token is embedded in a URL (e.g., `https://app.example.com/reset-password?token=abc123`) and sent to the user's email using [Resend](https://resend.com).
7. The user clicks the link and is taken to the reset password page.
8. The user enters a new password and submits the form to `POST /api/auth/reset-password` along with the token from the URL.
9. The server hashes the submitted token and compares it to the stored hash. If they match and the expiry has not passed, the token is valid.
10. The new password is hashed using AES (with the current generation's salt, pepper, and scrypt parameters) and saved.
11. The `resetPasswordToken` and `resetPasswordExpires` fields are cleared so the token cannot be reused.

---

**Previous file:** [← Database Schema](Database%20Schema.md)

**Next file:** [Bank Synchronization](Bank%20Synchronization.md) →
