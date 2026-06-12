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

import { isAdminPath, safeRedirectPath } from "./auth-redirect.ts"
import {
  createEmailTwoFactorExpiry,
  createEmailTwoFactorChallengePayload,
  createPendingEmailTwoFactorSession,
  hashEmailTwoFactorCode,
  isEmailTwoFactorCodeExpired,
  verifyEmailTwoFactorCodeHash,
} from "./email-two-factor.ts"

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

const pendingEmailTwoFactor = new Map()
const emailTwoFactorCode = "123456"
let storedCodeHash = hashEmailTwoFactorCode(emailTwoFactorCode)
const codeExpiry = createEmailTwoFactorExpiry(Date.now())
let sessionCreated = false
const tempToken = createPendingEmailTwoFactorSession(
  pendingEmailTwoFactor,
  "user-email-2fa",
  codeExpiry.getTime(),
)
const loginResponse = createEmailTwoFactorChallengePayload(tempToken)

assert.equal(loginResponse.needs_2fa, true)
assert.equal(typeof loginResponse.tempToken, "string")
assert.equal(pendingEmailTwoFactor.has(tempToken), true)
assert.equal(sessionCreated, false)
assert.notEqual(storedCodeHash, emailTwoFactorCode)
assert.equal(verifyEmailTwoFactorCodeHash("000000", storedCodeHash), false)
assert.equal(isEmailTwoFactorCodeExpired(new Date(Date.now() - 1)), true)
assert.equal(verifyEmailTwoFactorCodeHash(emailTwoFactorCode, storedCodeHash), true)

pendingEmailTwoFactor.delete(tempToken)
storedCodeHash = null
sessionCreated = true

assert.equal(sessionCreated, true)
assert.equal(pendingEmailTwoFactor.has(tempToken), false)
assert.equal(verifyEmailTwoFactorCodeHash(emailTwoFactorCode, storedCodeHash), false)

console.log("auth-security tests passed")
