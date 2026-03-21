import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

// GET /api/admin/budgets — Cross-user budgets list
export async function GET(request: NextRequest) {
    const { admin, error } = await requireAdmin()
    if (error) return error

    const url = request.nextUrl
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")))
    const search = url.searchParams.get("search")?.trim() || ""
    const sortBy = url.searchParams.get("sortBy") || "createdAt"
    const sortDir = url.searchParams.get("sortDir") === "asc" ? "asc" : "desc"

    const where: Record<string, unknown> = {}
    if (search) {
        where.category = { contains: search, mode: "insensitive" }
    }

    const allowedSorts = ["createdAt", "category", "limit", "tag"]
    const orderBy = allowedSorts.includes(sortBy)
        ? { [sortBy]: sortDir }
        : { createdAt: "desc" as const }

    const [budgets, total, totalLimit] = await Promise.all([
        prisma.budget.findMany({
            where,
            orderBy,
            skip: (page - 1) * limit,
            take: limit,
            select: {
                id: true,
                tag: true,
                category: true,
                limit: true,
                color: true,
                createdAt: true,
                user: { select: { id: true, name: true, email: true } },
            },
        }),
        prisma.budget.count({ where }),
        prisma.budget.aggregate({ where, _sum: { limit: true } }),
    ])

    return NextResponse.json({
        budgets,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        summary: { totalBudgetLimit: totalLimit._sum.limit || 0 },
    })
}
