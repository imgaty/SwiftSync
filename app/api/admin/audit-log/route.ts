import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

// GET /api/admin/audit-log — Full audit log with filters and pagination
export async function GET(request: NextRequest) {
    const { admin, error } = await requireAdmin()
    if (error) return error

    const url = request.nextUrl
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "30")))
    const action = url.searchParams.get("action") || ""
    const entity = url.searchParams.get("entity") || ""
    const performerId = url.searchParams.get("performerId") || ""
    const targetUserId = url.searchParams.get("targetUserId") || ""

    const where: Record<string, unknown> = {}
    if (action) where.action = { contains: action, mode: "insensitive" }
    if (entity) where.entity = entity
    if (performerId) where.performerId = performerId
    if (targetUserId) where.targetUserId = targetUserId

    const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
            select: {
                id: true,
                action: true,
                entity: true,
                entityId: true,
                details: true,
                ipAddress: true,
                createdAt: true,
                performer: { select: { id: true, name: true, email: true } },
                targetUser: { select: { id: true, name: true, email: true } },
            },
        }),
        prisma.auditLog.count({ where }),
    ])

    return NextResponse.json({
        logs,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
}
