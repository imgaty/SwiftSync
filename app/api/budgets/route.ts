//
//  route.ts
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Handles the /api/budgets API endpoint for Argent, keeping request parsing, business
//  operations, and response formatting at the route boundary.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext } from "@/lib/auth-helpers"
import { scopeFilter, scopeCreateData, requirePermission } from "@/lib/data-access"

// GET /api/budgets — List all budgets
export async function GET() {
  const ctx = await getAuthContext()
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  const permissionError = await requirePermission(ctx, "data:read")
  if (permissionError) return permissionError

  const budgets = await prisma.budget.findMany({
    where: scopeFilter(ctx),
    orderBy: { category: "asc" },
  })

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const monthLabel = monthStart.toLocaleString("en-US", { month: "long" })
  const year = monthStart.getFullYear()

  const budgetTags = [...new Set(budgets.map((b) => b.tag).filter(Boolean))]
  const spentByTag = new Map<string, number>()

  if (budgetTags.length > 0) {
    const transactions = await prisma.transaction.findMany({
      where: {
        ...scopeFilter(ctx),
        type: "out",
        date: { gte: monthStart, lt: nextMonthStart },
        tags: { hasSome: budgetTags },
      },
      select: { amount: true, tags: true },
    })

    for (const tx of transactions) {
      for (const tag of tx.tags) {
        if (!budgetTags.includes(tag)) continue
        spentByTag.set(tag, (spentByTag.get(tag) || 0) + Number(tx.amount))
      }
    }
  }

  const formatted = budgets.map((b) => ({
    ...formatBudget(b, spentByTag.get(b.tag) || 0, monthLabel, year),
  }))

  return NextResponse.json(formatted)
}

// POST /api/budgets — Create a new budget
export async function POST(request: Request) {
  const ctx = await getAuthContext()
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  const permissionError = await requirePermission(ctx, "data:write")
  if (permissionError) return permissionError

  const body = await request.json()
  const { tag, category, limit, color } = body
  const parsedLimit = Number(limit)

  if (!tag || !category || !Number.isFinite(parsedLimit) || parsedLimit <= 0) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const budget = await prisma.budget.create({
    data: {
      ...scopeCreateData(ctx),
      tag,
      category,
      limit: parsedLimit,
      color: color || "#6366f1",
    },
  })

  const now = new Date()
  const monthLabel = now.toLocaleString("en-US", { month: "long" })

  return NextResponse.json(formatBudget(budget, 0, monthLabel, now.getFullYear()), { status: 201 })
}

function formatBudget(
  budget: {
    id: string
    tag: string
    category: string
    limit: unknown
    color: string
  },
  spentAmount: number,
  month: string,
  year: number
) {
  const budgetAmount = Number(budget.limit)
  const remainingAmount = budgetAmount - spentAmount
  const percentUsed = budgetAmount > 0 ? Math.round((spentAmount / budgetAmount) * 100) : 0
  const status = percentUsed >= 100 ? "over_budget" : percentUsed >= 80 ? "warning" : "on_track"

  return {
    id: budget.id,
    tag: budget.tag,
    category: budget.category,
    limit: budgetAmount,
    budgetAmount,
    spentAmount,
    remainingAmount,
    percentUsed,
    status,
    color: budget.color,
    month,
    year,
  }
}
