import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth-helpers"

// PUT /api/transactions/[id] — Update a transaction
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
  const { date, type, amount, description, tags, accountId } = body

  const existing = await prisma.transaction.findFirst({
    where: { id, userId },
  })
  if (!existing) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
  }

  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      ...(date && { date: new Date(date) }),
      ...(type && { type }),
      ...(amount !== undefined && { amount }),
      ...(description && { description }),
      ...(tags && { tags }),
      ...(accountId && { accountId }),
    },
  })

  return NextResponse.json({
    id: updated.id,
    date: updated.date.toISOString().slice(0, 10),
    type: updated.type,
    amount: Number(updated.amount),
    description: updated.description,
    tags: updated.tags,
    accountId: updated.accountId,
  })
}

// DELETE /api/transactions/[id] — Delete a transaction
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { id } = await params
  const existing = await prisma.transaction.findFirst({
    where: { id, userId },
  })
  if (!existing) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
  }

  await prisma.transaction.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
