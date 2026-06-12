//
//  data-import.ts
//  Argent
//
//  Created by Codex on 03 June 2026.
//  Description: Shared import/export schemas, parsers, and normalization helpers for Argent data backups.
//
import { z } from "zod"

export const ARGENT_BACKUP_SCHEMA = "argent.backup.v1"

export const IMPORT_DOMAINS = [
  "accounts",
  "tags",
  "transactions",
  "bills",
  "budgets",
  "goals",
  "rules",
  "paceRules",
  "spreadsheets",
] as const

export type ImportDomain = typeof IMPORT_DOMAINS[number]

export type ImportCounts = Record<ImportDomain, {
  received: number
  created: number
  skipped: number
  errors: number
}>

export type ImportRowError = {
  entity: ImportDomain | "file"
  row?: number
  message: string
}

export type ImportDetectedFormat = {
  kind: "backup" | "current_export"
  entity?: ImportDomain
  source: "json" | "csv"
}

export type ImportSummary = {
  detectedFormat: ImportDetectedFormat
  counts: ImportCounts
  warnings: string[]
  errors: ImportRowError[]
}

export type ImportAccount = {
  id?: string
  name: string
  type: AccountType
  institution: string
  balance: number
  iban?: string | null
  currency: string
  color: string
  isActive: boolean
}

export type ImportTag = {
  id?: string
  slug: string
  name: string
  color: string
  icon: string
  isSystem: boolean
  isArchived: boolean
}

export type ImportTransaction = {
  id?: string
  date: string
  type: "in" | "out"
  amount: number
  description: string
  tags: string[]
  accountId: string
}

export type ImportBill = {
  id?: string
  name: string
  amount: number
  tags: string[]
  dueDay: number
  frequency: "weekly" | "monthly" | "yearly"
  accountId: string
  category: string
  autopay: boolean
  status: "paid" | "pending" | "overdue" | "upcoming"
}

export type ImportBudget = {
  id?: string
  tag: string
  category: string
  limit: number
  color: string
}

export type ImportGoal = {
  id?: string
  accountId?: string | null
  name: string
  targetAmount: number
  currentAmount: number
  baselineAmount: number
  targetMode: "total" | "additional"
  deadline: string | null
  category: string
  color: string
  status: "active" | "completed" | "cancelled"
  currency: string
}

export type ImportRule = {
  id?: string
  name: string
  enabled: boolean
  filters: unknown[]
  addTagSlugs: string[]
  priority: number
}

export type ImportPACERule = {
  id?: string
  pattern: string
  matchField: "description" | "name"
  tag: string
  priority: number
}

export type ImportSpreadsheet = {
  id?: string
  name: string
  description: string | null
  sheetType: "manual" | "linked" | "grid"
  linkedEntity: "transactions" | "budgets" | "bills" | "accounts" | null
  content: unknown
}

export type NormalizedImportPayload = {
  detectedFormat: ImportDetectedFormat
  accounts: ImportAccount[]
  tags: ImportTag[]
  transactions: ImportTransaction[]
  bills: ImportBill[]
  budgets: ImportBudget[]
  goals: ImportGoal[]
  rules: ImportRule[]
  paceRules: ImportPACERule[]
  spreadsheets: ImportSpreadsheet[]
  warnings: string[]
  errors: ImportRowError[]
}

const accountTypes = ["checking", "savings", "credit_card", "digital_wallet"] as const
type AccountType = typeof accountTypes[number]

const accountTypeSchema = z.enum(accountTypes)
const dateStringSchema = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).refine(isValidDateString, "Invalid date")
const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/)
const positiveAmountSchema = z.coerce.number().finite().positive()
const nonNegativeAmountSchema = z.coerce.number().finite().nonnegative()
const tagSlugSchema = z.string().trim().min(1).max(64).regex(/^[a-z0-9_-]+$/i)

const backupAccountSchema = z.object({
  id: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).max(200),
  type: accountTypeSchema.default("checking"),
  institution: z.string().trim().min(1).max(200).default("Imported"),
  balance: z.coerce.number().finite().default(0),
  iban: z.string().trim().max(64).nullable().optional(),
  currency: z.string().trim().min(1).max(8).default("EUR"),
  color: hexColorSchema.default("#64748b"),
  isActive: z.boolean().default(true),
})

