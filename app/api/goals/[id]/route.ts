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
import { scopeCreateData, scopeRecordFilter, requirePermission } from "@/lib/data-access"

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
    select: { name: true, currentAmount: true, targetAmount: true, status: true },
  })
  if (!existing) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 })
  }

  const newCurrentAmount = body.currentAmount !== undefined ? Number(body.currentAmount) : Number(existing.currentAmount)
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

  const keepCancelled = requestedStatus === "cancelled" || (existing.status === "cancelled" && requestedStatus === undefined)
  const nextStatus = keepCancelled ? "cancelled" : newCurrentAmount >= targetAmount ? "completed" : "active"
  const shouldNotifyReached = existing.status !== "completed" && nextStatus === "completed"

  const updated = await prisma.$transaction(async (tx) => {
    const { count } = await tx.financialGoal.updateMany({
      where: scopeRecordFilter(ctx, id),
      data: {
        ...(body.name && { name: body.name }),
        ...(body.targetAmount !== undefined && { targetAmount }),
        ...(body.currentAmount !== undefined && { currentAmount: newCurrentAmount }),
        ...(body.deadline !== undefined && { deadline: body.deadline ? new Date(body.deadline) : null }),
        ...(body.category && { category: body.category }),
        ...(body.color && { color: body.color }),
        status: nextStatus,
      },
    })
    if (count === 0) return null

    const goal = await tx.financialGoal.findFirstOrThrow({ where: scopeRecordFilter(ctx, id) })

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

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    targetAmount: Number(updated.targetAmount),
    currentAmount: Number(updated.currentAmount),
    deadline: updated.deadline?.toISOString().slice(0, 10) || null,
    category: updated.category,
    color: updated.color,
    status: updated.status,
    percentage: Number(updated.targetAmount) > 0
      ? Math.round((Number(updated.currentAmount) / Number(updated.targetAmount)) * 100)
      : 0,
  })
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
