//
//  route.ts
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Handles the /api/transactions API endpoint for Argent, keeping request parsing, business
//  operations, and response formatting at the route boundary.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
/* Transactions collection endpoint.
 *
 * GET lists transactions in the caller's scope; POST creates one and runs
 * PACE auto-tagging when no tags are supplied or when the client opts in.
 *
 * Learn more in `docs/Financial Features.md` and `docs/PACE Engine.md`
 */

import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getAuthContext } from "@/lib/auth-helpers"
import { scopeFilter, scopeCreateData, requirePermission } from "@/lib/data-access"
import { runPACE, PACE_DEFAULT_RULES, mergePACERules } from "@/lib/PACE"
import { runUserRules, loadAvailableTags, categorizeWithEmbedding } from "@/lib/PACE.server"

const transactionCreateSchema = z.object({
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`)
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
  }, "Invalid date"),
  type: z.enum(["in", "out"]),
  amount: z.coerce.number().finite().positive(),
  description: z.string().trim().min(1).max(500),
  tags: z.array(z.string().trim().min(1).max(64)).max(25).optional(),
  accountId: z.string().trim().min(1),
  usePACE: z.boolean().optional(),
})

// GET /api/transactions — List all transactions for the authenticated user
export async function GET() {
  const ctx = await getAuthContext()
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  const permissionError = await requirePermission(ctx, "data:read")
  if (permissionError) return permissionError

  const transactions = await prisma.transaction.findMany({
    where: scopeFilter(ctx),
    orderBy: { date: "desc" },
  })

  // Format for frontend compatibility
  const formatted = transactions.map((t) => ({
    id: t.id,
    date: t.date.toISOString().slice(0, 10),
    type: t.type,
    amount: Number(t.amount),
    description: t.description,
    tags: t.tags,
    accountId: t.accountId,
  }))

  return NextResponse.json(formatted)
}

// POST /api/transactions — Create a new transaction
export async function POST(request: Request) {
  const ctx = await getAuthContext()
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  const permissionError = await requirePermission(ctx, "data:write")
  if (permissionError) return permissionError

  const parsed = transactionCreateSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid transaction payload" }, { status: 400 })
  }
  const { date, type, amount, description, tags, accountId, usePACE } = parsed.data

  // Verify the target account belongs to the caller's scope before binding to it.
  const ownsAccount = await prisma.bankAccount.findFirst({
    where: { ...scopeFilter(ctx), id: accountId },
    select: { id: true },
  })
  if (!ownsAccount) {
    return NextResponse.json({ error: "Account not found" }, { status: 400 })
  }

  // Auto-tagging: legacy PACE (regex) + new structured Rule evaluator both
  // contribute additively. PACE only runs if usePACE was set or no tags were
  // supplied (preserves the old gate). The structured evaluator always runs
  // so a user's new-style rules apply to every manual creation.
  let finalTags: string[] = Array.isArray(tags) ? [...tags] : []

  if (usePACE || finalTags.length === 0) {
    const personalRules = await prisma.pACERule.findMany({
      where: { userId: ctx.userId },
      orderBy: { priority: "desc" },
    })
    const rules = mergePACERules(
      personalRules.map((r) => ({ pattern: r.pattern, matchField: r.matchField, tag: r.tag, priority: r.priority })),
      PACE_DEFAULT_RULES
    )
    const matchedTags = runPACE(description, rules)
    if (matchedTags.length > 0) finalTags.push(...matchedTags)
  }

  // Structured Rule evaluator — runs unconditionally so explicitly-tagged
  // transactions can still pick up an "amount > X → big_purchase" style tag.
  // Manual creation has no counterparty, so counterparty-based filters won't
  // match here (by design — encourage description filters for manual entry).
  const ruleTags = await runUserRules(ctx, {
    counterpartyKey: null,
    counterpartyDisplay: null,
    description,
    amount: Math.abs(Number(amount)),
    type: type === "in" ? "in" : "out",
  })
  finalTags.push(...ruleTags)

  finalTags = [...new Set(finalTags)]

  // Embedding fallback — only if no rule matched and the user has tags to
  // match against. No counterparty for manual creates, so we skip the cache
  // write but the model can still match on the description alone.
  if (finalTags.length === 0) {
    const availableTags = await loadAvailableTags(ctx)
    if (availableTags.length > 0) {
      const embResult = await categorizeWithEmbedding(
        { description, counterpartyDisplay: null },
        availableTags,
      )
      if (embResult) finalTags.push(embResult.slug)
    }
  }

  // Last-resort "other" only when truly nothing matched (no rules + no tags
  // to embed against). Will be filtered out by the recategorize sweep next
  // time the user logs in.
  if (finalTags.length === 0) finalTags = ["other"]

  const transaction = await prisma.transaction.create({
    data: {
      ...scopeCreateData(ctx),
      date: new Date(`${date}T00:00:00.000Z`),
      type,
      amount,
      description,
      tags: finalTags,
      accountId,
    },
  })

  return NextResponse.json({
    id: transaction.id,
    date: transaction.date.toISOString().slice(0, 10),
    type: transaction.type,
    amount: Number(transaction.amount),
    description: transaction.description,
    tags: transaction.tags,
    accountId: transaction.accountId,
  }, { status: 201 })
}
