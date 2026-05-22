import { NextResponse } from "next/server"
import { Prisma } from "@/lib/generated/prisma/client"

import { getAuthContext } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { requirePermission, scopeRecordFilter } from "@/lib/data-access"
import { assertContentSize, spreadsheetUpdateSchema } from "@/lib/spreadsheet-schema"

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

// GET /api/spreadsheets/[id] — fetch a single spreadsheet document
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
  const document = await prisma.spreadsheetDocument.findFirst({
    where: scopeRecordFilter(ctx, id),
  })

  if (!document) {
    return NextResponse.json({ error: "Spreadsheet not found" }, { status: 404 })
  }

  return NextResponse.json(serializeDocument(document))
}

// PATCH /api/spreadsheets/[id] — update an existing spreadsheet document
export async function PATCH(
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
  const existing = await prisma.spreadsheetDocument.findFirst({
    where: scopeRecordFilter(ctx, id),
    select: { id: true, name: true },
  })

  if (!existing) {
    return NextResponse.json({ error: "Spreadsheet not found" }, { status: 404 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  if ("content" in (body as Record<string, unknown>)) {
    const sizeCheck = assertContentSize((body as { content?: unknown }).content)
    if (!sizeCheck.ok) {
      return NextResponse.json({ error: sizeCheck.error }, { status: 413 })
    }
  }

  const parsed = spreadsheetUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid spreadsheet payload", details: parsed.error.issues.slice(0, 5) },
      { status: 400 },
    )
  }

  const {
    name,
    description,
    sheetType,
    linkedEntity,
    content,
    logAction,
    logSummary,
  } = parsed.data

  // Atomic scope-in-write: update only if the record matches the caller's scope.
  const result = await prisma.spreadsheetDocument.updateMany({
    where: scopeRecordFilter(ctx, id),
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(sheetType !== undefined && { sheetType }),
      ...(linkedEntity !== undefined && { linkedEntity }),
      ...(content !== undefined && { content: content as Prisma.InputJsonValue }),
    },
  })

  if (result.count === 0) {
    return NextResponse.json({ error: "Spreadsheet not found" }, { status: 404 })
  }

  const updated = await prisma.spreadsheetDocument.findFirst({
    where: scopeRecordFilter(ctx, id),
  })

  if (!updated) {
    return NextResponse.json({ error: "Spreadsheet not found" }, { status: 404 })
  }

  // Build log entry
  const summaryParts: string[] = []
  if (logSummary) {
    summaryParts.push(logSummary)
  } else {
    if (name !== undefined && name !== existing.name) summaryParts.push(`Renamed to "${name}"`)
    if (content !== undefined) summaryParts.push("Content updated")
  }

  if (summaryParts.length > 0) {
    await prisma.spreadsheetLog.create({
      data: {
        spreadsheetId: id,
        userId: ctx.userId,
        action: logAction || (name !== undefined && name !== existing.name ? "renamed" : "content_update"),
        summary: summaryParts.join("; "),
      },
    }).catch(() => { /* non-critical */ })
  }

  return NextResponse.json(serializeDocument(updated))
}

// DELETE /api/spreadsheets/[id] — remove a spreadsheet document
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
  const result = await prisma.spreadsheetDocument.deleteMany({
    where: scopeRecordFilter(ctx, id),
  })

  if (result.count === 0) {
    return NextResponse.json({ error: "Spreadsheet not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
