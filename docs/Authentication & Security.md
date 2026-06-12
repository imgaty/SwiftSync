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

The scheme replaces the earlier "adaptive" multi-generation system, which has been removed. The previous design rotated a pepper derived from the current time window, which — because the rotation function was deterministic from a public constant — provided no real security on top of scrypt + salt, and forced an unnecessary re-hash on roughly every login. The current scheme uses a fixed scrypt profile with an explicit stored scheme version.

<br>

#### Scrypt

Scrypt (RFC 7914) is a password-based key derivation function designed to be slow and memory-hard. It resists both CPU-only brute-force and ASIC acceleration, which are the two ways an attacker would scale password cracking if they ever obtained a database dump.

Argent uses the current OWASP scrypt recommendation for active `scrypt$v2$` password hashes:

| Parameter | Value     | Meaning                                       |
| :-------- | :-------- | :-------------------------------------------- |
| `N`       | `131072`  | CPU/memory cost factor (2¹⁷)                  |
| `r`       | `8`       | Block size — total memory ≈ `128 × N × r` = 128 MiB per hash |
| `p`       | `1`       | Parallelization factor                        |
| key len   | `64`      | 512-bit derived key                           |

Previous `scrypt$v1$` hashes used `N = 32768` (2¹⁵). They are not verified by the current password module. Any remaining `scrypt$v1$` database rows must be manually reset to a fresh `scrypt$v2$` hash before deploying this code:

```bash
pnpm run password:rehash-user -- <email> <newPassword>
```

This reset requires the intended replacement password; an old password hash cannot be converted into a stronger hash without knowing the plaintext password. Runtime depends on deployment hardware; OWASP recommends tuning so password hashing remains below roughly one second while still being expensive enough to slow offline attacks.

`lib/password.ts` enforces a 128-character maximum before hashing or verifying passwords. This allows long passphrases while preventing long-password denial-of-service attempts.

<br>

#### Salt

A salt is a random value generated fresh for every password. It's stored alongside the hash so verification can reproduce it, but because it's unique per password, two users with the same password get two completely different stored values — defeating rainbow-table attacks.

Argent uses 32 random bytes per salt, read from `crypto.randomBytes`.

<br>

#### Pepper

A pepper is a server-side secret that's concatenated with the password *before* hashing. Unlike the salt, the pepper is **never** stored in the database — it lives in versioned environment variables such as `PASSWORD_PEPPER_P1` and `PASSWORD_PEPPER_P2`. That means a production database-only breach (leaked backup, SQL injection that reads the `User` table) still doesn't let the attacker brute-force the hashes without also recovering the configured pepper secret.

The active pepper version is controlled by `PASSWORD_PEPPER_ACTIVE`, defaulting to `p1`. Existing hashes store their own pepper version, so pepper rotation can be staged: add the new pepper, flip the active version, then let successful logins rehash passwords with the new version. Do not remove an old pepper until every hash that used it has been reset or rehashed.

<br>

#### Storage Format

Every stored password hash follows the same format:

```
scrypt$v2$<pepperVersion>$<saltB64>$<hashB64>
```

- `scrypt$v2$` — active algorithm and work-factor scheme prefix.
- `<pepperVersion>` — pepper identifier such as `p1` or `p2`; this maps to `PASSWORD_PEPPER_P1`, `PASSWORD_PEPPER_P2`, etc.
- `<saltB64>` — 32 bytes of random salt, base64.
- `<hashB64>` — 64-byte scrypt output, base64.

Verification only accepts the active `scrypt$v2$<pepperVersion>$<saltB64>$<hashB64>` format. Older `scrypt$v1$` hashes are rejected and must be reset outside the login flow. For valid `scrypt$v2$` hashes, verification derives the candidate hash with the stored salt and pepper version, then compares using `timingSafeEqual`.

<br>

#### Summary

| Component   | What it is                                               | Where it's stored                                            |
| :---------- | :------------------------------------------------------- | :----------------------------------------------------------- |
| **Hash**    | Irreversible scrypt output (64 bytes, base64)            | Database, as the last segment of the stored string           |
| **Salt**    | Random bytes unique per password (32 bytes, base64)      | Database, as the salt segment of the stored string           |
| **Pepper**  | Server-side secret (≥ 32 characters)                     | `PASSWORD_PEPPER_P<N>` env var — never in the database       |
| **Pepper version** | Pepper identifier (`p1`, `p2`, etc.)              | Database, as the segment after the scheme prefix             |
| **Scheme version** | Algorithm and work-factor identifier (`scrypt$v2$`) | Database, as the prefix of the stored string                 |

<br>

## Secrets & Environment

The server requires these secrets in production. Missing or too-short pepper values are rejected when password hashing needs that version.

