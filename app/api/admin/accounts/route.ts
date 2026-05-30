//
//  route.ts
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Handles the /api/admin/accounts API endpoint for Argent, keeping request parsing,
//  business operations, and response formatting at the route boundary.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"
import { parsePositiveInt } from "@/lib/query-utils"

// GET /api/admin/accounts — Cross-user bank account list
export async function GET(request: NextRequest) {
    const { error } = await requireAdmin()
    if (error) return error

    const url = request.nextUrl
    const page = parsePositiveInt(url.searchParams.get("page"), 1)
    const limit = Math.min(100, parsePositiveInt(url.searchParams.get("limit"), 20))
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
