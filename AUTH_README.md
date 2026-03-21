# SwiftSync Authentication System

## Overview

This authentication system features:
- **Scrypt Password Hashing** for secure password storage
- **AES-256-GCM Encryption** for 2FA codes
- **Plaintext storage** for emails, names, and other personal fields
- **Cookie-based Session Management** with automatic persistence
- **Login & Register Pages** with full UI
- **Protected Routes** via middleware
- **Client-side Auth Context** for state management

## How It Works

### 1. Password Hashing & 2FA Encryption

Passwords are hashed using scrypt with versioned parameters.
2FA verification codes are encrypted with AES-256-GCM.

Emails, names, dates of birth, and recovery emails are stored as **plaintext** in the database.

### 2. Database Structure

Location: `/data/users.json`

```json
{
  "users": [
    {
      "id": "uuid-here",
      "email": "user@example.com",
      "password": "hashed-password",
      "createdAt": "2026-01-05T..."
    }
  ]
}
```

### 3. Cookie Management

**Two cookies are set on authentication:**

1. `auth-token` (HttpOnly, 30 days)
   - Contains user ID
   - HttpOnly for security
   - Used for server-side verification

2. `user-session` (30 days)
   - Contains non-sensitive user data
   - Accessible by client
   - Used for UI state

### 4. Authentication Flow

**Registration:**
1. User submits email + password
2. System hashes the password with scrypt
3. User created in database (email stored as plaintext)
4. Cookies set automatically
5. Redirected to dashboard

**Login:**
1. User submits email + password
2. System finds user by email (direct database lookup)
3. Password verified using scrypt hash comparison
4. Cookies set on success
5. Redirected to dashboard

**Auto-Login:**
- Middleware checks `auth-token` cookie
- Verifies user exists in database
- Redirects to login if invalid
- User stays logged in for 30 days

### 5. Protected Routes

The middleware automatically:
- Blocks unauthenticated users from protected pages
- Redirects authenticated users away from login/register
- Allows public access to auth pages

## API Endpoints

### POST `/api/auth/register`
Register a new user
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

### POST `/api/auth/login`
Login existing user
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

### GET `/api/auth/verify`
Check if user is authenticated
Returns: `{ authenticated: boolean, userId?: string }`

### POST `/api/auth/logout`
Logout current user (clears cookies)

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

## Security Features

✅ Scrypt password hashing
✅ AES-256-GCM encryption for 2FA codes
✅ HttpOnly cookies prevent XSS attacks
✅ Server-side session verification
✅ Automatic session expiration (30 days)
✅ Protected route middleware
✅ No passwords stored in plain text
✅ CSRF protection via SameSite cookies

## File Structure

```
/lib/
  ├── db.ts              # Database operations
  ├── encryption.ts      # Triple encryption system
  
/app/
  ├── login/page.tsx     # Login page
  ├── register/page.tsx  # Register page
  └── api/auth/
      ├── login/route.ts    # Login endpoint
      ├── register/route.ts # Register endpoint
      ├── verify/route.ts   # Verify endpoint
      └── logout/route.ts   # Logout endpoint

/components/
  └── auth-provider.tsx  # Auth context provider

/middleware.ts           # Route protection
```

## Testing

1. Start the dev server: `pnpm dev`
2. Navigate to `/register`
3. Create an account
4. Get redirected to dashboard automatically
5. Close browser and reopen - still logged in!
6. Click logout in user menu
7. Try to access dashboard - redirected to login

## Notes

- Database is automatically created on first use
- All encryption/decryption happens server-side
- Cookies persist across browser sessions
- Middleware runs on all routes except API and static files