const backupTagSchema = z.object({
  id: z.string().trim().min(1).optional(),
  slug: tagSlugSchema,
  name: z.string().trim().min(1).max(50),
  color: hexColorSchema.default("#6366f1"),
  icon: z.string().trim().min(1).max(40).default("tag"),
  isSystem: z.boolean().default(false),
  isArchived: z.boolean().default(false),
})

const backupTransactionSchema = z.object({
  id: z.string().trim().min(1).optional(),
  date: dateStringSchema,
  type: z.enum(["in", "out"]),
  amount: positiveAmountSchema,
  description: z.string().trim().min(1).max(500),
  tags: z.array(z.string().trim().min(1).max(64)).max(25).default([]),
  accountId: z.string().trim().min(1),
})

const backupBillSchema = z.object({
  id: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).max(200),
  amount: positiveAmountSchema,
  tags: z.array(z.string().trim().min(1).max(64)).max(25).default([]),
  dueDay: z.coerce.number().int().min(1).max(31),
  frequency: z.enum(["weekly", "monthly", "yearly"]),
  accountId: z.string().trim().min(1),
  category: z.string().trim().min(1).max(100),
  autopay: z.boolean().default(false),
  status: z.enum(["paid", "pending", "overdue", "upcoming"]).default("pending"),
})

const backupBudgetSchema = z.object({
  id: z.string().trim().min(1).optional(),
  tag: tagSlugSchema,
  category: z.string().trim().min(1).max(100),
  limit: positiveAmountSchema,
  color: hexColorSchema.default("#6366f1"),
})

const backupGoalSchema = z.object({
  id: z.string().trim().min(1).optional(),
  accountId: z.string().trim().min(1).nullable().optional().default(null),
  name: z.string().trim().min(1).max(200),
  targetAmount: positiveAmountSchema,
  currentAmount: nonNegativeAmountSchema.default(0),
  baselineAmount: nonNegativeAmountSchema.default(0),
  targetMode: z.enum(["total", "additional"]).default("total"),
  deadline: dateStringSchema.nullable().optional().default(null),
  category: z.string().trim().min(1).max(100).default("savings"),
  color: hexColorSchema.default("#6366f1"),
  status: z.enum(["active", "completed", "cancelled"]).default("active"),
  currency: z.string().trim().min(1).max(8).default("EUR"),
})

const backupRuleSchema = z.object({
  id: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).max(100),
  enabled: z.boolean().default(true),
  filters: z.array(z.unknown()).min(1).max(20),
  addTagSlugs: z.array(tagSlugSchema).min(1).max(20),
  priority: z.coerce.number().int().min(0).max(1_000_000).default(0),
})

const backupPACERuleSchema = z.object({
  id: z.string().trim().min(1).optional(),
  pattern: z.string().trim().min(1).max(200),
  matchField: z.enum(["description", "name"]).default("description"),
  tag: tagSlugSchema,
  priority: z.coerce.number().int().min(0).max(1_000_000).default(0),
})

const backupSpreadsheetSchema = z.object({
  id: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2_000).nullable().optional().default(null),
  sheetType: z.enum(["manual", "linked", "grid"]).default("manual"),
  linkedEntity: z.enum(["transactions", "budgets", "bills", "accounts"]).nullable().optional().default(null),
  content: z.unknown(),
})

export const argentBackupSchema = z.object({
  schema: z.literal(ARGENT_BACKUP_SCHEMA),
  version: z.literal(1),
  exportedAt: z.string().optional(),
  data: z.object({
    accounts: z.array(backupAccountSchema).default([]),
    tags: z.array(backupTagSchema).default([]),
    transactions: z.array(backupTransactionSchema).default([]),
    bills: z.array(backupBillSchema).default([]),
    budgets: z.array(backupBudgetSchema).default([]),
    goals: z.array(backupGoalSchema).default([]),
    rules: z.array(backupRuleSchema).default([]),
    paceRules: z.array(backupPACERuleSchema).default([]),
    spreadsheets: z.array(backupSpreadsheetSchema).default([]),
  }),
})

export type ArgentBackup = z.infer<typeof argentBackupSchema>

export function emptyImportCounts(): ImportCounts {
  return Object.fromEntries(
    IMPORT_DOMAINS.map((domain) => [domain, { received: 0, created: 0, skipped: 0, errors: 0 }])
  ) as ImportCounts
}

export function buildImportSummary(payload: NormalizedImportPayload): ImportSummary {
  const counts = emptyImportCounts()
  for (const domain of IMPORT_DOMAINS) {
    counts[domain].received = payload[domain].length
    counts[domain].errors = payload.errors.filter((error) => error.entity === domain).length
  }
  return {
    detectedFormat: payload.detectedFormat,
    counts,
    warnings: payload.warnings,
    errors: payload.errors,
  }
}

