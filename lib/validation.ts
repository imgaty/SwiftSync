// Shared validation primitives. Single source of truth so frontend and
// backend can't drift on what counts as a valid email.

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Normalize-and-validate. Returns the lowercased/trimmed email if valid,
// otherwise null. Use on the server to avoid string-shape bugs.
export function validateEmail(raw?: string | null): string | null {
  const e = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  return e && EMAIL_RE.test(e) ? e : null
}
