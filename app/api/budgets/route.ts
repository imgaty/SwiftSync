import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth-helpers"

// GET /api/budgets — List all budgets
export async function GET() {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const budgets = await prisma.budget.findMany({
    where: { userId },
    orderBy: { category: "asc" },
  })

  const formatted = budgets.map((b) => ({
    id: b.id,
    tag: b.tag,
    category: b.category,
    limit: Number(b.limit),
    budgetAmount: Number(b.limit), // alias for frontend compatibility
    color: b.color,
  }))

  return NextResponse.json(formatted)
}

// POST /api/budgets — Create a new budget
export async function POST(request: Request) {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const body = await request.json()
  const { tag, category, limit, color } = body

  if (!tag || !category || !limit) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const budget = await prisma.budget.create({
    data: {
      userId,
      tag,
      category,
      limit,
      color: color || "#6366f1",
    },
  })

  return NextResponse.json({
    id: budget.id,
    tag: budget.tag,
    category: budget.category,
    limit: Number(budget.limit),
    budgetAmount: Number(budget.limit),
    color: budget.color,
  }, { status: 201 })
}
