import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@/lib/generated/prisma/client"
import { getAuthContext } from "@/lib/auth-helpers"
import { scopeRecordFilter, requirePermission } from "@/lib/data-access"

// GET /api/accounts/[id] — Get a single bank account
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthContext()
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  const permissionError = await requirePermission(ctx, "data:read")
  if (permissionError) return permissionError

  const { id } = await params

  const account = await prisma.bankAccount.findFirst({
    where: scopeRecordFilter(ctx, id),
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
  const ctx = await getAuthContext()
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  const permissionError = await requirePermission(ctx, "data:write")
  if (permissionError) return permissionError

  const { id } = await params

  const body = await request.json()
  const { name, color, isActive } = body

  const { count } = await prisma.bankAccount.updateMany({
    where: scopeRecordFilter(ctx, id),
    data: {
      ...(name !== undefined && { cardName: name }),
      ...(color !== undefined && { color }),
      ...(isActive !== undefined && { isActive }),
    },
  })
  if (count === 0) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 })
  }

  const updated = await prisma.bankAccount.findUniqueOrThrow({
    where: { id },
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
  const ctx = await getAuthContext()
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  const permissionError = await requirePermission(ctx, "data:delete")
  if (permissionError) return permissionError

  const { id } = await params

  try {
    const { count } = await prisma.bankAccount.deleteMany({
      where: scopeRecordFilter(ctx, id),
    })
    if (count === 0) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Account deleted" })
  } catch (e) {
    // P2003 = foreign-key constraint violation (bills link to this account with onDelete: Restrict).
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
      return NextResponse.json(
        { error: "Cannot delete account — remove or reassign its bills first." },
        { status: 409 }
      )
    }
    throw e
  }
}
