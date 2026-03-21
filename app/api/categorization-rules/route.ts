import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth-helpers"

// GET /api/categorization-rules — List user's categorization rules
export async function GET() {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const rules = await prisma.categorizationRule.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ rules })
}

// POST /api/categorization-rules — Create a new rule
export async function POST(request: Request) {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const body = await request.json()
  const { pattern, matchField, tag } = body

  if (!pattern || !tag) {
    return NextResponse.json({ error: "Pattern and tag are required" }, { status: 400 })
  }

  const rule = await prisma.categorizationRule.create({
    data: {
      userId,
      pattern,
      matchField: matchField || "description",
      tag,

    },
  })

  return NextResponse.json(rule, { status: 201 })
}
