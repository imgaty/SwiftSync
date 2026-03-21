import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth-helpers"

// GET /api/bills — List all bills
export async function GET() {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const bills = await prisma.bill.findMany({
    where: { userId },
    orderBy: { dueDay: "asc" },
  })

  const formatted = bills.map((b) => ({
    id: b.id,
    name: b.name,
    amount: Number(b.amount),
    tags: b.tags,
    dueDay: b.dueDay,
    frequency: b.frequency,
    accountId: b.accountId,
    category: b.category,
    autopay: b.autopay,
    status: b.status,
  }))

  return NextResponse.json(formatted)
}

// POST /api/bills — Create a new bill
export async function POST(request: Request) {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const body = await request.json()
  const { name, amount, tags, dueDay, frequency, accountId, category, autopay } = body

  if (!name || !amount || !dueDay || !frequency || !accountId || !category) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const bill = await prisma.bill.create({
    data: {
      userId,
      name,
      amount,
      tags: tags || [],
      dueDay,
      frequency,
      accountId,
      category,
      autopay: autopay || false,
    },
  })

  return NextResponse.json({
    id: bill.id,
    name: bill.name,
    amount: Number(bill.amount),
    tags: bill.tags,
    dueDay: bill.dueDay,
    frequency: bill.frequency,
    accountId: bill.accountId,
    category: bill.category,
    autopay: bill.autopay,
    status: bill.status,
  }, { status: 201 })
}