export function parseImportFile(text: string, fileName = ""): NormalizedImportPayload {
  const trimmed = text.trim()
  if (!trimmed) {
    return errorPayload({ kind: "current_export", source: inferSource(fileName) }, "Import file is empty")
  }

  if (looksLikeJson(trimmed, fileName)) {
    return parseJsonImport(trimmed)
  }

  return parseCsvImport(text)
}

function parseJsonImport(text: string): NormalizedImportPayload {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return errorPayload({ kind: "current_export", source: "json" }, "Invalid JSON import file")
  }

  const backup = argentBackupSchema.safeParse(value)
  if (backup.success) {
    return {
      detectedFormat: { kind: "backup", source: "json" },
      accounts: normalizeAccounts(backup.data.data.accounts),
      tags: normalizeTags(backup.data.data.tags),
      transactions: normalizeTransactions(backup.data.data.transactions),
      bills: normalizeBills(backup.data.data.bills),
      budgets: normalizeBudgets(backup.data.data.budgets),
      goals: normalizeGoals(backup.data.data.goals),
      rules: normalizeRules(backup.data.data.rules),
      paceRules: normalizePACERules(backup.data.data.paceRules),
      spreadsheets: normalizeSpreadsheets(backup.data.data.spreadsheets),
      warnings: [],
      errors: [],
    }
  }

  if (isRecord(value) && value.schema) {
    return errorPayload(
      { kind: "backup", source: "json" },
      `Unsupported backup schema "${String(value.schema)}"`
    )
  }

  if (!Array.isArray(value)) {
    return errorPayload({ kind: "current_export", source: "json" }, "JSON import must be an Argent backup or a current export array")
  }

  return normalizeCurrentExportRows(value, "json")
}

function parseCsvImport(text: string): NormalizedImportPayload {
  const parsed = parseCsvRows(text)
  if (parsed.errors.length > 0) {
    return {
      ...emptyPayload({ kind: "current_export", source: "csv" }),
      errors: parsed.errors.map((message) => ({ entity: "file", message })),
    }
  }
  return normalizeCurrentExportRows(parsed.rows, "csv")
}

export function parseCsvRows(text: string): { rows: Record<string, string>[]; errors: string[] } {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let inQuotes = false

  const pushCell = () => {
    row.push(cell)
    cell = ""
  }
  const pushRow = () => {
    pushCell()
    rows.push(row)
    row = []
  }

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cell += char
      }
      continue
    }

    if (char === '"') {
      if (cell.length === 0) {
        inQuotes = true
      } else {
        cell += char
      }
      continue
    }
    if (char === ",") {
      pushCell()
      continue
    }
    if (char === "\r" || char === "\n") {
      pushRow()
      if (char === "\r" && text[i + 1] === "\n") i++
      continue
    }
    cell += char
  }

  if (inQuotes) return { rows: [], errors: ["CSV contains an unterminated quoted field"] }
  if (cell.length > 0 || row.length > 0) pushRow()

  const nonEmptyRows = rows.filter((r) => r.some((c) => c.trim().length > 0))
  if (nonEmptyRows.length === 0) return { rows: [], errors: ["CSV import file is empty"] }

  const headers = nonEmptyRows[0].map((header) => header.trim())
  if (headers.some((header) => !header)) return { rows: [], errors: ["CSV header contains an empty column"] }

  const errors: string[] = []
  const dataRows: Record<string, string>[] = []
  for (let i = 1; i < nonEmptyRows.length; i++) {
    const current = nonEmptyRows[i]
    if (current.length !== headers.length) {
      errors.push(`CSV row ${i + 1} has ${current.length} column(s); expected ${headers.length}`)
      continue
    }
    dataRows.push(Object.fromEntries(headers.map((header, index) => [header, current[index].trim()])))
  }

  return { rows: dataRows, errors }
}

