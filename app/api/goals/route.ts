import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth-helpers"

// GET /api/goals — List all financial goals
export async function GET() {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const goals = await prisma.financialGoal.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  })

  const formatted = goals.map((g) => ({
    id: g.id,
    name: g.name,
    targetAmount: Number(g.targetAmount),
    currentAmount: Number(g.currentAmount),
    deadline: g.deadline?.toISOString().slice(0, 10) || null,
    category: g.category,
    color: g.color,
    status: g.status,
    percentage: Number(g.targetAmount) > 0
      ? Math.round((Number(g.currentAmount) / Number(g.targetAmount)) * 100)
      : 0,
    createdAt: g.createdAt.toISOString(),
  }))

  return NextResponse.json(formatted)
}

// POST /api/goals — Create a new financial goal
export async function POST(request: Request) {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const body = await request.json()
  const { name, targetAmount, currentAmount, deadline, category, color } = body

  if (!name || !targetAmount) {
    return NextResponse.json({ error: "Name and target amount are required" }, { status: 400 })
  }

  const goal = await prisma.financialGoal.create({
    data: {
      userId,
      name,
      targetAmount,
      currentAmount: currentAmount || 0,
      deadline: deadline ? new Date(deadline) : null,
      category: category || "savings",
      color: color || "#6366f1",
    },
  })

  return NextResponse.json({
    id: goal.id,
    name: goal.name,
    targetAmount: Number(goal.targetAmount),
    currentAmount: Number(goal.currentAmount),
    deadline: goal.deadline?.toISOString().slice(0, 10) || null,
    category: goal.category,
    color: goal.color,
    status: goal.status,
    percentage: 0,
    createdAt: goal.createdAt.toISOString(),
  }, { status: 201 })
}
