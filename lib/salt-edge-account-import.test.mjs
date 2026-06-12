//
//  salt-edge-account-import.test.mjs
//  Argent
//
//  Created by Codex on 07 June 2026.
//  Description: Covers Salt Edge account import authorization boundaries.
//
import assert from "node:assert/strict"

import { prepareSaltEdgeAccountsForImport } from "./salt-edge-account-import.ts"

const authoritativeAccounts = [
  {
    id: "owned-account-1",
    name: "Trusted Checking",
    nature: "account",
    balance: 125.5,
    currency_code: "EUR",
    extra: { iban: "PT50000000000000000000000" },
  },
]

const foreignAccountAttempt = prepareSaltEdgeAccountsForImport(authoritativeAccounts, [
  {
    saltEdgeAccountId: "victim-account-999",
    name: "Attacker supplied name",
    nature: "account",
    balance: 999999,
    currencyCode: "EUR",
  },
])

assert.equal(foreignAccountAttempt.ok, false)
assert.equal(foreignAccountAttempt.status, 403)
assert.match(foreignAccountAttempt.error, /does not belong/)

const selectedOwnedAccount = prepareSaltEdgeAccountsForImport(authoritativeAccounts, [
  {
    saltEdgeAccountId: "owned-account-1",
    name: "Attacker supplied name",
    nature: "card",
    balance: 999999,
    currencyCode: "USD",
    iban: "ATTACKER-IBAN",
  },
])

assert.equal(selectedOwnedAccount.ok, true)
assert.deepEqual(selectedOwnedAccount.accounts, [
  {
    saltEdgeAccountId: "owned-account-1",
    name: "Trusted Checking",
    nature: "account",
    balance: 125.5,
    currencyCode: "EUR",
    iban: "PT50000000000000000000000",
  },
])

console.log("salt-edge account import security tests passed")
