//
//  validation.ts
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Provides shared validation logic for Argent, centralizing domain behavior, helpers, or
//  integration code used by pages, routes, and components.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Normalize-and-validate. Returns the lowercased/trimmed email if valid,
// otherwise null. Use on the server to avoid string-shape bugs.
export function validateEmail(raw?: string | null): string | null {
  const e = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  return e && EMAIL_RE.test(e) ? e : null
}
