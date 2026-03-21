import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

// GET /api/admin/health — System health overview
export async function GET() {
    const { admin, error } = await requireAdmin()
    if (error) return error

    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Database health — measure query time
    const dbStart = Date.now()
    const dbTest = await prisma.user.count()
    const dbLatency = Date.now() - dbStart

    const [
        totalUsers,
        activeUsers,
        totalTransactions,
        totalBills,
        totalBudgets,
        totalGoals,
        totalAccounts,
        totalNotifications,
        totalAuditLogs,
        totalAnnouncements,
        activeAnnouncements,
        loginsToday,
        loginsThisWeek,
        newUsersToday,
        newUsersThisWeek,
        transactionsToday,
        transactionsThisWeek,
        oauthAccountCount,
        twoFaEnabledCount,
        saltEdgeConnections,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { status: "active" } }),
        prisma.transaction.count(),
        prisma.bill.count(),
        prisma.budget.count(),
        prisma.financialGoal.count(),
        prisma.bankAccount.count(),
        prisma.notification.count(),
        prisma.auditLog.count(),
        prisma.systemAnnouncement.count(),
        prisma.systemAnnouncement.count({ where: { isActive: true } }),
        prisma.user.count({ where: { lastLoginAt: { gte: oneDayAgo } } }),
        prisma.user.count({ where: { lastLoginAt: { gte: sevenDaysAgo } } }),
        prisma.user.count({ where: { createdAt: { gte: oneDayAgo } } }),
        prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        prisma.transaction.count({ where: { createdAt: { gte: oneDayAgo } } }),
        prisma.transaction.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        prisma.oAuthAccount.count(),
        prisma.user.count({ where: { twoFactorEnabled: true } }),
        prisma.saltEdgeConnection.count(),
    ])

    // Memory usage (Node.js)
    const memUsage = process.memoryUsage()

    return NextResponse.json({
        status: "healthy",
        timestamp: now.toISOString(),
        database: {
            connected: true,
            latencyMs: dbLatency,
            totalRecords: dbTest,
        },
        tables: {
            users: totalUsers,
            activeUsers,
            transactions: totalTransactions,
            bills: totalBills,
            budgets: totalBudgets,
            goals: totalGoals,
            accounts: totalAccounts,
            notifications: totalNotifications,
            auditLogs: totalAuditLogs,
            announcements: totalAnnouncements,
            activeAnnouncements,
            oauthAccounts: oauthAccountCount,
            saltEdgeConnections,
        },
        security: {
            twoFaEnabled: twoFaEnabledCount,
            twoFaPercentage: totalUsers > 0 ? Math.round((twoFaEnabledCount / totalUsers) * 100) : 0,
        },
        activity: {
            loginsToday,
            loginsThisWeek,
            newUsersToday,
            newUsersThisWeek,
            transactionsToday,
            transactionsThisWeek,
        },
        runtime: {
            nodeVersion: process.version,
            platform: process.platform,
            uptime: Math.floor(process.uptime()),
            memory: {
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
                rss: Math.round(memUsage.rss / 1024 / 1024),
                external: Math.round(memUsage.external / 1024 / 1024),
            },
        },
    })
}
