import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

// GET /api/admin/goals — Cross-user financial goals list
export async function GET(request: NextRequest) {
    const { admin, error } = await requireAdmin()
    if (error) return error

    const url = request.nextUrl
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")))
    const search = url.searchParams.get("search")?.trim() || ""
    const status = url.searchParams.get("status") || ""
    const category = url.searchParams.get("category") || ""
    const sortBy = url.searchParams.get("sortBy") || "createdAt"
    const sortDir = url.searchParams.get("sortDir") === "asc" ? "asc" : "desc"

    const where: Record<string, unknown> = {}
    if (search) {
        where.name = { contains: search, mode: "insensitive" }
    }
    if (status && ["active", "completed", "cancelled"].includes(status)) {
        where.status = status
    }
    if (category) {
        where.category = category
    }

    const allowedSorts = ["createdAt", "name", "targetAmount", "currentAmount", "deadline", "status"]
    const orderBy = allowedSorts.includes(sortBy)
        ? { [sortBy]: sortDir }
        : { createdAt: "desc" as const }

    const [goals, total, agg] = await Promise.all([
        prisma.financialGoal.findMany({
            where,
            orderBy,
            skip: (page - 1) * limit,
            take: limit,
            select: {
                id: true,
                name: true,
                targetAmount: true,
                currentAmount: true,
                deadline: true,
                category: true,
                color: true,
                status: true,
                createdAt: true,
                user: { select: { id: true, name: true, email: true } },
            },
        }),
        prisma.financialGoal.count({ where }),
        prisma.financialGoal.aggregate({
            where,
            _sum: { targetAmount: true, currentAmount: true },
        }),
    ])

    return NextResponse.json({
        goals,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        summary: {
            totalTarget: agg._sum.targetAmount || 0,
            totalCurrent: agg._sum.currentAmount || 0,
        },
    })
}
