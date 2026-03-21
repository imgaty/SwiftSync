"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AdminHeader } from "@/components/admin/admin-header"
import { UserGrowthChart } from "@/components/admin/user-growth-chart"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Users,
    ArrowLeftRight,
    Receipt,
    PiggyBank,
    Wallet,
    Target,
    Activity,
    ShieldAlert,
    Ban,
    UserPlus,
    LogIn,
    ScrollText,
    TrendingUp,
    ExternalLink,
} from "lucide-react"

// --- Types ---
interface DashboardData {
    counts: {
        totalUsers: number
        activeUsers: number
        suspendedUsers: number
        bannedUsers: number
        totalTransactions: number
        totalBills: number
        totalBudgets: number
        totalAccounts: number
        totalGoals: number
        totalNotifications: number
    }
    activity: {
        newUsersThisWeek: number
        newUsersToday: number
        loginsThisWeek: number
        loginsToday: number
        transactionsThisWeek: number
    }
    recentUsers: {
        id: string
        name: string
        email: string
        role: string
        status: string
        createdAt: string
        lastLoginAt: string | null
        twoFactorEnabled: boolean
        transactionCount: number
        accountCount: number
    }[]
    recentAuditLogs: {
        id: string
        action: string
        entity: string
        entityId: string | null
        details: string | null
        ipAddress: string | null
        createdAt: string
        performer: { id: string; name: string; email: string }
        targetUser: { id: string; name: string; email: string } | null
    }[]
    userGrowth: { date: string; signups: number; total: number }[]
}

