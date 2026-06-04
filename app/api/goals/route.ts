//
//  route.ts
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Handles the /api/goals API endpoint for Argent, keeping request parsing, business
//  operations, and response formatting at the route boundary.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext } from "@/lib/auth-helpers"
import { scopeFilter, scopeCreateData, requirePermission } from "@/lib/data-access"
import { formatGoal, goalAccountName, goalTransferReference } from "@/lib/goal-account"

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
    include: {
      accountLinks: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  })

  const formatted = goals.map(formatGoal)

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
  const { name, targetAmount, deadline, category, color } = body
  const goalName = typeof name === "string" ? name.trim() : ""
  const parsedTargetAmount = Number(targetAmount)
  const initialAmount = body.currentAmount !== undefined ? Number(body.currentAmount) : 0
  const currency = typeof body.currency === "string" && body.currency.trim().length > 0
    ? body.currency.trim().toUpperCase()
    : "EUR"

  if (!goalName || !Number.isFinite(parsedTargetAmount) || parsedTargetAmount <= 0) {
    return NextResponse.json({ error: "Name and target amount are required" }, { status: 400 })
  }

  if (!Number.isFinite(initialAmount) || initialAmount < 0) {
    return NextResponse.json({ error: "Current amount must be a valid non-negative number" }, { status: 400 })
  }

  const goal = await prisma.$transaction(async (tx) => {
    const created = await tx.financialGoal.create({
      data: {
        ...scopeCreateData(ctx),
        name: goalName,
        targetAmount: parsedTargetAmount,
        currentAmount: initialAmount,
        deadline: deadline ? new Date(deadline) : null,
        category: category || "savings",
        color: color || "#6366f1",
        status: initialAmount >= parsedTargetAmount ? "completed" : "active",
      },
    })

    await tx.financialGoalAccount.create({
      data: {
        ...scopeCreateData(ctx),
        goalId: created.id,
        name: goalAccountName(goalName),
        balance: initialAmount,
        currency,
        transferReference: goalTransferReference(created.id),
      },
    })

    if (initialAmount >= parsedTargetAmount) {
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

    return tx.financialGoal.findFirstOrThrow({
      where: { id: created.id, ...scopeFilter(ctx) },
      include: {
        accountLinks: { orderBy: { createdAt: "asc" } },
      },
    })
  })

  return NextResponse.json(formatGoal(goal), { status: 201 })
}
