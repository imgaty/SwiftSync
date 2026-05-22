import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext } from "@/lib/auth-helpers"
import { scopeFilter, scopeCreateData, requirePermission } from "@/lib/data-access"
import { paceRuleCreateSchema } from "@/lib/PACE"

// GET /api/PACE-rules — List PACE rules
export async function GET() {
  const ctx = await getAuthContext()
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const permissionError = await requirePermission(ctx, "data:read")
  if (permissionError) return permissionError

  const rules = await prisma.pACERule.findMany({
    where: scopeFilter(ctx),
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ rules })
}

// POST /api/PACE-rules — Create a new PACE rule
export async function POST(request: Request) {
  const ctx = await getAuthContext()
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const permissionError = await requirePermission(ctx, "pace:manage")
  if (permissionError) return permissionError

  const body = await request.json().catch(() => null)
  const parsed = paceRuleCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid PACE rule payload", details: parsed.error.issues.slice(0, 5) },
      { status: 400 },
    )
  }

  const { pattern, matchField, tag, priority } = parsed.data

  const rule = await prisma.pACERule.create({
    data: {
      ...scopeCreateData(ctx),
      pattern,
      matchField: matchField || "description",
      tag,
      ...(priority !== undefined && { priority }),
    },
  })

  return NextResponse.json(rule, { status: 201 })
}
