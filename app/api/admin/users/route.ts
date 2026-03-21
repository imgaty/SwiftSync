import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

// GET /api/admin/users — List users with search, filter, sort, pagination
export async function GET(request: NextRequest) {
    const { admin, error } = await requireAdmin()
    if (error) return error

    const url = request.nextUrl
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")))
    const search = url.searchParams.get("search")?.trim() || ""
    const status = url.searchParams.get("status") || ""
    const role = url.searchParams.get("role") || ""
    const sortBy = url.searchParams.get("sortBy") || "createdAt"
    const sortDir = url.searchParams.get("sortDir") === "asc" ? "asc" : "desc"
    const twoFactor = url.searchParams.get("2fa") || ""

    // Build where clause
    const where: Record<string, unknown> = {}

    if (search) {
        where.OR = [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
        ]
    }

    if (status && ["active", "suspended", "banned", "deleted"].includes(status)) {
        where.status = status
    }

    if (role && ["user", "admin", "superadmin"].includes(role)) {
        where.role = role
    }

    if (twoFactor === "enabled") {
        where.twoFactorEnabled = true
    } else if (twoFactor === "disabled") {
        where.twoFactorEnabled = false
    }

    // Validate sort field
    const allowedSorts = ["createdAt", "name", "email", "lastLoginAt", "status", "role"]
    const orderBy = allowedSorts.includes(sortBy)
        ? { [sortBy]: sortDir }
        : { createdAt: "desc" as const }

    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
            orderBy,
            skip: (page - 1) * limit,
            take: limit,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                twoFactorEnabled: true,
                createdAt: true,
                lastLoginAt: true,
                lastLoginIp: true,
                suspendedAt: true,
                suspendedReason: true,
                _count: {
                    select: {
                        transactions: true,
                        bankAccounts: true,
                        bills: true,
                        budgets: true,
                        financialGoals: true,
                    },
                },
            },
        }),
        prisma.user.count({ where }),
    ])

    return NextResponse.json({
        users,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    })
}
