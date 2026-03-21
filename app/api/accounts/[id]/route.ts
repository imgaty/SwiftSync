import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth-helpers"

// GET /api/accounts/[id] — Get a single bank account
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { id } = await params

  const account = await prisma.bankAccount.findFirst({
    where: { id, userId },
    include: { bank: true },
  })

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 })
  }

  return NextResponse.json({
    id: account.id,
    name: account.cardName,
    type: account.accountType,
    institution: account.bank.name,
    balance: Number(account.balance),
    color: account.color,
    isActive: account.isActive,
    iban: account.iban,
    currency: account.currency,
    saltEdgeAccountId: account.saltEdgeAccountId,
    bankId: account.bankId,
  })
}

// PUT /api/accounts/[id] — Update a bank account
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { id } = await params

  // Verify ownership
  const existing = await prisma.bankAccount.findFirst({
    where: { id, userId },
  })
  if (!existing) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 })
  }

  const body = await request.json()
  const { name, color, isActive } = body

  const updated = await prisma.bankAccount.update({
    where: { id },
    data: {
      ...(name !== undefined && { cardName: name }),
      ...(color !== undefined && { color }),
      ...(isActive !== undefined && { isActive }),
    },
    include: { bank: true },
  })

  return NextResponse.json({
    id: updated.id,
    name: updated.cardName,
    type: updated.accountType,
    institution: updated.bank.name,
    balance: Number(updated.balance),
    color: updated.color,
    isActive: updated.isActive,
  })
}

// DELETE /api/accounts/[id] — Delete a bank account
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { id } = await params

  // Verify ownership
  const existing = await prisma.bankAccount.findFirst({
    where: { id, userId },
  })
  if (!existing) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 })
  }

  await prisma.bankAccount.delete({ where: { id } })

  return NextResponse.json({ success: true, message: "Account deleted" })
}
