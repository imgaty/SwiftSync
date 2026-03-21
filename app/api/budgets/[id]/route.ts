import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth-helpers"

// PUT /api/budgets/[id]
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

  const existing = await prisma.budget.findFirst({ where: { id, userId } })
  if (!existing) {
    return NextResponse.json({ error: "Budget not found" }, { status: 404 })
  }

  const updated = await prisma.budget.update({
    where: { id },
    data: {
      ...(body.tag && { tag: body.tag }),
      ...(body.category && { category: body.category }),
      ...(body.limit !== undefined && { limit: body.limit }),
      ...(body.color && { color: body.color }),
    },
  })

  return NextResponse.json({
    id: updated.id,
    tag: updated.tag,
    category: updated.category,
    limit: Number(updated.limit),
    budgetAmount: Number(updated.limit),
    color: updated.color,
  })
}

// DELETE /api/budgets/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { id } = await params
  const existing = await prisma.budget.findFirst({ where: { id, userId } })
  if (!existing) {
    return NextResponse.json({ error: "Budget not found" }, { status: 404 })
  }

  await prisma.budget.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
