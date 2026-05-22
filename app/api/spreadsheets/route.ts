import { NextResponse } from "next/server"
import { Prisma } from "@/lib/generated/prisma/client"

import { getAuthContext } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { requirePermission, scopeCreateData, scopeFilter } from "@/lib/data-access"
import { assertContentSize, spreadsheetCreateSchema } from "@/lib/spreadsheet-schema"

function serializeDocument(document: {
  id: string
  name: string
  description: string | null
  sheetType: string
  linkedEntity: string | null
  content: unknown
  createdAt: Date
  updatedAt: Date
}) {
  return {
    ...document,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  }
}

// GET /api/spreadsheets — list saved spreadsheets for the current personal/org scope
export async function GET() {
  const ctx = await getAuthContext()
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const permissionError = await requirePermission(ctx, "data:read")
  if (permissionError) return permissionError

  const documents = await prisma.spreadsheetDocument.findMany({
    where: scopeFilter(ctx),
    orderBy: { updatedAt: "desc" },
  })

  return NextResponse.json(documents.map(serializeDocument))
}

// POST /api/spreadsheets — create a saved spreadsheet document
export async function POST(request: Request) {
  const ctx = await getAuthContext()
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const permissionError = await requirePermission(ctx, "data:write")
  if (permissionError) return permissionError

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const sizeCheck = assertContentSize((body as { content?: unknown }).content)
  if (!sizeCheck.ok) {
    return NextResponse.json({ error: sizeCheck.error }, { status: 413 })
  }

  const parsed = spreadsheetCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid spreadsheet payload", details: parsed.error.issues.slice(0, 5) },
      { status: 400 },
    )
  }

  const { name, description, sheetType, linkedEntity, content } = parsed.data

  const created = await prisma.spreadsheetDocument.create({
    data: {
      ...scopeCreateData(ctx),
      name,
      description: description ?? null,
      sheetType: sheetType ?? "manual",
      linkedEntity: linkedEntity ?? null,
      content: content as Prisma.InputJsonValue,
    },
  })

  await prisma.spreadsheetLog.create({
    data: {
      spreadsheetId: created.id,
      userId: ctx.userId,
      action: "created",
      summary: `Created spreadsheet "${name}"`,
    },
  }).catch(() => { /* non-critical */ })

  return NextResponse.json(serializeDocument(created), { status: 201 })
}
