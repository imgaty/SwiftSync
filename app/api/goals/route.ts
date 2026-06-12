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
import { formatGoal, goalAccountName, goalProgressSnapshot, goalStatusForProgress, goalTransferReference } from "@/lib/goal-account"

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
      bankAccount: { include: { bank: true } },
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
  const accountId = typeof body.accountId === "string" ? body.accountId.trim() : ""
  const targetMode = body.targetMode === "additional" ? "additional" : "total"

  if (body.targetMode !== undefined && body.targetMode !== "total" && body.targetMode !== "additional") {
    return NextResponse.json({ error: "Invalid target mode" }, { status: 400 })
  }

  if (!accountId) {
    return NextResponse.json({ error: "A linked bank account is required" }, { status: 400 })
  }

  const bankAccount = await prisma.bankAccount.findFirst({
    where: { ...scopeFilter(ctx), id: accountId },
    select: { id: true, balance: true, currency: true },
  })
  if (!bankAccount) {
    return NextResponse.json({ error: "Account not found" }, { status: 400 })
  }

  const initialAmount = body.currentAmount !== undefined ? Number(body.currentAmount) : Number(bankAccount.balance)
  const currency = typeof body.currency === "string" && body.currency.trim().length > 0
    ? body.currency.trim().toUpperCase()
    : bankAccount.currency

  if (!goalName || !Number.isFinite(parsedTargetAmount) || parsedTargetAmount <= 0) {
    return NextResponse.json({ error: "Name and target amount are required" }, { status: 400 })
  }

  if (!Number.isFinite(initialAmount) || initialAmount < 0) {
    return NextResponse.json({ error: "Current amount must be a valid non-negative number" }, { status: 400 })
  }

  const requestedBaselineAmount = body.baselineAmount !== undefined ? Number(body.baselineAmount) : initialAmount
  if (!Number.isFinite(requestedBaselineAmount) || requestedBaselineAmount < 0) {
    return NextResponse.json({ error: "Baseline amount must be a valid non-negative number" }, { status: 400 })
  }

  const baselineAmount = targetMode === "additional" ? requestedBaselineAmount : 0
  const progress = goalProgressSnapshot({
    targetAmount: parsedTargetAmount,
    currentAmount: initialAmount,
    baselineAmount,
    targetMode,
  })
  const nextStatus = goalStatusForProgress("active", progress.progressAmount, progress.targetAmount)

  const goal = await prisma.$transaction(async (tx) => {
    const created = await tx.financialGoal.create({
      data: {
        ...scopeCreateData(ctx),
        accountId: bankAccount.id,
        name: goalName,
        targetAmount: parsedTargetAmount,
        currentAmount: initialAmount,
        baselineAmount,
        targetMode,
        deadline: deadline ? new Date(deadline) : null,
        category: category || "savings",
        color: color || "#6366f1",
        status: nextStatus,
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

    if (nextStatus === "completed") {
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
        bankAccount: { include: { bank: true } },
      },
    })
  })

  return NextResponse.json(formatGoal(goal), { status: 201 })
}
