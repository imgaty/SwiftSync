//
//  auth-security.test.mjs
//  Argent
//
//  Created by hilario on 27 May 2026 at 17:07.
//  Description: Covers auth security behavior in Argent, exercising shared security and utility logic
//  that should remain stable across application flows.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import assert from "node:assert/strict"

import { consumeBackupCode, normalizeBackupCode, replacePendingTwoFactorSession } from "./auth-2fa.ts"
import { isAdminPath, safeRedirectPath } from "./auth-redirect.ts"

assert.equal(safeRedirectPath("/Transactions?range=month#latest"), "/Transactions?range=month#latest")
assert.equal(safeRedirectPath("/admin/users"), "/admin/users")
assert.equal(safeRedirectPath("https://evil.example/login"), "/")
assert.equal(safeRedirectPath("//evil.example/login"), "/")
assert.equal(safeRedirectPath("javascript:alert(1)"), "/")
assert.equal(safeRedirectPath("   /Budgets   "), "/Budgets")

assert.equal(isAdminPath("/admin"), true)
assert.equal(isAdminPath("/admin/users?status=active"), true)
assert.equal(isAdminPath("/administrator"), false)
assert.equal(isAdminPath("/administer"), false)

assert.equal(normalizeBackupCode(" AB12-cd34 "), "ab12cd34")
assert.equal(normalizeBackupCode("ab 12 cd 34"), "ab12cd34")
assert.equal(normalizeBackupCode("   "), "")

assert.deepEqual(consumeBackupCode(["ab12cd34", "ffff0000"], "AB12-CD34"), ["ffff0000"])
assert.deepEqual(consumeBackupCode(["ab12cd34", "ffff0000"], " ff ff 00 00 "), ["ab12cd34"])
assert.equal(consumeBackupCode(["ab12cd34"], "missing"), null)
assert.equal(consumeBackupCode(["ab12cd34"], "   "), null)

const pending = new Map()
replacePendingTwoFactorSession(pending, "token-a", {
    attempts: 0,
    expiresAt: 100,
    maxPending: 10,
    userId: "user-1",
})
replacePendingTwoFactorSession(pending, "token-b", {
    attempts: 0,
    expiresAt: 200,
    maxPending: 10,
    userId: "user-1",
})

assert.equal(pending.has("token-a"), false)
assert.deepEqual(pending.get("token-b"), {
    attempts: 0,
    expiresAt: 200,
    userId: "user-1",
})

console.log("auth-security tests passed")