| Variable                | Purpose                                                  | Size          |
| :---------------------- | :------------------------------------------------------- | :------------ |
| `SESSION_SECRET`        | HMAC-SHA256 key for signing session tokens               | ≥ 32 chars    |
| `PASSWORD_PEPPER_ACTIVE` | Active password pepper version for new hashes           | `p<N>`        |
| `PASSWORD_PEPPER_P1`    | Server-side pepper for hashes tagged `p1`                | ≥ 32 chars    |
| `PASSWORD_PEPPER_P2`    | Server-side pepper for hashes tagged `p2`, when rotating | ≥ 32 chars    |

Generate each one with `openssl rand -hex 32`. Store them in `.env.local` for development and in your host's secret store (Vercel env vars, AWS Secrets Manager, etc.) for production.

Rotation consequences:
- Rotating `SESSION_SECRET` invalidates every outstanding session — every user is logged out.
- Rotating password peppers requires keeping old and new pepper env vars available until old hashes have been rehashed or reset. Removing an old pepper early makes hashes tagged with that version unverifiable.

<br>

## Login Flow

1. User submits email and password to `POST /api/auth/login`.
2. A per-IP rate-limit bucket is checked (5 attempts per 30 seconds). Over the limit returns **429** with a `Retry-After` header.
3. The server looks up the user by email.
   - If no account exists, `handleLogin()` still calls `verifyPassword(password, dummyHash())`, where `dummyHash()` is a cached throwaway hash generated with `hashPassword(...)`. This forces a real scrypt verification to reduce timing-based user enumeration, then returns the same generic error used for wrong passwords. This mitigation lives in the login route; `verifyPassword()` by itself returns `false` immediately when the stored hash is empty or invalid.
   - If the account exists but the password is wrong, returns the same generic error.
4. The stored hash is split via the `scrypt$v<scheme>$<pepperVersion>$<salt>$<hash>` format. The server derives the candidate hash using the stored salt, scheme parameters, and pepper, then compares byte-for-byte with `timingSafeEqual`.
5. If the stored hash uses the active scheme but an older pepper version, `passwordNeedsRehash` flags it and the password is transparently re-hashed with the active pepper version on the current login. Older `scrypt$v1$` hashes do not verify and must be manually reset before rollout.
6. On success, the `auth-token` session cookie is set and the user is redirected to the dashboard.

<br>

## Rate Limiting

All sensitive auth endpoints are throttled by a shared sliding-window limiter ([`lib/rate-limit.ts`](../lib/rate-limit.ts)):

| Endpoint                          | Limit               | Key              |
| :-------------------------------- | :------------------ | :--------------- |
| `POST /api/auth/login`            | 5 per 30 s          | client IP        |
| `POST /api/auth/forgot-password`  | 5 per 15 min        | client IP        |
| `POST /api/auth/reset-password`   | 10 per 15 min       | client IP        |

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
  - `sv` — User session version. Incrementing this in the database revokes previously issued tokens.
  - `v` — Payload version (always `1`).
- **`signature`** — The HMAC-SHA256 signature of the payload, encoded in base64url.

To verify a token, the server re-signs the payload with the same secret key and compares the result to the signature using `timingSafeEqual`. If they match, the token is authentic and has not been modified.

<br>

#### Cookies

One cookie is set after successful authentication:

| Cookie       | Specs            | Purpose                                                                                                                                                                                                                                                                                     |
| :----------- | :--------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `auth-token` | HttpOnly, 7 days | The HMAC-signed session token. Used for all server-side authentication. The `HttpOnly` flag means JavaScript running in the browser cannot read this cookie — it is only sent automatically with HTTP requests. This prevents cross-site scripting (XSS) attacks from stealing the session. |

<br>

#### How `getAuthUserId()` Works

Every API route starts by calling `getAuthUserId()`. This function is the single checkpoint for authentication:

1. Read the `auth-token` cookie from the incoming request.
2. If the cookie is missing, return `null` (unauthenticated).
3. Split the token into `version`, `payload`, and `signature`.
4. Re-sign the payload using the server's `SESSION_SECRET` and compare to the received signature using `timingSafeEqual`.
5. If the signature does not match, return `null` (token was forged or corrupted).
6. Decode the payload and check that `exp` has not passed (token not expired).
7. Look up the user in the database by `uid`, confirm their status is `"active"`, and compare the token `sv` with the user's current `sessionVersion`.
8. If the user exists, is active, and the session version matches, return their ID. Otherwise, return `null`.

If `getAuthUserId()` returns `null`, the API route responds with 401 Unauthorized.

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

For user-management actions, normal admins can soft-delete users by moving the target account to `status = "deleted"`. Existing protections still apply: an admin cannot delete themselves, and a non-superadmin admin cannot modify or delete a superadmin. Role changes are stricter and remain `superadmin` only.

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
10. The new password is hashed with scrypt using the active scheme, a fresh salt, and the active pepper version, then saved.
11. The `resetPasswordToken` and `resetPasswordExpires` fields are cleared so the token cannot be reused.

---

**Previous file:** [← Database Schema](Database%20Schema.md)

**Next file:** [Bank Synchronization](Bank%20Synchronization.md) →
