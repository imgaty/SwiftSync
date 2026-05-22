/* Revised on 03 May 2026 by hilario
 *
 * Password hashing — scrypt with per-hash salt and a versioned pepper.
 * 
 * Learn more in docs/Authentication & Security.md
 */

import "server-only"
import { randomBytes, scryptSync, timingSafeEqual } from "crypto"

const SCRYPT_N = 32768 // 2^15 — ~50 ms on modern server hardware
const SCRYPT_R = 8
const SCRYPT_P = 1
const KEY_LEN = 64
const SALT_LEN = 32
const SCRYPT_MAXMEM = 128 * SCRYPT_N * SCRYPT_R * SCRYPT_P + 1024 * 1024 // scrypt's internal buffer is ~128 * N * r * p bytes; 1 Mebibyte added to allow for overhead and other allocations.
const PREFIX = "scrypt$v1$"
const PEPPER_VERSION_REGEX = /^p?\d+$/i

function normalizeVersion(version: string): string {
  const raw = String(version || "").trim().toLowerCase()
  if (!PEPPER_VERSION_REGEX.test(raw)) {
    throw new Error(`Invalid pepper version tag: ${version}`)
  }
  return raw.startsWith("p") ? raw : `p${raw}`
}

function getPepper(version: string): string {
    const normalizedVersion = normalizeVersion(version)
    const numericVersion = normalizedVersion.slice(1)

    const primaryEnvName = `PASSWORD_PEPPER_${normalizedVersion.toUpperCase()}`
    const legacyEnvName = `PASSWORD_PEPPER_${numericVersion}`
    const value =
        process.env[primaryEnvName] ??
        process.env[legacyEnvName] ??
        (numericVersion === "1" ? process.env.PASSWORD_PEPPER : undefined)

    if (value && value.length >= 32) return value

    if (process.env.NODE_ENV === "production") {
        throw new Error(
          `${primaryEnvName} (or ${legacyEnvName}) must be set to at least 32 characters in production.`
        )
    }
    // Dev-only fallback: still deterministic across restarts so hashes remain verifiable
    // while iterating, but loud enough in logs that nobody ships this to prod.
    return `dev-pepper-not-for-production-do-not-use-${version}`
}

function getActiveVersion(): string {
  const v = process.env.PASSWORD_PEPPER_ACTIVE ?? "p1"
  try {
    return normalizeVersion(v)
  } catch {
    throw new Error(`PASSWORD_PEPPER_ACTIVE must match /^p?\\d+$/i, got: ${v}`)
  }
}

function derive(password: string, salt: Buffer, pepperVersion: string): Buffer {
  const input = `${password}:${getPepper(pepperVersion)}`
  return scryptSync(input, salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAXMEM,
  })
}

export function hashPassword(password: string): string {
  if (typeof password !== "string" || password.length === 0) {
    throw new Error("hashPassword: password must be a non-empty string")
  }
  const version = getActiveVersion()
  const salt = randomBytes(SALT_LEN)
  const hash = derive(password, salt, version)
  return `${PREFIX}${version}$${salt.toString("base64")}$${hash.toString("base64")}`
}

interface ParsedHash {
  pepperVersion: string
  salt: Buffer
  expected: Buffer
}

function parseStored(stored: string): ParsedHash | null {
  if (typeof stored !== "string" || !stored.startsWith(PREFIX)) return null
  const rest = stored.slice(PREFIX.length)
  const parts = rest.split("$")

  let pepperVersion: string
  let saltB64: string
  let hashB64: string

  if (parts.length === 3 && PEPPER_VERSION_REGEX.test(parts[0])) {
    // Versioned format: scrypt$v1$<version>$<salt>$<hash>
    pepperVersion = normalizeVersion(parts[0])
    ;[saltB64, hashB64] = [parts[1], parts[2]]
  } else if (parts.length === 2) {
    // Legacy format: scrypt$v1$<salt>$<hash> — assume p1.
    pepperVersion = "p1"
    ;[saltB64, hashB64] = parts
  } else {
    return null
  }

  try {
    const salt = Buffer.from(saltB64, "base64")
    const expected = Buffer.from(hashB64, "base64")
    if (salt.length !== SALT_LEN || expected.length !== KEY_LEN) return null
    return { pepperVersion, salt, expected }
  } catch {
    return null
  }
}

export function verifyPassword(password: string, stored: string): boolean {
  const parsed = parseStored(stored)
  if (!parsed) return false
  try {
    const computed = derive(password, parsed.salt, parsed.pepperVersion)
    return timingSafeEqual(computed, parsed.expected)
  } catch {
    return false
  }
}

/**
 * True if the stored hash should be re-written with the current scheme.
 * Returns true when:
 *   - the hash is in a pre-versioned legacy format, or
 *   - the hash uses a pepper version other than the active one (rotation in progress).
 *
 * Callers should re-hash and persist after a successful verifyPassword().
 */
export function passwordNeedsRehash(stored: string): boolean {
  const parsed = parseStored(stored)
  if (!parsed) return true
  return parsed.pepperVersion !== getActiveVersion()
}