// --- Helpers ---
function timeAgo(dateStr: string): string {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
    if (seconds < 60) return "just now"
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}d ago`
    return new Date(dateStr).toLocaleDateString()
}

function formatAction(action: string): string {
    return action
        .replace(/\./g, " → ")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
}

const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    suspended: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    banned: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    deleted: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800/50 dark:text-neutral-400",
}

// --- Stat Card ---
function StatCard({
    title,
    value,
    icon: Icon,
    description,
    trend,
}: {
    title: string
    value: number | string
    icon: React.ElementType
    description?: string
    trend?: { value: number; label: string }
}) {
    return (
        <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{title}</p>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-2">
                <p className="text-2xl font-bold">{value}</p>
                {trend && trend.value > 0 && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        +{trend.value} {trend.label}
                    </p>
                )}
                {description && !trend && (
                    <p className="text-xs text-muted-foreground mt-1">{description}</p>
                )}
            </div>
        </div>
    )
}

// --- Skeleton loaders ---
function StatCardSkeleton() {
    return (
        <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4" />
            </div>
            <div className="mt-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-24 mt-2" />
            </div>
        </div>
    )
}

// --- Main Page ---
export default function AdminDashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch("/api/admin/stats", { credentials: "include" })
            .then((res) => res.json())
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    const c = data?.counts
    const a = data?.activity

    return (
        <>
            <AdminHeader title="Dashboard" />

            <div className="flex-1 overflow-auto">
                <div className="p-4 lg:p-6 space-y-6">
                    {/* Primary Stats */}
                    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                        {loading ? (
                            Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
                        ) : (
                            <>
                                <StatCard
                                    title="Total Users"
                                    value={c?.totalUsers ?? 0}
                                    icon={Users}
                                    trend={a?.newUsersThisWeek ? { value: a.newUsersThisWeek, label: "this week" } : undefined}
                                    description={!a?.newUsersThisWeek ? `${c?.activeUsers ?? 0} active` : undefined}
                                />
                                <StatCard
                                    title="Transactions"
                                    value={(c?.totalTransactions ?? 0).toLocaleString()}
                                    icon={ArrowLeftRight}
                                    trend={a?.transactionsThisWeek ? { value: a.transactionsThisWeek, label: "this week" } : undefined}
                                />
                                <StatCard
                                    title="Active Today"
                                    value={a?.loginsToday ?? 0}
                                    icon={LogIn}
                                    description={`${a?.loginsThisWeek ?? 0} this week`}
                                />
                                <StatCard
                                    title="New Today"
                                    value={a?.newUsersToday ?? 0}
                                    icon={UserPlus}
                                    description={`${a?.newUsersThisWeek ?? 0} this week`}
                                />
                            </>
                        )}
                    </div>

                    {/* Secondary Stats */}
                    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                        {loading ? (
                            Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
                        ) : (
                            <>
                                <StatCard title="Bank Accounts" value={c?.totalAccounts ?? 0} icon={Wallet} />
                                <StatCard title="Bills" value={c?.totalBills ?? 0} icon={Receipt} />
                                <StatCard title="Budgets" value={c?.totalBudgets ?? 0} icon={PiggyBank} />
                                <StatCard title="Goals" value={c?.totalGoals ?? 0} icon={Target} />
                            </>
                        )}
                    </div>

                    {/* Account Status + User Growth Chart */}
                    <div className="grid gap-4 lg:grid-cols-5">
                        {/* Account Status Breakdown */}
                        <div className="lg:col-span-2 rounded-xl border bg-card shadow-sm">
                            <div className="p-4 border-b">
                                <h3 className="font-semibold">Account Status</h3>
                                <p className="text-sm text-muted-foreground">User distribution by status</p>
                            </div>
                            <div className="p-4 space-y-3">
                                {loading ? (
                                    Array.from({ length: 4 }).map((_, i) => (
                                        <Skeleton key={i} className="h-10 w-full" />
                                    ))
                                ) : (
                                    [
                                        { label: "Active", value: c?.activeUsers ?? 0, icon: Activity, color: "text-green-600 dark:text-green-400" },
                                        { label: "Suspended", value: c?.suspendedUsers ?? 0, icon: ShieldAlert, color: "text-yellow-600 dark:text-yellow-400" },
                                        { label: "Banned", value: c?.bannedUsers ?? 0, icon: Ban, color: "text-red-600 dark:text-red-400" },
                                    ].map((item) => (
                                        <div key={item.label} className="flex items-center justify-between py-2">
                                            <div className="flex items-center gap-3">
                                                <item.icon className={`h-4 w-4 ${item.color}`} />
                                                <span className="text-sm">{item.label}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-semibold">{item.value}</span>
                                                <span className="text-xs text-muted-foreground w-12 text-right">
                                                    {c && c.totalUsers > 0
                                                        ? `${Math.round((item.value / c.totalUsers) * 100)}%`
                                                        : "0%"}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* User Growth Chart */}
                        <div className="lg:col-span-3 rounded-xl border bg-card shadow-sm">
                            <div className="p-4 border-b">
                                <h3 className="font-semibold">User Growth</h3>
                                <p className="text-sm text-muted-foreground">Signups & total users — last 30 days</p>
                            </div>
                            <div className="p-4">
                                {loading ? (
                                    <Skeleton className="h-60 w-full" />
                                ) : (
                                    <UserGrowthChart data={data?.userGrowth ?? []} />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Recent Users + Audit Log */}
                    <div className="grid gap-4 lg:grid-cols-2">
                        {/* Recent Users */}
                        <div className="rounded-xl border bg-card shadow-sm">
                            <div className="p-4 border-b flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold">Recent Users</h3>
                                    <p className="text-sm text-muted-foreground">Latest registered accounts</p>
                                </div>
                                <Link
                                    href="/admin/users"
                                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                                >
                                    View all <ExternalLink className="h-3 w-3" />
                                </Link>
                            </div>
                            <div className="divide-y">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <div key={i} className="flex items-center gap-3 p-4">
                                            <Skeleton className="h-8 w-8 rounded-full" />
                                            <div className="flex-1 space-y-1.5">
                                                <Skeleton className="h-3.5 w-28" />
                                                <Skeleton className="h-3 w-40" />
                                            </div>
                                            <Skeleton className="h-5 w-14 rounded-full" />
                                        </div>
                                    ))
                                ) : data?.recentUsers.length === 0 ? (
                                    <div className="p-8 text-center text-sm text-muted-foreground">
                                        No users yet
                                    </div>
                                ) : (
                                    data?.recentUsers.map((user) => (
                                        <div key={user.id} className="flex items-center justify-between p-3 px-4">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                                                    {user.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "U"}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium truncate">{user.name}</p>
                                                    <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {user.twoFactorEnabled && (
                                                    <span className="text-[10px] text-blue-600 dark:text-blue-400" title="2FA enabled">🔐</span>
                                                )}
                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[user.status] || statusColors.active}`}>
                                                    {user.status}
                                                </span>
                                                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                                                    {timeAgo(user.createdAt)}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Audit Log */}
                        <div className="rounded-xl border bg-card shadow-sm">
                            <div className="p-4 border-b flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold">Recent Admin Activity</h3>
                                    <p className="text-sm text-muted-foreground">Latest audit log entries</p>
                                </div>
                                <Link
                                    href="/admin/audit-log"
                                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                                >
                                    View all <ExternalLink className="h-3 w-3" />
                                </Link>
                            </div>
                            <div className="divide-y">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <div key={i} className="flex items-center gap-3 p-4">
                                            <Skeleton className="h-8 w-8 rounded-md" />
                                            <div className="flex-1 space-y-1.5">
                                                <Skeleton className="h-3.5 w-32" />
                                                <Skeleton className="h-3 w-48" />
                                            </div>
                                            <Skeleton className="h-3 w-12" />
                                        </div>
                                    ))
                                ) : data?.recentAuditLogs.length === 0 ? (
                                    <div className="p-8 text-center text-sm text-muted-foreground">
                                        <ScrollText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                                        <p>No admin activity yet</p>
                                        <p className="text-xs mt-1">Actions will appear here as admins manage the platform</p>
                                    </div>
                                ) : (
                                    data?.recentAuditLogs.map((log) => (
                                        <div key={log.id} className="flex items-start justify-between p-3 px-4 gap-3">
                                            <div className="flex items-start gap-3 min-w-0">
                                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground mt-0.5">
                                                    <ScrollText className="h-3.5 w-3.5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium">{formatAction(log.action)}</p>
                                                    <p className="text-[11px] text-muted-foreground truncate">
                                                        by {log.performer.name}
                                                        {log.targetUser && <> → {log.targetUser.name}</>}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
                                                {timeAgo(log.createdAt)}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
