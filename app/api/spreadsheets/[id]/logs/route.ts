import { NextResponse } from "next/server"

import { getAuthContext } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { requirePermission, scopeRecordFilter } from "@/lib/data-access"

// GET /api/spreadsheets/[id]/logs — list change logs for a spreadsheet
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

    // Verify ownership
    const document = await prisma.spreadsheetDocument.findFirst({
        where: scopeRecordFilter(ctx, id),
    })

    if (!document) {
        return NextResponse.json({ error: "Spreadsheet not found" }, { status: 404 })
    }

    const logs = await prisma.spreadsheetLog.findMany({
        where: { spreadsheetId: id },
        orderBy: { createdAt: "desc" },
        include: {
            user: { select: { id: true, name: true, email: true } },
        },
    })

    return NextResponse.json(
        logs.map((log) => ({
            ...log,
            createdAt: log.createdAt.toISOString(),
        }))
    )
}
