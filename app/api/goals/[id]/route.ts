//
//  route.ts
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Handles the /api/goals/[id] API endpoint for Argent, keeping request parsing, business
//  operations, and response formatting at the route boundary.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext } from "@/lib/auth-helpers"
import { scopeCreateData, scopeFilter, scopeRecordFilter, requirePermission } from "@/lib/data-access"
import { formatGoal, goalAccountName, goalProgressSnapshot, goalStatusForProgress, goalTransferReference, normalizeGoalTargetMode, toAmount } from "@/lib/goal-account"

// PUT /api/goals/[id] — Update a financial goal
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthContext()
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  const permissionError = await requirePermission(ctx, "data:write")
  if (permissionError) return permissionError

  const { id } = await params
  const body = await request.json()

  const existing = await prisma.financialGoal.findFirst({
    where: scopeRecordFilter(ctx, id),
    include: {
      accountLinks: { orderBy: { createdAt: "asc" } },
      bankAccount: { include: { bank: true } },
    },
  })
  if (!existing) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 })
  }

  const currentAmountWasProvided = body.currentAmount !== undefined
  const accountCurrentAmount = existing.accountLinks.length > 0
    ? existing.accountLinks.reduce((sum, account) => sum + toAmount(account.balance), 0)
    : toAmount(existing.currentAmount)
  const nextName = typeof body.name === "string" ? body.name.trim() : undefined
  const currentTargetMode = normalizeGoalTargetMode(existing.targetMode)
  const requestedTargetMode = body.targetMode
  if (requestedTargetMode !== undefined && requestedTargetMode !== "total" && requestedTargetMode !== "additional") {
    return NextResponse.json({ error: "Invalid target mode" }, { status: 400 })
  }
  const nextTargetMode = requestedTargetMode === undefined ? currentTargetMode : requestedTargetMode
  const accountIdWasProvided = body.accountId !== undefined
  if (accountIdWasProvided && typeof body.accountId !== "string") {
    return NextResponse.json({ error: "A linked bank account is required" }, { status: 400 })
  }
  const nextAccountId = accountIdWasProvided && typeof body.accountId === "string"
    ? body.accountId.trim()
    : existing.accountId

  if (accountIdWasProvided && !nextAccountId) {
    return NextResponse.json({ error: "A linked bank account is required" }, { status: 400 })
  }

  let nextBankAccount = existing.bankAccount
    ? { id: existing.bankAccount.id, currency: existing.bankAccount.currency }
    : null
  if (accountIdWasProvided && nextAccountId) {
    nextBankAccount = await prisma.bankAccount.findFirst({
      where: { ...scopeFilter(ctx), id: nextAccountId },
      select: { id: true, currency: true },
    })
    if (!nextBankAccount) {
      return NextResponse.json({ error: "Account not found" }, { status: 400 })
    }
  }

  const isGoalDetailsUpdate = body.name !== undefined
    || body.targetAmount !== undefined
    || body.deadline !== undefined
    || body.category !== undefined
    || body.color !== undefined
    || body.targetMode !== undefined
    || body.accountId !== undefined
  if (isGoalDetailsUpdate && !nextAccountId) {
    return NextResponse.json({ error: "A linked bank account is required" }, { status: 400 })
  }

  const newCurrentAmount = currentAmountWasProvided
    ? Number(body.currentAmount)
    : accountCurrentAmount
  const targetAmount = body.targetAmount !== undefined ? Number(body.targetAmount) : Number(existing.targetAmount)

  if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
    return NextResponse.json({ error: "Target amount must be greater than zero" }, { status: 400 })
  }

  if (!Number.isFinite(newCurrentAmount) || newCurrentAmount < 0) {
    return NextResponse.json({ error: "Current amount must be a valid non-negative number" }, { status: 400 })
  }

  const requestedStatus = typeof body.status === "string" ? body.status : undefined
  if (requestedStatus && !["active", "completed", "cancelled"].includes(requestedStatus)) {
    return NextResponse.json({ error: "Invalid goal status" }, { status: 400 })
  }

  const accountChanged = accountIdWasProvided && nextAccountId !== existing.accountId
  const baselineWasProvided = body.baselineAmount !== undefined
  const requestedBaselineAmount = Number(body.baselineAmount)
  if (baselineWasProvided && (!Number.isFinite(requestedBaselineAmount) || requestedBaselineAmount < 0)) {
    return NextResponse.json({ error: "Baseline amount must be a valid non-negative number" }, { status: 400 })
  }
  const baselineAmount = nextTargetMode === "additional"
    ? (baselineWasProvided
        ? requestedBaselineAmount
        : currentTargetMode !== "additional" || accountChanged
          ? newCurrentAmount
          : toAmount(existing.baselineAmount))
    : 0
  const progress = goalProgressSnapshot({
    targetAmount,
    currentAmount: newCurrentAmount,
    baselineAmount,
    targetMode: nextTargetMode,
  })
  const keepCancelled = requestedStatus === "cancelled" || (existing.status === "cancelled" && requestedStatus === undefined)
  const nextStatus = goalStatusForProgress(keepCancelled ? "cancelled" : "active", progress.progressAmount, progress.targetAmount)
  const shouldNotifyReached = existing.status !== "completed" && nextStatus === "completed"

  const updated = await prisma.$transaction(async (tx) => {
    const { count } = await tx.financialGoal.updateMany({
      where: scopeRecordFilter(ctx, id),
      data: {
        ...(nextName && { name: nextName }),
        ...(accountIdWasProvided && { accountId: nextAccountId }),
        ...(body.targetAmount !== undefined && { targetAmount }),
        currentAmount: newCurrentAmount,
        baselineAmount,
        targetMode: nextTargetMode,
        ...(body.deadline !== undefined && { deadline: body.deadline ? new Date(body.deadline) : null }),
        ...(body.category && { category: body.category }),
        ...(body.color && { color: body.color }),
        status: nextStatus,
      },
    })
    if (count === 0) return null

    await tx.financialGoalAccount.upsert({
      where: { goalId: id },
      update: {
        ...(nextName && { name: goalAccountName(nextName) }),
        ...(currentAmountWasProvided && { balance: newCurrentAmount }),
        ...(accountIdWasProvided && nextBankAccount && { currency: nextBankAccount.currency }),
        status: nextStatus === "cancelled" ? "cancelled" : "active",
      },
      create: {
        ...scopeCreateData(ctx),
        goalId: id,
        name: goalAccountName(nextName || existing.name),
        balance: newCurrentAmount,
        currency: nextBankAccount?.currency || existing.accountLinks[0]?.currency || "EUR",
        status: nextStatus === "cancelled" ? "cancelled" : "active",
        transferReference: goalTransferReference(id),
      },
    })

    const goal = await tx.financialGoal.findFirstOrThrow({
      where: scopeRecordFilter(ctx, id),
      include: {
        accountLinks: { orderBy: { createdAt: "asc" } },
        bankAccount: { include: { bank: true } },
      },
    })

    if (shouldNotifyReached) {
      await tx.notification.create({
        data: {
          ...scopeCreateData(ctx),
          title: `Meta "${goal.name}" atingida!`,
          message: `Parabéns! Atingiu a sua meta de €${Number(goal.targetAmount).toFixed(2)} para "${goal.name}".`,
          type: "goal_reached",
          actionUrl: "/Goals",
        },
      })
    }

    return goal
  })
  if (!updated) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 })
  }

  return NextResponse.json(formatGoal(updated))
}

// DELETE /api/goals/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthContext()
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  const permissionError = await requirePermission(ctx, "data:delete")
  if (permissionError) return permissionError

  const { id } = await params
  const { count } = await prisma.financialGoal.deleteMany({ where: scopeRecordFilter(ctx, id) })
  if (count === 0) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
