//
//  password.ts
//
//  Created by Hilário on 12 May 2026 at 07:29.
//  Last changed by Hilário on 03 Jun 2026 at 21:03.
//
//  Provides shared password logic for Argent, such as hashing and verification.
//

import "server-only"                                                                            // Ensures this module is never bundled into the client
import { randomBytes, scryptSync, timingSafeEqual } from "crypto"

const SCRYPT_N = 32768 // 2^15 (~50 ms)                                                         // scrypt cost parameters. Values deliberately memory-expensive as to slow offline brute-force attempts.
const SCRYPT_R = 8
const SCRYPT_P = 1
const SCRYPT_MAXMEMORY = 128 * SCRYPT_N * SCRYPT_R * SCRYPT_P + 1024 * 1024                     // Max memory for scrypt. Add 1 MiB as overhead.

const KEY_LEN = 64
const SALT_LEN = 32
const PREFIX = "scrypt$v1$"                                                                     // Stored hash prefix: algorithm + format version.
const PEPPER_MIN_LEN = 32
const PEPPER_VERSION_REGEX = /^p\d+$/i


// Canonicalizes pepper version tags. Accepts "p1" or "P1"; returns "p1".
function normalizePepperVersion(version: string): string {
    const raw = version.trim().toLowerCase()

    if (!PEPPER_VERSION_REGEX.test(raw)) {
        throw new Error(`Invalid pepper version tag: ${version}`)
    }
    return raw
}


function getPepper(version: string): string {
    const pepperVersion = normalizePepperVersion(version)
    // Pepper versions map directly to env vars: p1 -> PASSWORD_PEPPER_P1.
    const envName = `PASSWORD_PEPPER_${pepperVersion.toUpperCase()}`
    const value = process.env[envName]

    if (value !== undefined) {
        if (value.length < PEPPER_MIN_LEN) {
            throw new Error(`${envName} must be set to at least ${PEPPER_MIN_LEN} characters.`)
        }
        return value
    }

    // Production must never fall back to a predictable development pepper.
    if (process.env.NODE_ENV === "production") {
        throw new Error(
          `${envName} must be set to at least ${PEPPER_MIN_LEN} characters in production.`
        )
    }

    // Development-only fallback. It keeps local hashes verifiable when no
    // pepper env var is configured; production must use explicit secrets.
    return `dev-pepper-use-only-${pepperVersion}`
}


function getActiveVersion(): string {
    // Controls which pepper version is used for newly generated hashes.
    // Existing hashes keep their own version in the stored hash string.
    const v = process.env.PASSWORD_PEPPER_ACTIVE ?? "p1"
    try {
        return normalizePepperVersion(v)
    } catch {
        throw new Error(`PASSWORD_PEPPER_ACTIVE must match /^p\\d+$/i, got: ${v}`)
    }
}

function derive(password: string, salt: Buffer, pepperVersion: string): Buffer {
    // The pepper is server-only. A database leak alone is not enough to test
    // candidate passwords without also knowing this secret.
    const input = `${password}:${getPepper(pepperVersion)}`
    return scryptSync(input, salt, KEY_LEN, {
        N: SCRYPT_N,
        r: SCRYPT_R,
        p: SCRYPT_P,
        maxmem: SCRYPT_MAXMEMORY,
    })
}

export function hashPassword(password: string): string {
    if (typeof password !== "string" || password.length === 0) {
        throw new Error("hashPassword: password must be a non-empty string")
    }
    const pepperVersion = getActiveVersion()
    const salt = randomBytes(SALT_LEN)
    const hash = derive(password, salt, pepperVersion)
    // Format: scrypt$v1$<pepperVersion>$<saltB64>$<hashB64>
    return `${PREFIX}${pepperVersion}$${salt.toString("base64")}$${hash.toString("base64")}`
}

interface ParsedHash {
    pepperVersion: string
    salt: Buffer
    expected: Buffer
    legacyFormat: boolean
}

function parseStored(stored: string): ParsedHash | null {
    if (typeof stored !== "string" || !stored.startsWith(PREFIX)) return null
    const rest = stored.slice(PREFIX.length)
    const parts = rest.split("$")

    let pepperVersion: string
    let saltB64: string
    let hashB64: string
    let legacyFormat: boolean

    if (parts.length === 3 && PEPPER_VERSION_REGEX.test(parts[0])) {
        // Versioned format: scrypt$v1$<version>$<salt>$<hash>
        pepperVersion = normalizePepperVersion(parts[0])
        saltB64 = parts[1]
        hashB64 = parts[2]
        legacyFormat = false
    } else if (parts.length === 2) {
        // Legacy format: scrypt$v1$<salt>$<hash> — assume p1.
        pepperVersion = "p1"
        saltB64 = parts[0]
        hashB64 = parts[1]
        legacyFormat = true
    } else {
        return null
    }

    try {
        const salt = Buffer.from(saltB64, "base64")
        const expected = Buffer.from(hashB64, "base64")
        if (salt.length !== SALT_LEN || expected.length !== KEY_LEN) return null
        return { pepperVersion, salt, expected, legacyFormat }
    } catch {
        return null
    }
}

export function verifyPassword(password: string, stored: string): boolean {
    if (typeof password !== "string") return false
    const parsed = parseStored(stored)
    if (!parsed) return false
    const computed = derive(password, parsed.salt, parsed.pepperVersion)
    // Prevent timing leaks when comparing the derived hash to the stored hash.
    return timingSafeEqual(computed, parsed.expected)
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
    return parsed.legacyFormat || parsed.pepperVersion !== getActiveVersion()
}