function normalizeCurrentExportRows(rows: unknown[], source: "json" | "csv"): NormalizedImportPayload {
  if (rows.length === 0) {
    return errorPayload({ kind: "current_export", source }, "Current export contains no rows")
  }

  if (!rows.every(isRecord)) {
    return errorPayload({ kind: "current_export", source }, "Current export rows must be objects")
  }

  const first = rows[0] as Record<string, unknown>
  if (hasColumns(first, ["Metric", "Value"])) {
    return errorPayload(
      { kind: "current_export", source },
      "Full report exports are summary-only and cannot be imported"
    )
  }
  if (hasColumns(first, ["Date", "Description", "Type", "Amount", "Tags", "Account"])) {
    return normalizeCurrentTransactions(rows as Record<string, unknown>[], source)
  }
  if (hasColumns(first, ["Name", "Type", "Institution", "Balance"])) {
    return normalizeCurrentAccounts(rows as Record<string, unknown>[], source)
  }
  if (hasColumns(first, ["Name", "Amount", "Due Day", "Frequency", "Category", "Account"])) {
    return normalizeCurrentBills(rows as Record<string, unknown>[], source)
  }
  if (hasColumns(first, ["Category", "Tag", "Budget Limit"])) {
    return normalizeCurrentBudgets(rows as Record<string, unknown>[], source)
  }

  return errorPayload({ kind: "current_export", source }, "Could not detect a supported current export type")
}

function normalizeCurrentAccounts(rows: Record<string, unknown>[], source: "json" | "csv"): NormalizedImportPayload {
  const payload = emptyPayload({ kind: "current_export", entity: "accounts", source })
  rows.forEach((row, index) => {
    const rowNumber = index + (source === "csv" ? 2 : 1)
    const name = textValue(row, "Name")
    const institution = textValue(row, "Institution") || "Imported"
    const accountType = normalizeAccountType(textValue(row, "Type") || "checking")
    const balance = parseMoney(textValue(row, "Balance"))
    if (!name || !accountType || balance === null) {
      payload.errors.push({ entity: "accounts", row: rowNumber, message: "Account row is missing name, type, or balance" })
      return
    }
    payload.accounts.push({
      name,
      type: accountType,
      institution,
      balance,
      currency: "EUR",
      color: "#64748b",
      isActive: true,
      iban: null,
    })
  })
  return payload
}

function normalizeCurrentTransactions(rows: Record<string, unknown>[], source: "json" | "csv"): NormalizedImportPayload {
  const payload = emptyPayload({ kind: "current_export", entity: "transactions", source })
  payload.warnings.push("Current transaction exports reference account IDs only; missing accounts will be restored as local placeholder accounts.")
  rows.forEach((row, index) => {
    const rowNumber = index + (source === "csv" ? 2 : 1)
    const date = textValue(row, "Date")
    const description = textValue(row, "Description")
    const type = normalizeTransactionType(textValue(row, "Type"))
    const amount = parseMoney(textValue(row, "Amount"))
    const accountId = textValue(row, "Account")
    if (!date || !isValidDateString(date) || !description || !type || amount === null || amount <= 0 || !accountId) {
      payload.errors.push({ entity: "transactions", row: rowNumber, message: "Transaction row is missing date, type, amount, description, or account" })
      return
    }
    payload.transactions.push({
      date,
      type,
      amount,
      description,
      tags: splitTags(textValue(row, "Tags")),
      accountId,
    })
  })
  return payload
}

function normalizeCurrentBills(rows: Record<string, unknown>[], source: "json" | "csv"): NormalizedImportPayload {
  const payload = emptyPayload({ kind: "current_export", entity: "bills", source })
  payload.warnings.push("Current bill exports do not include tags, autopay, or status; defaults will be used.")
  rows.forEach((row, index) => {
    const rowNumber = index + (source === "csv" ? 2 : 1)
    const name = textValue(row, "Name")
    const amount = parseMoney(textValue(row, "Amount"))
    const dueDay = Number(textValue(row, "Due Day"))
    const frequency = normalizeBillFrequency(textValue(row, "Frequency"))
    const category = textValue(row, "Category")
    const accountId = textValue(row, "Account")
    if (!name || amount === null || amount <= 0 || !Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31 || !frequency || !category || !accountId) {
      payload.errors.push({ entity: "bills", row: rowNumber, message: "Bill row is missing name, amount, due day, frequency, category, or account" })
      return
    }
    payload.bills.push({
      name,
      amount,
      tags: [],
      dueDay,
      frequency,
      accountId,
      category,
      autopay: false,
      status: "pending",
    })
  })
  return payload
}

