import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

// GET /api/admin/stats — Returns all admin dashboard statistics
export async function GET() {
    const { admin, error } = await requireAdmin()
    if (error) return error

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const [
        // Counts
        totalUsers,
        activeUsers,
        suspendedUsers,
        bannedUsers,
        totalTransactions,
        totalBills,
        totalBudgets,
        totalAccounts,
        totalGoals,
        totalNotifications,

        // Time-based
        newUsersThisWeek,
        newUsersToday,
        loginsThisWeek,
        loginsToday,
        transactionsThisWeek,

        // Recent data
        recentUsers,
        recentAuditLogs,

        // User growth (last 30 days — get all users created in range)
        usersLast30Days,
    ] = await Promise.all([
        // Counts
        prisma.user.count(),
        prisma.user.count({ where: { status: "active" } }),
        prisma.user.count({ where: { status: "suspended" } }),
        prisma.user.count({ where: { status: "banned" } }),
        prisma.transaction.count(),
        prisma.bill.count(),
        prisma.budget.count(),
        prisma.bankAccount.count(),
        prisma.financialGoal.count(),
        prisma.notification.count(),

        // Time-based
        prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        prisma.user.count({ where: { createdAt: { gte: oneDayAgo } } }),
        prisma.user.count({ where: { lastLoginAt: { gte: sevenDaysAgo } } }),
        prisma.user.count({ where: { lastLoginAt: { gte: oneDayAgo } } }),
        prisma.transaction.count({ where: { createdAt: { gte: sevenDaysAgo } } }),

        // Recent data
        prisma.user.findMany({
            orderBy: { createdAt: "desc" },
            take: 8,
            select: {
                id: true, name: true, email: true, role: true, status: true,
                createdAt: true, lastLoginAt: true, twoFactorEnabled: true,
                _count: { select: { transactions: true, bankAccounts: true } },
            },
        }),
        prisma.auditLog.findMany({
            orderBy: { createdAt: "desc" },
            take: 10,
            select: {
                id: true, action: true, entity: true, entityId: true,
                details: true, ipAddress: true, createdAt: true,
                performer: { select: { id: true, name: true, email: true } },
                targetUser: { select: { id: true, name: true, email: true } },
            },
        }),

        // User growth — raw dates of user creation in last 30 days
        prisma.user.findMany({
            where: { createdAt: { gte: thirtyDaysAgo } },
            select: { createdAt: true },
            orderBy: { createdAt: "asc" },
        }),
    ])

    // Build user growth chart data (daily signups for last 30 days)
    const growthMap = new Map<string, number>()
    for (let i = 29; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        const key = date.toISOString().split("T")[0]
        growthMap.set(key, 0)
    }
    for (const u of usersLast30Days) {
        const key = u.createdAt.toISOString().split("T")[0]
        growthMap.set(key, (growthMap.get(key) || 0) + 1)
    }
    const userGrowth = Array.from(growthMap.entries()).map(([date, count]) => ({ date, count }))

    // Build cumulative growth
    let cumulative = totalUsers - usersLast30Days.length
    const userGrowthCumulative = userGrowth.map(({ date, count }) => {
        cumulative += count
        return { date, signups: count, total: cumulative }
    })

    return NextResponse.json({
        counts: {
            totalUsers,
            activeUsers,
            suspendedUsers,
            bannedUsers,
            totalTransactions,
            totalBills,
            totalBudgets,
            totalAccounts,
            totalGoals,
            totalNotifications,
        },
        activity: {
            newUsersThisWeek,
            newUsersToday,
            loginsThisWeek,
            loginsToday,
            transactionsThisWeek,
        },
        recentUsers: recentUsers.map((u) => ({
            ...u,
            createdAt: u.createdAt.toISOString(),
            lastLoginAt: u.lastLoginAt?.toISOString() || null,
            transactionCount: u._count.transactions,
            accountCount: u._count.bankAccounts,
        })),
        recentAuditLogs: recentAuditLogs.map((log) => ({
            ...log,
            createdAt: log.createdAt.toISOString(),
        })),
        userGrowth: userGrowthCumulative,
    })
}
