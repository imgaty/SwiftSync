import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth-helpers"
import { autoCategorize, DEFAULT_RULES, mergeRules } from "@/lib/auto-categorize"

// GET /api/transactions — List all transactions for the authenticated user
export async function GET() {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const transactions = await prisma.transaction.findMany({
    where: { userId },
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
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const body = await request.json()
  const { date, type, amount, description, tags, accountId, autoTag } = body

  if (!date || !type || !amount || !description || !accountId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  // Auto-categorize if requested or if no tags provided
  let finalTags = tags || []
  if (autoTag || finalTags.length === 0) {
    const userRules = await prisma.categorizationRule.findMany({
      where: { userId },
      orderBy: { priority: "desc" },
    })
    const rules = mergeRules(
      userRules.map((r) => ({ pattern: r.pattern, matchField: r.matchField, tag: r.tag, priority: r.priority })),
      DEFAULT_RULES
    )
    const autoTags = autoCategorize(description, rules)
    finalTags = autoTags.length > 0 ? autoTags : (tags || ["other"])
  }

  const transaction = await prisma.transaction.create({
    data: {
      userId,
      date: new Date(date),
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
