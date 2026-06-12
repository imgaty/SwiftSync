//
//  email-two-factor.ts
//  Argent
//
//  Created by Codex on 07 June 2026.
//  Description: Shared helpers for email-delivered login verification codes.
//
import { createHmac, randomBytes, randomInt, timingSafeEqual } from "crypto"
import { getSessionSigningSecret } from "./secrets-check.ts"

export const EMAIL_TWO_FACTOR_CODE_TTL_MS = 5 * 60 * 1000
export const EMAIL_TWO_FACTOR_CODE_DIGITS = 6
export const EMAIL_TWO_FACTOR_MAX_ATTEMPTS = 5
export const EMAIL_TWO_FACTOR_MAX_PENDING = 1_000

export type PendingEmailTwoFactorSession = {
  userId: string
  expiresAt: number
  attempts: number
}

export type PendingEmailTwoFactorStore = Map<string, PendingEmailTwoFactorSession>

export function generateEmailTwoFactorCode() {
  return randomInt(100000, 1000000).toString()
}

export function createEmailTwoFactorExpiry(now = Date.now()) {
  return new Date(now + EMAIL_TWO_FACTOR_CODE_TTL_MS)
}

// A 6-digit code has only ~10^6 possibilities, so a plain digest in a leaked database
// would be trivially reversible with a rainbow table. Key the digest with a server-side
// secret (HMAC) so stored codes cannot be brute-forced offline without also compromising
// the signing secret. Falls back to a fixed dev key when no secret is configured so local
// runs and tests stay deterministic; production always has a real signing secret.
const EMAIL_TWO_FACTOR_HASH_KEY =
  getSessionSigningSecret() ?? "dev-email-2fa-key-not-for-production"

export function hashEmailTwoFactorCode(code: string) {
  return createHmac("sha256", EMAIL_TWO_FACTOR_HASH_KEY).update(code.trim()).digest("hex")
}

export function verifyEmailTwoFactorCodeHash(submittedCode: string, storedHash: string | null | undefined) {
  const normalizedCode = submittedCode.trim()
  if (!/^\d{6}$/.test(normalizedCode) || !storedHash) return false

  const candidateHash = hashEmailTwoFactorCode(normalizedCode)
  const candidate = Buffer.from(candidateHash, "hex")
  const stored = Buffer.from(storedHash, "hex")
  if (candidate.length !== stored.length) return false

  return timingSafeEqual(candidate, stored)
}

export function isEmailTwoFactorCodeExpired(expiry: Date | string | null | undefined, now = new Date()) {
  if (!expiry) return true
  return new Date(expiry) <= now
}

export function createEmailTwoFactorChallengePayload(tempToken: string) {
  return {
    success: true,
    needs_2fa: true,
    tempToken,
    message: "A verification code has been sent to your email",
  }
}

export function cleanupPendingEmailTwoFactorSessions(store: PendingEmailTwoFactorStore, now = Date.now()) {
  for (const [key, session] of store) {
    if (session.expiresAt <= now) store.delete(key)
  }
}

export function createPendingEmailTwoFactorSession(
  store: PendingEmailTwoFactorStore,
  userId: string,
  expiresAt: number,
  maxPending = EMAIL_TWO_FACTOR_MAX_PENDING,
) {
  cleanupPendingEmailTwoFactorSessions(store)

  if (store.size >= maxPending) {
    const oldestKey = store.keys().next().value
    if (oldestKey) store.delete(oldestKey)
  }

  const tempToken = randomBytes(32).toString("hex")
  store.set(tempToken, { userId, expiresAt, attempts: 0 })
  return tempToken
}
