import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

// GET /api/admin/accounts — Cross-user bank account list
export async function GET(request: NextRequest) {
    const { admin, error } = await requireAdmin()
    if (error) return error

    const url = request.nextUrl
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")))
    const search = url.searchParams.get("search")?.trim() || ""
    const accountType = url.searchParams.get("type") || ""
    const sortBy = url.searchParams.get("sortBy") || "createdAt"
    const sortDir = url.searchParams.get("sortDir") === "asc" ? "asc" : "desc"

    const where: Record<string, unknown> = {}
    if (search) {
        where.cardName = { contains: search, mode: "insensitive" }
    }
    if (accountType) {
        where.accountType = accountType
    }

    const allowedSorts = ["createdAt", "balance", "accountType", "cardName"]
    const orderBy = allowedSorts.includes(sortBy)
        ? { [sortBy]: sortDir }
        : { createdAt: "desc" as const }

    const [accounts, total, balanceAgg] = await Promise.all([
        prisma.bankAccount.findMany({
            where,
            orderBy,
            skip: (page - 1) * limit,
            take: limit,
            select: {
                id: true,
                cardName: true,
                accountType: true,
                balance: true,
                currency: true,
                isActive: true,
                createdAt: true,
                user: { select: { id: true, name: true, email: true } },
                bank: { select: { name: true } },
            },
        }),
        prisma.bankAccount.count({ where }),
        prisma.bankAccount.aggregate({
            where,
            _sum: { balance: true },
        }),
    ])

    return NextResponse.json({
        accounts,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        summary: { totalBalance: balanceAgg._sum.balance || 0 },
    })
}