function normalizeCurrentBudgets(rows: Record<string, unknown>[], source: "json" | "csv"): NormalizedImportPayload {
  const payload = emptyPayload({ kind: "current_export", entity: "budgets", source })
  rows.forEach((row, index) => {
    const rowNumber = index + (source === "csv" ? 2 : 1)
    const category = textValue(row, "Category")
    const tag = normalizeTagSlug(textValue(row, "Tag"))
    const limit = parseMoney(textValue(row, "Budget Limit"))
    if (!category || !tag || limit === null || limit <= 0) {
      payload.errors.push({ entity: "budgets", row: rowNumber, message: "Budget row is missing category, tag, or budget limit" })
      return
    }
    payload.budgets.push({
      category,
      tag,
      limit,
      color: "#6366f1",
    })
  })
  return payload
}

export function inferMissingTags(payload: Pick<NormalizedImportPayload, "transactions" | "bills" | "budgets" | "rules" | "paceRules">): ImportTag[] {
  const slugs = new Set<string>()
  for (const transaction of payload.transactions) transaction.tags.forEach((tag) => slugs.add(normalizeTagSlug(tag)))
  for (const bill of payload.bills) bill.tags.forEach((tag) => slugs.add(normalizeTagSlug(tag)))
  for (const budget of payload.budgets) slugs.add(normalizeTagSlug(budget.tag))
  for (const rule of payload.rules) rule.addTagSlugs.forEach((tag) => slugs.add(normalizeTagSlug(tag)))
  for (const rule of payload.paceRules) slugs.add(normalizeTagSlug(rule.tag))
  return [...slugs]
    .filter(Boolean)
    .map((slug) => ({
      slug,
      name: titleFromSlug(slug),
      color: "#6366f1",
      icon: "tag",
      isSystem: false,
      isArchived: false,
    }))
}

export function normalizeIban(iban: string | null | undefined): string {
  return (iban || "").replace(/\s+/g, "").toUpperCase()
}

export function normalizeTagSlug(slug: string | null | undefined): string {
  return (slug || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64)
}

export function titleFromSlug(slug: string): string {
  return slug
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .slice(0, 50) || "Imported"
}

export function accountImportKey(account: Pick<ImportAccount, "iban" | "institution" | "name" | "type" | "currency">): string {
  const iban = normalizeIban(account.iban)
  if (iban) return `iban:${iban}`
  return [
    "identity",
    normalizeKey(account.institution),
    normalizeKey(account.name),
    account.type,
    (account.currency || "EUR").toUpperCase(),
  ].join(":")
}

export function transactionImportKey(input: {
  accountId: string
  date: string
  type: "in" | "out"
  amount: number
  description: string
}): string {
  return [
    input.accountId,
    input.date,
    input.type,
    formatAmount(input.amount),
    normalizeKey(input.description),
  ].join(":")
}

export function billImportKey(input: {
  accountId: string
  name: string
  amount: number
  dueDay: number
  frequency: string
}): string {
  return [
    input.accountId,
    normalizeKey(input.name),
    formatAmount(input.amount),
    String(input.dueDay),
    input.frequency,
  ].join(":")
}

export function budgetImportKey(input: { tag: string }): string {
  return normalizeTagSlug(input.tag)
}

export function goalImportKey(input: {
  name: string
  targetAmount: number
  deadline: string | null
  category: string
  accountId?: string | null
  targetMode?: "total" | "additional"
}): string {
  return [
    input.accountId || "",
    input.targetMode || "total",
    normalizeKey(input.name),
    formatAmount(input.targetAmount),
    input.deadline || "",
    normalizeKey(input.category),
  ].join(":")
}

export function ruleImportKey(input: { name: string; filters: unknown[]; addTagSlugs: string[]; priority: number }): string {
  return [normalizeKey(input.name), stableStringify(input.filters), stableStringify(input.addTagSlugs.map(normalizeTagSlug).sort()), String(input.priority)].join(":")
}

export function paceRuleImportKey(input: { pattern: string; matchField: string; tag: string; priority: number }): string {
  return [input.pattern.trim().toLowerCase(), input.matchField, normalizeTagSlug(input.tag), String(input.priority)].join(":")
}

