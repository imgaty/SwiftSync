/**
 * Simple in-memory sliding-window rate limiter.
 *
 * NOTE: per-process only — on multi-instance deploys (Vercel, horizontal scaling),
 * an attacker gets `maxAttempts × N` real attempts. Swap for Redis / Upstash
 * before going to production traffic.
 */

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()
const MAX_BUCKETS = 50_000

function prune(now: number) {
  if (buckets.size < MAX_BUCKETS) return
  for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k)
}

export interface RateLimitOptions {
  /** Unique key for this limiter (e.g. "login", "forgot-password"). */
  scope: string
  /** Identifier within the scope (usually the client IP). */
  identifier: string
  /** Max attempts allowed in the window. */
  max: number
  /** Window length in milliseconds. */
  windowMs: number
}

export interface RateLimitResult {
  ok: boolean
  /** Seconds until the caller may retry (only meaningful when ok is false). */
  retryAfter: number
  remaining: number
}

/**
 * Check-and-consume one attempt. Returns `ok: false` with `retryAfter` seconds
 * if the caller has exceeded the limit.
 */
export function rateLimit(opts: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  prune(now)

  const key = `${opts.scope}:${opts.identifier}`
  const b = buckets.get(key)

  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs })
    return { ok: true, retryAfter: 0, remaining: opts.max - 1 }
  }

  if (b.count >= opts.max) {
    return {
      ok: false,
      retryAfter: Math.max(1, Math.ceil((b.resetAt - now) / 1000)),
      remaining: 0,
    }
  }

  b.count++
  return { ok: true, retryAfter: 0, remaining: opts.max - b.count }
}

/** Reset a bucket (e.g. on successful login). */
export function rateLimitReset(scope: string, identifier: string) {
  buckets.delete(`${scope}:${identifier}`)
}

/** Best-effort client-IP extraction. Trust only when behind a known proxy. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim()
  return req.headers.get("x-real-ip") ?? "unknown"
}
