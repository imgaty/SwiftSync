//
//  route.ts
//  Argent
//
//  Created by Codex on 03 June 2026.
//  Description: Handles user-scoped Argent data imports with dry-run previews and additive commits.
//
import { NextResponse } from "next/server"
import { Prisma } from "@/lib/generated/prisma/client"
import { getAuthContext, type AuthContext } from "@/lib/auth-helpers"
import { requirePermission, scopeCreateData, scopeFilter } from "@/lib/data-access"
import { goalAccountName, goalTransferReference } from "@/lib/goal-account"
import {
  accountImportKey,
  billImportKey,
  budgetImportKey,
  buildImportSummary,
  emptyImportCounts,
  goalImportKey,
  inferMissingTags,
  normalizeIban,
  normalizeTagSlug,
  paceRuleImportKey,
  parseImportFile,
  ruleImportKey,
  spreadsheetImportKey,
  titleFromSlug,
  transactionImportKey,
  type ImportAccount,
  type ImportCounts,
  type ImportRowError,
  type ImportSummary,
  type ImportTag,
  type NormalizedImportPayload,
} from "@/lib/data-import"
import { paceRuleCreateSchema, ruleCreateSchema } from "@/lib/PACE"
import { prisma } from "@/lib/prisma"
import { assertContentSize, spreadsheetCreateSchema } from "@/lib/spreadsheet-schema"

const MAX_IMPORT_BYTES = 15 * 1024 * 1024

type ImportRunSummary = ImportSummary & { dryRun: boolean }

// POST /api/import — Preview or commit a user-scoped data import.
// Multipart fields: file, dryRun=true|false.
export async function POST(request: Request) {
  const ctx = await getAuthContext()
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  const permissionError = await requirePermission(ctx, "data:import")
  if (permissionError) return permissionError

  const formData = await request.formData().catch(() => null)
  if (!formData) {
    return NextResponse.json({ error: "Invalid multipart form data" }, { status: 400 })
  }

  const file = formData.get("file")
  if (!file || typeof file === "string" || typeof file.text !== "function") {
    return NextResponse.json({ error: "Import file is required" }, { status: 400 })
  }

  if (typeof file.size === "number" && file.size > MAX_IMPORT_BYTES) {
    return NextResponse.json({ error: `Import file exceeds ${MAX_IMPORT_BYTES} bytes` }, { status: 413 })
  }

  const dryRun = formData.get("dryRun") !== "false"
  const text = await file.text()
  const payload = parseImportFile(text, "name" in file ? String(file.name || "") : "")
  const validationErrors = validateImportPayload(payload)
  payload.errors.push(...validationErrors)

  if (!dryRun && payload.errors.length > 0) {
    return NextResponse.json({ ...buildImportSummary(payload), dryRun }, { status: 400 })
  }

  try {
    const summary = dryRun
      ? await runImport(ctx, payload, true)
      : await prisma.$transaction((tx) => runImport(ctx, payload, false, tx), { timeout: 30_000 })

    return NextResponse.json(summary, { status: dryRun || summary.errors.length === 0 ? 200 : 400 })
  } catch (error) {
    console.error("Import error:", error)
    return NextResponse.json({ error: "Failed to import data" }, { status: 500 })
  }
}

function validateImportPayload(payload: NormalizedImportPayload): ImportRowError[] {
  const errors: ImportRowError[] = []

  payload.rules.forEach((rule, index) => {
    const parsed = ruleCreateSchema.safeParse(rule)
    if (!parsed.success) {
      errors.push({
        entity: "rules",
        row: index + 1,
        message: parsed.error.issues[0]?.message || "Invalid structured rule",
      })
    }
  })

  payload.paceRules.forEach((rule, index) => {
    const parsed = paceRuleCreateSchema.safeParse(rule)
    if (!parsed.success) {
      errors.push({
        entity: "paceRules",
        row: index + 1,
        message: parsed.error.issues[0]?.message || "Invalid PACE rule",
      })
    }
  })

  payload.spreadsheets.forEach((sheet, index) => {
    const sizeCheck = assertContentSize(sheet.content)
    if (!sizeCheck.ok) {
      errors.push({ entity: "spreadsheets", row: index + 1, message: sizeCheck.error })
      return
    }
    const parsed = spreadsheetCreateSchema.safeParse(sheet)
    if (!parsed.success) {
      errors.push({
        entity: "spreadsheets",
        row: index + 1,
        message: parsed.error.issues[0]?.message || "Invalid spreadsheet",
      })
    }
  })

  return errors
}

