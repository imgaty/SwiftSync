import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

// GET /api/admin/bills — Cross-user bills list
export async function GET(request: NextRequest) {
    const { admin, error } = await requireAdmin()
    if (error) return error

    const url = request.nextUrl
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")))
    const search = url.searchParams.get("search")?.trim() || ""
    const frequency = url.searchParams.get("frequency") || ""
    const sortBy = url.searchParams.get("sortBy") || "createdAt"
    const sortDir = url.searchParams.get("sortDir") === "asc" ? "asc" : "desc"

    const where: Record<string, unknown> = {}
    if (search) {
        where.name = { contains: search, mode: "insensitive" }
    }
    if (frequency && ["monthly", "yearly", "weekly"].includes(frequency)) {
        where.frequency = frequency
    }

    const allowedSorts = ["createdAt", "name", "amount", "dueDay", "frequency"]
    const orderBy = allowedSorts.includes(sortBy)
        ? { [sortBy]: sortDir }
        : { createdAt: "desc" as const }

    const [bills, total, totalAmount] = await Promise.all([
        prisma.bill.findMany({
            where,
            orderBy,
            skip: (page - 1) * limit,
            take: limit,
            select: {
                id: true,
                name: true,
                amount: true,
                tags: true,
                dueDay: true,
                frequency: true,
                category: true,
                autopay: true,
                status: true,
                createdAt: true,
                user: { select: { id: true, name: true, email: true } },
            },
        }),
        prisma.bill.count({ where }),
        prisma.bill.aggregate({ where, _sum: { amount: true } }),
    ])

    return NextResponse.json({
        bills,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        summary: { totalMonthly: totalAmount._sum.amount || 0 },
    })
}
