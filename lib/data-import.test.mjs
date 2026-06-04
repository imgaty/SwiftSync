//
//  data-import.test.mjs
//  Argent
//
//  Created by Codex on 03 June 2026.
//  Description: Covers pure Argent data import parsing and normalization helpers.
//
import assert from "node:assert/strict"

import {
  ARGENT_BACKUP_SCHEMA,
  accountImportKey,
  argentBackupSchema,
  normalizeTagSlug,
  parseCsvRows,
  parseImportFile,
  transactionImportKey,
} from "./data-import.ts"

const backup = {
  schema: ARGENT_BACKUP_SCHEMA,
  version: 1,
  exportedAt: "2026-06-03T12:00:00.000Z",
  data: {
    accounts: [
      {
        id: "acc-1",
        name: "Main",
        type: "checking",
        institution: "Argent Bank",
        balance: 125.5,
        iban: "PT50 0000 0000 0000",
        currency: "eur",
        color: "#64748b",
        isActive: true,
      },
    ],
    tags: [{ slug: "food", name: "Food", color: "#6366f1", icon: "tag" }],
    transactions: [
      {
        id: "tx-1",
        date: "2026-06-01",
        type: "out",
        amount: 8.75,
        description: "Lunch",
        tags: ["Food", "food"],
        accountId: "acc-1",
      },
    ],
    bills: [],
    budgets: [{ tag: "food", category: "Food", limit: 500, color: "#6366f1" }],
    goals: [],
    rules: [],
    paceRules: [],
    spreadsheets: [],
  },
}

const parsedBackupSchema = argentBackupSchema.safeParse(backup)
assert.equal(parsedBackupSchema.success, true)

const invalidBackupSchema = argentBackupSchema.safeParse({
  ...backup,
  data: {
    ...backup.data,
    transactions: [{ ...backup.data.transactions[0], date: "2026-02-31" }],
  },
})
assert.equal(invalidBackupSchema.success, false)

const parsedBackup = parseImportFile(JSON.stringify(backup), "argent_backup.json")
assert.equal(parsedBackup.detectedFormat.kind, "backup")
assert.equal(parsedBackup.accounts[0].currency, "EUR")
assert.deepEqual(parsedBackup.transactions[0].tags, ["food"])
assert.equal(parsedBackup.budgets[0].tag, "food")
assert.equal(parsedBackup.errors.length, 0)

const csv = [
  "Date,Description,Type,Amount,Tags,Account",
  '2026-06-01,"Coffee, shop",Expense,3.50,"food, coffee",acc-1',
  '2026-06-02,"Refund ""June""",Income,10.00,,acc-1',
].join("\r\n")
const parsedCsvRows = parseCsvRows(csv)
assert.equal(parsedCsvRows.errors.length, 0)
assert.equal(parsedCsvRows.rows[0].Description, "Coffee, shop")
assert.equal(parsedCsvRows.rows[1].Description, 'Refund "June"')

const parsedCsv = parseImportFile(csv, "transactions.csv")
assert.equal(parsedCsv.detectedFormat.kind, "current_export")
assert.equal(parsedCsv.detectedFormat.entity, "transactions")
assert.equal(parsedCsv.transactions.length, 2)
assert.deepEqual(parsedCsv.transactions[0].tags, ["food", "coffee"])

const inconsistentCsv = parseCsvRows("Name,Amount\nRent,100\nBroken")
assert.equal(inconsistentCsv.errors.length, 1)
assert.match(inconsistentCsv.errors[0], /expected 2/)

const fullReport = parseImportFile(JSON.stringify([{ Metric: "Total Balance", Value: "100.00" }]), "report.json")
assert.equal(fullReport.errors[0].message, "Full report exports are summary-only and cannot be imported")

assert.equal(normalizeTagSlug(" Food & Drinks! "), "food_drinks")
assert.equal(
  accountImportKey({
    name: "Main",
    type: "checking",
    institution: "Bank",
    iban: "pt50 0000",
    currency: "eur",
  }),
  "iban:PT500000",
)
assert.equal(
  transactionImportKey({
    accountId: "acc-1",
    date: "2026-06-01",
    type: "out",
    amount: 3.5,
    description: "Coffee Shop",
  }),
  transactionImportKey({
    accountId: "acc-1",
    date: "2026-06-01",
    type: "out",
    amount: 3.5,
    description: " coffee  shop ",
  }),
)

console.log("data-import tests passed")
