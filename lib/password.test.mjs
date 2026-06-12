//
//  password.test.mjs
//
//  Created by hilario on 03 Jun 2026 at 21:03.
//  Last changed by hilario on 03 Jun 2026 at 21:03.
//
//  Covers password hashing, verification, pepper rotation, and old scheme rejection.
//

import assert from "node:assert/strict"
import { scryptSync } from "node:crypto"

const SCRYPT_N = 131072
const SCRYPT_N_V1 = 32768
const SCRYPT_R = 8
const SCRYPT_P = 1
const KEY_LEN = 64
const SALT_LEN = 32

function maxMemoryForN(scryptN) {
    return 128 * scryptN * SCRYPT_R * SCRYPT_P + 1024 * 1024
}

function makeLegacyScryptV1Hash(password, includePepperVersion = true) {
    const pepperVersion = "p1"
    const salt = Buffer.alloc(SALT_LEN, 7)
    const pepper = process.env.PASSWORD_PEPPER_P1
    const hash = scryptSync(`${password}:${pepper}`, salt, KEY_LEN, {
        N: SCRYPT_N_V1,
        r: SCRYPT_R,
        p: SCRYPT_P,
        maxmem: maxMemoryForN(SCRYPT_N_V1),
    })

    if (includePepperVersion) {
        return `scrypt$v1$${pepperVersion}$${salt.toString("base64")}$${hash.toString("base64")}`
    }

    return `scrypt$v1$${salt.toString("base64")}$${hash.toString("base64")}`
}

function deriveForTest(password, pepper, salt, scryptN) {
    return scryptSync(`${password}:${pepper}`, salt, KEY_LEN, {
        N: scryptN,
        r: SCRYPT_R,
        p: SCRYPT_P,
        maxmem: maxMemoryForN(scryptN),
    })
}

const previousEnv = {
    NODE_ENV: process.env.NODE_ENV,
    PASSWORD_PEPPER_ACTIVE: process.env.PASSWORD_PEPPER_ACTIVE,
    PASSWORD_PEPPER_P1: process.env.PASSWORD_PEPPER_P1,
    PASSWORD_PEPPER_P2: process.env.PASSWORD_PEPPER_P2,
}

function restoreEnv() {
    for (const [key, value] of Object.entries(previousEnv)) {
        if (value === undefined) {
            delete process.env[key]
        } else {
            process.env[key] = value
        }
    }
}

try {
    process.env.NODE_ENV = "development"
    process.env.PASSWORD_PEPPER_ACTIVE = "p1"
    process.env.PASSWORD_PEPPER_P1 = "0123456789abcdef0123456789abcdef"
    process.env.PASSWORD_PEPPER_P2 = "abcdef0123456789abcdef0123456789"

    const { hashPassword, passwordNeedsRehash, verifyPassword } = await import("./password.ts")

    const password = "correct horse battery staple"
    const stored = hashPassword(password)

    assert.match(stored, /^scrypt\$v2\$p1\$/)
    const parts = stored.split("$")
    assert.equal(parts.length, 5)
    assert.equal(Buffer.from(parts[3], "base64").length, SALT_LEN)
    assert.equal(Buffer.from(parts[4], "base64").length, KEY_LEN)
    const activeSalt = Buffer.from(parts[3], "base64")
    const activeHash = Buffer.from(parts[4], "base64")
    assert.deepEqual(
        activeHash,
        deriveForTest(password, process.env.PASSWORD_PEPPER_P1, activeSalt, SCRYPT_N)
    )
    assert.notDeepEqual(
        activeHash,
        deriveForTest(password, process.env.PASSWORD_PEPPER_P1, activeSalt, SCRYPT_N_V1)
    )
    assert.equal(verifyPassword(password, stored), true)
    assert.equal(verifyPassword("wrong password", stored), false)
    assert.equal(verifyPassword({ toString: () => password }, stored), false)
    assert.equal(verifyPassword("x".repeat(129), stored), false)
    assert.equal(passwordNeedsRehash(stored), false)

    assert.throws(
        () => hashPassword("x".repeat(129)),
        /password must be at most 128 characters/
    )

    const legacyStored = makeLegacyScryptV1Hash(password, false)

    assert.equal(verifyPassword(password, legacyStored), false)
    assert.equal(passwordNeedsRehash(legacyStored), true)

    const legacyVersionedStored = makeLegacyScryptV1Hash(password, true)
    assert.equal(verifyPassword(password, legacyVersionedStored), false)
    assert.equal(passwordNeedsRehash(legacyVersionedStored), true)

    process.env.PASSWORD_PEPPER_ACTIVE = "p2"
    assert.equal(verifyPassword(password, stored), true)
    assert.equal(passwordNeedsRehash(stored), true)

    process.env.PASSWORD_PEPPER_P2 = "short"
    assert.throws(
        () => hashPassword(password),
        /PASSWORD_PEPPER_P2 must be at least 32 characters/
    )

    delete process.env.PASSWORD_PEPPER_P2
    process.env.NODE_ENV = "production"
    assert.throws(
        () => hashPassword(password),
        /PASSWORD_PEPPER_P2 is required in production/
    )
    process.env.NODE_ENV = "development"

    process.env.PASSWORD_PEPPER_ACTIVE = "1"
    assert.throws(
        () => hashPassword(password),
        /PASSWORD_PEPPER_ACTIVE must match/
    )

    console.log("password tests passed")
} finally {
    restoreEnv()
}
