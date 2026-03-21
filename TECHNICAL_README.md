# SwiftSync — Technical Documentation

> This document explains how the code works in plain language. Each section covers a different part of the system.

---

## Table of Contents

- [Database & Password Security](#database--password-security)
- [Authentication System](#authentication-system)
- [API Endpoints](#api-endpoints)
- [Usage in Components](#usage-in-components)
- [Security Summary](#security-summary)
- [File Structure](#file-structure)
- [Testing](#testing)

---

## Database & Password Security

### The Problem

We store user data in a PostgreSQL database. If someone hacks the database, they can see everything: emails, names, dates of birth. That's a risk we accept because those fields need to be searchable and readable by the app.

But **passwords are different**. If an attacker reads a password, they can log into the user's account — and probably into their other accounts too, since most people reuse passwords. So we **never store the actual password**. Instead, we store a scrambled version that's impossible to unscramble.

### How Passwords Are Stored (Hashing)

Think of a meat grinder. You put a steak in, minced meat comes out. You can't put the minced meat back together into a steak. That's **hashing** — it turns `"mypassword123"` into something like `"a8f5f167f44f..."`. There's no mathematical way to reverse it.

When the user logs in:
1. They type their password
2. We run it through the same "meat grinder"
3. We compare the result to what's stored in the database
4. If they match → correct password

We never need to know what the original password was.

### What Is Salt?

If two users both have the password `"password123"`, the hash would be identical. An attacker could use a pre-built list of common password hashes (called a **rainbow table**) to crack them instantly.

**Salt** is random gibberish added to each password before hashing:

| User | Password | Salt | Hash |
|------|----------|------|------|
| User A | password123 | xK9mQ2... | 7b3c9d... |
| User B | password123 | pL3nR7... | f2a1e8... |

Same password, completely different hashes. The salt is stored alongside the hash in the database. It's **not secret** — its only job is to make every hash unique so rainbow tables are useless.

### What Is Pepper?

Similar to salt, but:
- It's the **same for everyone** (not unique per user)
- It's **secret** — baked into the server code, **never stored in the database**

Even if an attacker steals the entire database, they're missing the pepper. Without it, they can't even begin to attempt cracking the hashes.

### What Is Scrypt?

Scrypt is the hashing algorithm (the "meat grinder") we use. There are many hashing algorithms, but scrypt is special because it's **intentionally slow and memory-hungry**.

- A normal hash (like MD5): microseconds, barely any memory
- Scrypt: **milliseconds, uses ~16 MB of RAM per hash**

That's fine for one login attempt. But if an attacker tries to guess billions of passwords, each guess costs them time and memory. What would take seconds with MD5 takes **years** with scrypt.

### What Is the Generation System?

Every 6 hours, the pepper and scrypt settings change slightly. Think of it like changing the lock on your door periodically.

Old passwords still work because the **generation number is stored with the hash**, so the system knows which "lock version" to use. But next time you log in, your password gets re-hashed with the latest settings and the database is updated.

**"Is it safe to store the generation number in the database?"** — Yes. This follows [Kerckhoffs's principle](https://en.wikipedia.org/wiki/Kerckhoffs%27s_principle): a system should be secure even if everything about it is public, except the secret (the password + pepper). Knowing the algorithm version doesn't help crack it — it's like knowing a lock is "Yale brand" but still needing the key.

### What's Actually Stored in the Database

The password field contains a string in this format:

```
generation:salt:hash
```

For example: `224:xK9mQ2a8f5...:7b3c9d1e4f...`

| Part | What it is | Example |
|------|-----------|---------|
| `224` | Which generation of settings was used | Changes every 6 hours |
| `xK9mQ2a8f5...` | The random salt (base64 encoded) | Unique per password |
| `7b3c9d1e4f...` | The actual hashed password (base64 encoded) | Irreversible |

From this, **nobody can figure out the original password**. Not even the developer.

### What About 2FA Codes?

When a user has two-factor authentication enabled, we send them a 6-digit code by email. That code is also hashed (using SHA-256) before being stored in the database. When they submit the code, we hash what they typed and compare. Same principle as passwords — we never store the actual code.

2FA codes are short-lived (10 minutes) and single-use. After verification, the hash is deleted from the database.

### What About Other User Data?

| Field | How it's stored | Why |
|-------|----------------|-----|
| Email | Plaintext | Needs to be searchable for login and lookups |
| Name | Plaintext | Displayed in the UI |
| Date of Birth | Plaintext | Displayed in settings |
| Recovery Email | Plaintext | Needs to be readable to send recovery emails |
| Password | Scrypt hash | Must be irreversible |
| 2FA Code | SHA-256 hash | Must be irreversible, short-lived |

---

## Authentication System

### Cookie Management

Two cookies are set on authentication:

1. **`auth-token`** (HttpOnly, 30 days)
   - Contains the user ID
   - HttpOnly — JavaScript can't access it, preventing XSS attacks
   - Used for server-side verification

2. **`user-session`** (30 days)
   - Contains non-sensitive user data (name, preferences)
   - Accessible by client-side JavaScript
   - Used for UI state (showing the user's name, etc.)

### Authentication Flows

**Registration:**
1. User submits email + password
2. System hashes the password with scrypt
3. User created in database (email stored as plaintext)
4. Both cookies are set
5. Redirected to dashboard

**Login:**
1. User submits email + password
2. System hashes the submitted password and compares it against every stored hash in the database
3. If a match is found, it verifies the email also matches
4. If the password's generation is outdated, it's re-hashed with current settings
5. Both cookies are set
6. Redirected to dashboard

**Auto-Login:**
- Middleware checks the `auth-token` cookie on every request
- Verifies the user exists in the database
- If the cookie is invalid or expired → redirected to login
- Users stay logged in for 30 days

### Protected Routes

The middleware (`middleware.ts`) automatically:
- Blocks unauthenticated users from protected pages
- Redirects authenticated users away from login/register (no need to log in twice)
- Allows public access to auth pages

---

## API Endpoints

### `POST /api/auth/register`
Register a new user.
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

### `POST /api/auth/login`
Log in an existing user.
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

### `GET /api/auth/verify`
Check if the current user is authenticated.
Returns: `{ authenticated: boolean, userId?: string }`

### `POST /api/auth/logout`
Log out the current user (clears cookies).

---

## Usage in Components

```tsx
import { useAuth } from '@/components/auth-provider';

function MyComponent() {
  const { isAuthenticated, userId, logout } = useAuth();

  return (
    <div>
      {isAuthenticated ? (
        <button onClick={logout}>Logout</button>
      ) : (
        <Link href="/login">Login</Link>
      )}
    </div>
  );
}
```

---

## Security Summary

| Feature | Status |
|---------|--------|
| Scrypt password hashing | ✅ |
| SHA-256 hashing for 2FA codes | ✅ |
| HttpOnly cookies (prevents XSS) | ✅ |
| SameSite cookies (prevents CSRF) | ✅ |
| Server-side session verification | ✅ |
| Automatic session expiration (30 days) | ✅ |
| Protected route middleware | ✅ |
| No passwords stored in plain text | ✅ |
| Auto-upgrading password generations | ✅ |

---

## File Structure

```
lib/
  ├── adaptive-encryption.ts  # hashPassword(), verifyPassword(), generation system
  ├── db.ts                   # Database helper functions
  ├── prisma.ts               # Prisma client instance

app/
  ├── (auth)/
  │   ├── login/              # Login page
  │   ├── register/           # Register page
  │   ├── forgot-password/    # Forgot password page
  │   └── reset-password/     # Reset password page
  ├── api/auth/
  │   ├── [action]/route.ts   # Login, register, 2FA, profile, logout
  │   ├── forgot-password/    # Password reset request
  │   └── oauth/              # OAuth providers (Google, etc.)

components/
  └── auth-provider.tsx       # Client-side auth context

prisma/
  └── schema.prisma           # Database schema

middleware.ts                  # Route protection
```

---

## Testing

1. Start the dev server: `pnpm dev`
2. Navigate to `/register`
3. Create an account
4. Get redirected to the dashboard automatically
5. Close the browser and reopen — still logged in
6. Click logout in the user menu
7. Try to access the dashboard — redirected to login

---

### Quick Reference

| File | What it does |
|------|-------------|
| `lib/adaptive-encryption.ts` | Contains `hashPassword()`, `verifyPassword()`, and the generation system |
| `app/api/auth/[action]/route.ts` | Login, register, 2FA verification — calls the hashing functions |
| `prisma/schema.prisma` | Database schema — defines what fields exist |
| `lib/db.ts` | Helper functions for reading/writing users to the database |
| `components/auth-provider.tsx` | Client-side auth context provider |
| `middleware.ts` | Route protection — checks cookies on every request |
