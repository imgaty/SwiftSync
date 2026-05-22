import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext } from "@/lib/auth-helpers"
import { scopeFilter, scopeCreateData, requirePermission } from "@/lib/data-access"

// GET /api/goals — List all financial goals
export async function GET() {
  const ctx = await getAuthContext()
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  const permissionError = await requirePermission(ctx, "data:read")
  if (permissionError) return permissionError

  const goals = await prisma.financialGoal.findMany({
    where: scopeFilter(ctx),
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
  const ctx = await getAuthContext()
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  const permissionError = await requirePermission(ctx, "data:write")
  if (permissionError) return permissionError

  const body = await request.json()
  const { name, targetAmount, currentAmount, deadline, category, color } = body
  const parsedTargetAmount = Number(targetAmount)
  const parsedCurrentAmount = currentAmount === undefined || currentAmount === null || currentAmount === ""
    ? 0
    : Number(currentAmount)

  if (!name || !Number.isFinite(parsedTargetAmount) || parsedTargetAmount <= 0) {
    return NextResponse.json({ error: "Name and target amount are required" }, { status: 400 })
  }

  if (!Number.isFinite(parsedCurrentAmount) || parsedCurrentAmount < 0) {
    return NextResponse.json({ error: "Current amount must be a valid non-negative number" }, { status: 400 })
  }

  const goal = await prisma.$transaction(async (tx) => {
    const created = await tx.financialGoal.create({
      data: {
        ...scopeCreateData(ctx),
        name,
        targetAmount: parsedTargetAmount,
        currentAmount: parsedCurrentAmount,
        deadline: deadline ? new Date(deadline) : null,
        category: category || "savings",
        color: color || "#6366f1",
        status: parsedCurrentAmount >= parsedTargetAmount ? "completed" : "active",
      },
    })

    if (parsedCurrentAmount >= parsedTargetAmount) {
      await tx.notification.create({
        data: {
          ...scopeCreateData(ctx),
          title: `Meta "${created.name}" atingida!`,
          message: `Parabéns! Atingiu a sua meta de €${Number(created.targetAmount).toFixed(2)} para "${created.name}".`,
          type: "goal_reached",
          actionUrl: "/Goals",
        },
      })
    }

    return created
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
    percentage: Number(goal.targetAmount) > 0
      ? Math.round((Number(goal.currentAmount) / Number(goal.targetAmount)) * 100)
      : 0,
    createdAt: goal.createdAt.toISOString(),
  }, { status: 201 })
}
