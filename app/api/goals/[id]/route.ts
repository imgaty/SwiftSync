import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth-helpers"

// PUT /api/goals/[id] — Update a financial goal
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()

  const existing = await prisma.financialGoal.findFirst({ where: { id, userId } })
  if (!existing) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 })
  }

  // Check if goal is being completed
  const newCurrentAmount = body.currentAmount !== undefined ? body.currentAmount : Number(existing.currentAmount)
  const targetAmount = body.targetAmount !== undefined ? body.targetAmount : Number(existing.targetAmount)
  const autoStatus = newCurrentAmount >= targetAmount ? "completed" : (body.status || existing.status)

  const updated = await prisma.financialGoal.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.targetAmount !== undefined && { targetAmount: body.targetAmount }),
      ...(body.currentAmount !== undefined && { currentAmount: body.currentAmount }),
      ...(body.deadline !== undefined && { deadline: body.deadline ? new Date(body.deadline) : null }),
      ...(body.category && { category: body.category }),
      ...(body.color && { color: body.color }),
      status: autoStatus,
    },
  })

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
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { id } = await params
  const existing = await prisma.financialGoal.findFirst({ where: { id, userId } })
  if (!existing) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 })
  }

  await prisma.financialGoal.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
