import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext } from "@/lib/auth-helpers"
import { scopeFilter, scopeCreateData, requirePermission } from "@/lib/data-access"
import { ruleCreateSchema } from "@/lib/PACE"

// GET /api/rules — List structured Rules for the active scope.
export async function GET() {
    const ctx = await getAuthContext()
    if (!ctx) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const permissionError = await requirePermission(ctx, "data:read")
    if (permissionError) return permissionError

    const rules = await prisma.rule.findMany({
        where: scopeFilter(ctx),
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    })

    return NextResponse.json({ rules })
}

// POST /api/rules — Create a new Rule.
export async function POST(request: Request) {
    const ctx = await getAuthContext()
    if (!ctx) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Rules sit in the same conceptual category as PACE rules; reuse the same
    // permission until / unless we split them out.
    const permissionError = await requirePermission(ctx, "pace:manage")
    if (permissionError) return permissionError

    const body = await request.json().catch(() => null)
    const parsed = ruleCreateSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json(
            { error: "Invalid rule payload", details: parsed.error.issues.slice(0, 5) },
            { status: 400 },
        )
    }

    const { name, enabled, filters, addTagSlugs, priority } = parsed.data

    const rule = await prisma.rule.create({
        data: {
            ...scopeCreateData(ctx),
            name,
            enabled: enabled ?? true,
            filters: filters as object[],            // Json column
            addTagSlugs,
            ...(priority !== undefined && { priority }),
        },
    })

    return NextResponse.json(rule, { status: 201 })
}
