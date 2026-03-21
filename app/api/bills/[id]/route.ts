import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth-helpers"

// PUT /api/bills/[id]
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

  const existing = await prisma.bill.findFirst({ where: { id, userId } })
  if (!existing) {
    return NextResponse.json({ error: "Bill not found" }, { status: 404 })
  }

  const updated = await prisma.bill.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.amount !== undefined && { amount: body.amount }),
      ...(body.tags && { tags: body.tags }),
      ...(body.dueDay !== undefined && { dueDay: body.dueDay }),
      ...(body.frequency && { frequency: body.frequency }),
      ...(body.accountId && { accountId: body.accountId }),
      ...(body.category && { category: body.category }),
      ...(body.autopay !== undefined && { autopay: body.autopay }),
      ...(body.status && { status: body.status }),
    },
  })

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    amount: Number(updated.amount),
    tags: updated.tags,
    dueDay: updated.dueDay,
    frequency: updated.frequency,
    accountId: updated.accountId,
    category: updated.category,
    autopay: updated.autopay,
    status: updated.status,
  })
}

// DELETE /api/bills/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { id } = await params
  const existing = await prisma.bill.findFirst({ where: { id, userId } })
  if (!existing) {
    return NextResponse.json({ error: "Bill not found" }, { status: 404 })
  }

  await prisma.bill.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
