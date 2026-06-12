//
//  password.ts
//
//  Created by hilario on 12 May 2026 at 07:29.
//  Last changed by hilario on 07 Jun 2026 at __:__.
//  Revised by hilario on 07 Jun 2026 at __:__.
//
//  Provides shared password logic for Argent, such as hashing and verification.
//

/*
 *  Password hashing
 *  scrypt with per-hash salt and a versioned server-side pepper.
 *
 *  Algorithm:  scrypt as implemented in Node's crypto module.
 *  Parameters: N = 2^17, r = 8, p = 1.
 *  Pepper:     loaded from PASSWORD_PEPPER_P<N>; blended into the password before hashing.
 *             In production, storing the pepper outside the database means a DB leak
 *             alone is not enough to brute-force hashes; the attacker would also need
 *             access to the configured pepper secret.
 *
 *  Format: "scrypt$v2$<pepperVersion>$<saltB64>$<hashB64>"
 *      - "<pepperVersion>" identifies which pepper was used, such as "p1" or "p2".
 *      - Multiple peppers can coexist so a leaked pepper can be rotated without locking out users.
 *      - Older scheme versions are not verified by this module; migrate them before
 *        deploying code that removes the old verifier.
 *
 *  Rotation: set PASSWORD_PEPPER_P2 alongside PASSWORD_PEPPER_P1, then flip
 *  PASSWORD_PEPPER_ACTIVE=p2. New writes use p2; existing hashes still verify
 *  with their stored version. Callers can persist a p2 replacement after a
 *  successful login when passwordNeedsRehash() returns true.
 *
 *  The final hash comparison is constant-time for valid stored hashes.
 */

import "server-only"                                                                            // Ensures this module is never bundled into the client
import { randomBytes, scryptSync, timingSafeEqual } from "crypto"
import {
    PASSWORD_PEPPER_MIN_LEN,
    getActivePasswordPepperVersion,
    getPasswordPepperEnvName,
    isPasswordPepperVersion,
    normalizePasswordPepperVersion,
} from "./secrets-check.ts"

const SCRYPT_N = 131072 // 2^17                                                                 // scrypt cost parameters. Deliberately CPU/memory-expensive to slow offline brute-force attempts.
const SCRYPT_R = 8
const SCRYPT_P = 1
const KEY_LEN = 64
const SALT_LEN = 32
const PASSWORD_MAX_LEN = 128
const PREFIX = "scrypt$v2$"
const PEPPER_MIN_LEN = PASSWORD_PEPPER_MIN_LEN


function normalizePepperVersion(version: string): string {                                      // Normalizes the pepper version tag formatting and validates it.
    return normalizePasswordPepperVersion(version)
}


function getPepper(version: string): string {                                                   // Fetches the active pepper value from the Env file and validates it.
    const pepperVersion = normalizePepperVersion(version)
    const pepperEnvName = getPasswordPepperEnvName(pepperVersion)
    const configuredPepper = process.env[pepperEnvName]

    if (configuredPepper === undefined) {                                                       // If pepper is not configured, throws in production.
        if (process.env.NODE_ENV === "production") {
            throw new Error(`${pepperEnvName} is required in production.`)
        }

        return `dev-pepper-use-only-${pepperVersion}`
    }

    if (configuredPepper.length < PEPPER_MIN_LEN) {                                             // A production pepper must be long enough to avoid accepting obviously weak secrets.
        throw new Error(`${pepperEnvName} must be at least ${PEPPER_MIN_LEN} characters.`)
    }

    return configuredPepper
}


function getActivePepperVersion(): string {                                                     // Controls which pepper version is used for newly generated hashes.
    return getActivePasswordPepperVersion()
}

function maxMemoryForN(scryptN: number): number {
    // scrypt's internal buffer is ~128 * N * r * p bytes. Node's default
    // maxmem is below what these params need, so add a 1 MiB cushion.
    return 128 * scryptN * SCRYPT_R * SCRYPT_P + 1024 * 1024
}

function derive(password: string, salt: Buffer, pepperVersion: string, scryptN = SCRYPT_N): Buffer {
    // In production, the pepper is server-only. A database leak alone is not
    // enough to test candidate passwords without also knowing this secret.
    const input = `${password}:${getPepper(pepperVersion)}`
    return scryptSync(input, salt, KEY_LEN, {
        N: scryptN,
        r: SCRYPT_R,
        p: SCRYPT_P,
        maxmem: maxMemoryForN(scryptN),
    })
}

export function hashPassword(password: string): string {
    if (typeof password !== "string" || password.length === 0) {
        throw new Error("hashPassword: password must be a non-empty string")
    }
    if (password.length > PASSWORD_MAX_LEN) {
        throw new Error(`hashPassword: password must be at most ${PASSWORD_MAX_LEN} characters`)
    }
    const pepperVersion = getActivePepperVersion()
    const salt = randomBytes(SALT_LEN)
    const hash = derive(password, salt, pepperVersion)
    // Format: scrypt$v2$<pepperVersion>$<saltB64>$<hashB64>
    return `${PREFIX}${pepperVersion}$${salt.toString("base64")}$${hash.toString("base64")}`
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

    if (parts.length === 3 && isPasswordPepperVersion(parts[0])) {
        // Versioned format: scrypt$v2$<version>$<salt>$<hash>
        pepperVersion = normalizePepperVersion(parts[0])
        saltB64 = parts[1]
        hashB64 = parts[2]
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
    if (typeof password !== "string") return false
    if (password.length > PASSWORD_MAX_LEN) return false
    const parsed = parseStored(stored)
    if (!parsed) return false
    const computed = derive(password, parsed.salt, parsed.pepperVersion)
    // Prevent timing leaks when comparing the derived hash to the stored hash.
    return timingSafeEqual(computed, parsed.expected)
}

/**
 * True if the stored hash should be re-written with the current scheme.
 * Returns true when:
 *   - the hash uses a pepper version other than the active one (rotation in progress).
 *
 * Callers should re-hash and persist after a successful verifyPassword().
 */
export function passwordNeedsRehash(stored: string): boolean {
    const parsed = parseStored(stored)
    if (!parsed) return true
    return parsed.pepperVersion !== getActivePepperVersion()
}
