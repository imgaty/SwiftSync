import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

// GET /api/admin/transactions — Cross-user transaction list
export async function GET(request: NextRequest) {
    const { admin, error } = await requireAdmin()
    if (error) return error

    const url = request.nextUrl
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")))
    const search = url.searchParams.get("search")?.trim() || ""
    const type = url.searchParams.get("type") || ""
    const userId = url.searchParams.get("userId") || ""
    const sortBy = url.searchParams.get("sortBy") || "createdAt"
    const sortDir = url.searchParams.get("sortDir") === "asc" ? "asc" : "desc"

    const where: Record<string, unknown> = {}
    if (search) {
        where.description = { contains: search, mode: "insensitive" }
    }
    if (type === "in" || type === "out") {
        where.type = type
    }
    if (userId) {
        where.userId = userId
    }

    const allowedSorts = ["createdAt", "date", "amount", "type"]
    const orderBy = allowedSorts.includes(sortBy)
        ? { [sortBy]: sortDir }
        : { createdAt: "desc" as const }

    const [transactions, total, totals] = await Promise.all([
        prisma.transaction.findMany({
            where,
            orderBy,
            skip: (page - 1) * limit,
            take: limit,
            select: {
                id: true,
                date: true,
                type: true,
                amount: true,
                description: true,
                tags: true,
                accountId: true,
                createdAt: true,
                user: { select: { id: true, name: true, email: true } },
            },
        }),
        prisma.transaction.count({ where }),
        prisma.transaction.aggregate({
            where,
            _sum: { amount: true },
            _count: true,
        }),
    ])

    const incomeTotal = await prisma.transaction.aggregate({
        where: { ...where, type: "in" },
        _sum: { amount: true },
    })
    const expenseTotal = await prisma.transaction.aggregate({
        where: { ...where, type: "out" },
        _sum: { amount: true },
    })

    return NextResponse.json({
        transactions,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        summary: {
            totalIncome: incomeTotal._sum.amount || 0,
            totalExpenses: expenseTotal._sum.amount || 0,
            count: totals._count,
        },
    })
}