export function spreadsheetImportKey(input: { name: string; sheetType: string; linkedEntity: string | null; content: unknown }): string {
  return [normalizeKey(input.name), input.sheetType, input.linkedEntity || "", stableStringify(input.content)].join(":")
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`
  }
  return JSON.stringify(value)
}

export function formatAmount(value: number): string {
  return Number(value).toFixed(2)
}

function emptyPayload(detectedFormat: ImportDetectedFormat): NormalizedImportPayload {
  return {
    detectedFormat,
    accounts: [],
    tags: [],
    transactions: [],
    bills: [],
    budgets: [],
    goals: [],
    rules: [],
    paceRules: [],
    spreadsheets: [],
    warnings: [],
    errors: [],
  }
}

function errorPayload(detectedFormat: ImportDetectedFormat, message: string): NormalizedImportPayload {
  return {
    ...emptyPayload(detectedFormat),
    errors: [{ entity: "file", message }],
  }
}

function normalizeAccounts(accounts: ImportAccount[]): ImportAccount[] {
  return accounts.map((account) => ({
    ...account,
    currency: account.currency.toUpperCase(),
    iban: account.iban || null,
  }))
}

function normalizeTags(tags: ImportTag[]): ImportTag[] {
  return tags.map((tag) => ({ ...tag, slug: normalizeTagSlug(tag.slug) })).filter((tag) => tag.slug)
}

function normalizeTransactions(transactions: ImportTransaction[]): ImportTransaction[] {
  return transactions.map((transaction) => ({
    ...transaction,
    tags: [...new Set(transaction.tags.map(normalizeTagSlug).filter(Boolean))],
  }))
}

function normalizeBills(bills: ImportBill[]): ImportBill[] {
  return bills.map((bill) => ({
    ...bill,
    tags: [...new Set(bill.tags.map(normalizeTagSlug).filter(Boolean))],
  }))
}

function normalizeBudgets(budgets: ImportBudget[]): ImportBudget[] {
  return budgets.map((budget) => ({ ...budget, tag: normalizeTagSlug(budget.tag) })).filter((budget) => budget.tag)
}

function normalizeGoals(goals: ImportGoal[]): ImportGoal[] {
  return goals.map((goal) => ({
    ...goal,
    accountId: goal.accountId || null,
    baselineAmount: goal.targetMode === "additional" ? goal.baselineAmount : 0,
    currency: goal.currency.toUpperCase(),
  }))
}

function normalizeRules(rules: ImportRule[]): ImportRule[] {
  return rules.map((rule) => ({
    ...rule,
    addTagSlugs: [...new Set(rule.addTagSlugs.map(normalizeTagSlug).filter(Boolean))],
  }))
}

function normalizePACERules(rules: ImportPACERule[]): ImportPACERule[] {
  return rules.map((rule) => ({ ...rule, tag: normalizeTagSlug(rule.tag) })).filter((rule) => rule.tag)
}

function normalizeSpreadsheets(spreadsheets: ImportSpreadsheet[]): ImportSpreadsheet[] {
  return spreadsheets
}

function hasColumns(row: Record<string, unknown>, columns: string[]): boolean {
  return columns.every((column) => lookupKey(row, column) !== undefined)
}

function textValue(row: Record<string, unknown>, column: string): string {
  const key = lookupKey(row, column)
  const value = key === undefined ? "" : row[key]
  return String(value ?? "").trim()
}

function lookupKey(row: Record<string, unknown>, column: string): string | undefined {
  const normalized = column.toLowerCase()
  return Object.keys(row).find((key) => key.trim().toLowerCase() === normalized)
}

function splitTags(value: string): string[] {
  return [...new Set(value.split(",").map(normalizeTagSlug).filter(Boolean))].slice(0, 25)
}

function normalizeAccountType(value: string): AccountType | null {
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_")
  if (accountTypes.includes(normalized as AccountType)) return normalized as AccountType
  if (normalized === "credit" || normalized === "card" || normalized === "creditcard") return "credit_card"
  if (normalized === "wallet") return "digital_wallet"
  return null
}

function normalizeTransactionType(value: string): "in" | "out" | null {
  const normalized = value.trim().toLowerCase()
  if (normalized === "in" || normalized === "income" || normalized === "credit") return "in"
  if (normalized === "out" || normalized === "expense" || normalized === "debit") return "out"
  return null
}

function normalizeBillFrequency(value: string): "weekly" | "monthly" | "yearly" | null {
  const normalized = value.trim().toLowerCase()
  if (normalized === "weekly" || normalized === "monthly" || normalized === "yearly") return normalized
  return null
}

function parseMoney(value: string): number | null {
  const cleaned = value.replace(/[%€$£\s]/g, "").replace(/,/g, "")
  if (!cleaned) return null
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : null
}

function isValidDateString(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function looksLikeJson(text: string, fileName: string): boolean {
  return fileName.toLowerCase().endsWith(".json") || text.startsWith("{") || text.startsWith("[")
}

function inferSource(fileName: string): "json" | "csv" {
  return fileName.toLowerCase().endsWith(".json") ? "json" : "csv"
}

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}
