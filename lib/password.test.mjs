//
//  password.test.mjs
//
//  Created by Hilário on 03 Jun 2026 at 21:03.
//  Last changed by Hilário on 03 Jun 2026 at 21:03.
//
//  Covers password hashing, verification, pepper rotation, and legacy hash handling.
//

import assert from "node:assert/strict"

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

    assert.match(stored, /^scrypt\$v1\$p1\$/)
    assert.equal(verifyPassword(password, stored), true)
    assert.equal(verifyPassword("wrong password", stored), false)
    assert.equal(verifyPassword({ toString: () => password }, stored), false)
    assert.equal(passwordNeedsRehash(stored), false)

    const parts = stored.split("$")
    const legacyStored = `${parts[0]}$${parts[1]}$${parts[3]}$${parts[4]}`

    assert.equal(verifyPassword(password, legacyStored), true)
    assert.equal(passwordNeedsRehash(legacyStored), true)

    process.env.PASSWORD_PEPPER_ACTIVE = "p2"
    assert.equal(verifyPassword(password, stored), true)
    assert.equal(passwordNeedsRehash(stored), true)

    process.env.PASSWORD_PEPPER_P2 = "short"
    assert.throws(
        () => hashPassword(password),
        /PASSWORD_PEPPER_P2 must be set to at least 32 characters/
    )

    process.env.PASSWORD_PEPPER_ACTIVE = "1"
    assert.throws(
        () => hashPassword(password),
        /PASSWORD_PEPPER_ACTIVE must match/
    )

    console.log("password tests passed")
} finally {
    restoreEnv()
}