async function runImport(
  ctx: AuthContext,
  payload: NormalizedImportPayload,
  dryRun: boolean,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<ImportRunSummary> {
  const counts = emptyImportCounts()
  const warnings = [...payload.warnings]
  const errors = [...payload.errors]

  for (const domain of Object.keys(counts) as Array<keyof ImportCounts>) {
    counts[domain].received = payload[domain].length
    counts[domain].errors = errors.filter((error) => error.entity === domain).length
  }

  if (errors.length > 0) {
    return { detectedFormat: payload.detectedFormat, counts, warnings, errors, dryRun }
  }

  const [
    existingAccounts,
    existingTags,
    existingTransactions,
    existingBills,
    existingBudgets,
    existingGoals,
    existingRules,
    existingPACERules,
    existingSpreadsheets,
  ] = await Promise.all([
    tx.bankAccount.findMany({ where: scopeFilter(ctx), include: { bank: true } }),
    tx.tag.findMany({ where: scopeFilter(ctx) }),
    tx.transaction.findMany({ where: scopeFilter(ctx), select: { accountId: true, date: true, type: true, amount: true, description: true } }),
    tx.bill.findMany({ where: scopeFilter(ctx), select: { accountId: true, name: true, amount: true, dueDay: true, frequency: true } }),
    tx.budget.findMany({ where: scopeFilter(ctx), select: { tag: true } }),
    tx.financialGoal.findMany({ where: scopeFilter(ctx), select: { accountId: true, name: true, targetAmount: true, targetMode: true, deadline: true, category: true } }),
    tx.rule.findMany({ where: scopeFilter(ctx), select: { name: true, filters: true, addTagSlugs: true, priority: true } }),
    tx.pACERule.findMany({ where: scopeFilter(ctx), select: { pattern: true, matchField: true, tag: true, priority: true } }),
    tx.spreadsheetDocument.findMany({ where: scopeFilter(ctx), select: { name: true, sheetType: true, linkedEntity: true, content: true } }),
  ])

  const accountIdBySource = new Map<string, string>()
  const accountIdByImportKey = new Map<string, string>()
  const existingAccountIds = new Set(existingAccounts.map((account) => account.id))

  for (const account of existingAccounts) {
    accountIdByImportKey.set(accountImportKey({
      name: account.cardName,
      type: account.accountType as ImportAccount["type"],
      institution: account.bank.name,
      iban: account.iban,
      currency: account.currency,
    }), account.id)
  }

  const existingTagSlugs = new Set(existingTags.map((tag) => normalizeTagSlug(tag.slug)))
  const transactionKeys = new Set(existingTransactions.map((transaction) => transactionImportKey({
    accountId: transaction.accountId,
    date: transaction.date.toISOString().slice(0, 10),
    type: transaction.type as "in" | "out",
    amount: Number(transaction.amount),
    description: transaction.description,
  })))
  const billKeys = new Set(existingBills.map((bill) => billImportKey({
    accountId: bill.accountId,
    name: bill.name,
    amount: Number(bill.amount),
    dueDay: bill.dueDay,
    frequency: bill.frequency,
  })))
  const budgetKeys = new Set(existingBudgets.map((budget) => budgetImportKey({ tag: budget.tag })))
  const goalKeys = new Set(existingGoals.map((goal) => goalImportKey({
    accountId: goal.accountId,
    name: goal.name,
    targetAmount: Number(goal.targetAmount),
    targetMode: goal.targetMode === "additional" ? "additional" : "total",
    deadline: goal.deadline?.toISOString().slice(0, 10) || null,
    category: goal.category,
  })))
  const ruleKeys = new Set(existingRules.map((rule) => ruleImportKey({
    name: rule.name,
    filters: rule.filters as unknown[],
    addTagSlugs: rule.addTagSlugs,
    priority: rule.priority,
  })))
  const paceRuleKeys = new Set(existingPACERules.map((rule) => paceRuleImportKey(rule)))
  const spreadsheetKeys = new Set(existingSpreadsheets.map((sheet) => spreadsheetImportKey(sheet)))

  const ensureBank = async (name: string) => {
    if (dryRun) return { id: `dry-bank:${name}` }
    return tx.bank.upsert({
      where: { name },
      create: { name },
      update: {},
      select: { id: true },
    })
  }

  const createOrResolveAccount = async (account: ImportAccount, sourceId?: string) => {
    if (sourceId && accountIdBySource.has(sourceId)) return accountIdBySource.get(sourceId)!
    if (sourceId && existingAccountIds.has(sourceId)) {
      counts.accounts.skipped++
      accountIdBySource.set(sourceId, sourceId)
      return sourceId
    }

    const key = accountImportKey(account)
    const existing = accountIdByImportKey.get(key)
    if (existing) {
      counts.accounts.skipped++
      if (sourceId) accountIdBySource.set(sourceId, existing)
      return existing
    }

    counts.accounts.created++
    const nextId = dryRun
      ? `dry-account:${sourceId || key}`
      : await createAccount(account, await ensureBank(account.institution))
    accountIdByImportKey.set(key, nextId)
    if (sourceId) accountIdBySource.set(sourceId, nextId)
    return nextId
  }

  const createAccount = async (account: ImportAccount, bank: { id: string }) => {
    const created = await tx.bankAccount.create({
      data: {
        ...scopeCreateData(ctx),
        connectionId: null,
        saltEdgeAccountId: null,
        bankId: bank.id,
        accountType: account.type,
        cardName: account.name,
        balance: account.balance,
        currency: account.currency.toUpperCase(),
        iban: normalizeIban(account.iban) || null,
        color: account.color,
        isActive: account.isActive,
      },
      select: { id: true },
    })
    return created.id
  }

  const placeholderAccount = async (sourceId: string) => {
    return createOrResolveAccount({
      id: sourceId,
      name: `Imported Account ${sourceId}`.slice(0, 200),
      type: "checking",
      institution: "Imported",
      balance: 0,
      iban: null,
      currency: "EUR",
      color: "#64748b",
      isActive: true,
    }, sourceId)
  }

  const resolveAccountId = async (sourceId: string) => {
    if (accountIdBySource.has(sourceId)) return accountIdBySource.get(sourceId)!
    if (existingAccountIds.has(sourceId)) {
      accountIdBySource.set(sourceId, sourceId)
      return sourceId
    }
    return placeholderAccount(sourceId)
  }

  for (const account of payload.accounts) {
    await createOrResolveAccount(account, account.id)
  }

  const inferredTags = inferMissingTags(payload)
  counts.tags.received = payload.tags.length + inferredTags.length
  for (const tag of [...payload.tags, ...inferredTags]) {
    await createTag(tag, counts, existingTagSlugs, ctx, dryRun, tx)
  }

  for (const budget of payload.budgets) {
    const tag = normalizeTagSlug(budget.tag)
    const key = budgetImportKey({ tag })
    if (budgetKeys.has(key)) {
      counts.budgets.skipped++
      continue
    }
    counts.budgets.created++
    budgetKeys.add(key)
    if (!dryRun) {
      await tx.budget.create({
        data: {
          ...scopeCreateData(ctx),
          tag,
          category: budget.category,
          limit: budget.limit,
          color: budget.color,
        },
      })
    }
  }

  for (const transaction of payload.transactions) {
    const accountId = await resolveAccountId(transaction.accountId)
    const key = transactionImportKey({ ...transaction, accountId })
    if (transactionKeys.has(key)) {
      counts.transactions.skipped++
      continue
    }
    counts.transactions.created++
    transactionKeys.add(key)
    if (!dryRun) {
      await tx.transaction.create({
        data: {
          ...scopeCreateData(ctx),
          date: new Date(`${transaction.date}T00:00:00.000Z`),
          type: transaction.type,
          amount: transaction.amount,
          description: transaction.description,
          tags: transaction.tags.map(normalizeTagSlug).filter(Boolean),
          accountId,
        },
      })
    }
  }

  for (const bill of payload.bills) {
    const accountId = await resolveAccountId(bill.accountId)
    const key = billImportKey({ ...bill, accountId })
    if (billKeys.has(key)) {
      counts.bills.skipped++
      continue
    }
    counts.bills.created++
    billKeys.add(key)
    if (!dryRun) {
      await tx.bill.create({
        data: {
          ...scopeCreateData(ctx),
          name: bill.name,
          amount: bill.amount,
          tags: bill.tags.map(normalizeTagSlug).filter(Boolean),
          dueDay: bill.dueDay,
          frequency: bill.frequency,
          accountId,
          category: bill.category,
          autopay: bill.autopay,
          status: bill.status,
        },
      })
    }
  }

  for (const goal of payload.goals) {
    const key = goalImportKey(goal)
    if (goalKeys.has(key)) {
      counts.goals.skipped++
      continue
    }
    counts.goals.created++
    goalKeys.add(key)
    if (!dryRun) {
      const accountId = goal.accountId ? await resolveAccountId(goal.accountId) : null
      const created = await tx.financialGoal.create({
        data: {
          ...scopeCreateData(ctx),
          accountId,
          name: goal.name,
          targetAmount: goal.targetAmount,
          currentAmount: goal.currentAmount,
          baselineAmount: goal.targetMode === "additional" ? goal.baselineAmount : 0,
          targetMode: goal.targetMode,
          deadline: goal.deadline ? new Date(`${goal.deadline}T00:00:00.000Z`) : null,
          category: goal.category,
          color: goal.color,
          status: goal.status,
        },
        select: { id: true },
      })
      await tx.financialGoalAccount.create({
        data: {
          ...scopeCreateData(ctx),
          goalId: created.id,
          name: goalAccountName(goal.name),
          balance: goal.currentAmount,
          currency: goal.currency,
          status: goal.status === "cancelled" ? "cancelled" : "active",
          transferReference: goalTransferReference(created.id),
        },
      })
    }
  }

  for (const rule of payload.rules) {
    const key = ruleImportKey(rule)
    if (ruleKeys.has(key)) {
      counts.rules.skipped++
      continue
    }
    counts.rules.created++
    ruleKeys.add(key)
    if (!dryRun) {
      await tx.rule.create({
        data: {
          ...scopeCreateData(ctx),
          name: rule.name,
          enabled: rule.enabled,
          filters: rule.filters as Prisma.InputJsonValue,
          addTagSlugs: rule.addTagSlugs.map(normalizeTagSlug).filter(Boolean),
          priority: rule.priority,
        },
      })
    }
  }

  for (const rule of payload.paceRules) {
    const key = paceRuleImportKey(rule)
    if (paceRuleKeys.has(key)) {
      counts.paceRules.skipped++
      continue
    }
    counts.paceRules.created++
    paceRuleKeys.add(key)
    if (!dryRun) {
      await tx.pACERule.create({
        data: {
          ...scopeCreateData(ctx),
          pattern: rule.pattern,
          matchField: rule.matchField,
          tag: normalizeTagSlug(rule.tag),
          priority: rule.priority,
        },
      })
    }
  }

  for (const sheet of payload.spreadsheets) {
    const key = spreadsheetImportKey(sheet)
    if (spreadsheetKeys.has(key)) {
      counts.spreadsheets.skipped++
      continue
    }
    counts.spreadsheets.created++
    spreadsheetKeys.add(key)
    if (!dryRun) {
      await tx.spreadsheetDocument.create({
        data: {
          ...scopeCreateData(ctx),
          name: sheet.name,
          description: sheet.description,
          sheetType: sheet.sheetType,
          linkedEntity: sheet.linkedEntity,
          content: sheet.content as Prisma.InputJsonValue,
        },
      })
    }
  }

  return {
    detectedFormat: payload.detectedFormat,
    counts,
    warnings,
    errors,
    dryRun,
  }
}

async function createTag(
  tag: ImportTag,
  counts: ImportCounts,
  existingTagSlugs: Set<string>,
  ctx: AuthContext,
  dryRun: boolean,
  tx: Prisma.TransactionClient | typeof prisma,
) {
  const slug = normalizeTagSlug(tag.slug)
  if (!slug) return
  if (existingTagSlugs.has(slug)) {
    counts.tags.skipped++
    return
  }
  counts.tags.created++
  existingTagSlugs.add(slug)
  if (!dryRun) {
    await tx.tag.create({
      data: {
        ...scopeCreateData(ctx),
        slug,
        name: tag.name || titleFromSlug(slug),
        color: tag.color || "#6366f1",
        icon: tag.icon || "tag",
        isSystem: tag.isSystem,
        isArchived: tag.isArchived,
      },
    })
  }
}
