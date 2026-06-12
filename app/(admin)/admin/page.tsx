//
//  page.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Renders the /admin route in Argent, composing page-level layout, data dependencies, and
//  feature components for that user-facing screen.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AdminHeader } from "@/components/admin/admin-header"
import { UserGrowthChart } from "@/components/admin/user-growth-chart"
import { useLanguage } from "@/components/language-provider"
import { Skeleton } from "@/components/ui/skeleton"
import { getTranslations, type LooseTranslations } from "@/lib/translation-utils"
import { UDS } from "@/lib/UDS"
import { cn } from "@/lib/utils"
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
    SquareArrowOutUpRight as ExternalLink,
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
function timeAgo(dateStr: string, a: LooseTranslations): string {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
    if (seconds < 60) return a.just_now || "just now"
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}${a.m_ago || "m ago"}`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}${a.h_ago || "h ago"}`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}${a.d_ago || "d ago"}`
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
    deleted: "bg-neutral-100 text-neutral-400 dark:bg-neutral-800/50 dark:text-neutral-400",
}

// --- Stat Card ---
function StatCard({
    title,
    value,
    icon: Icon,
    description,
    trend,
    tone = "info",
}: {
    title: string
    value: number | string
    icon: React.ElementType
    description?: string
    trend?: { value: number; label: string }
    tone?: keyof typeof UDS.statCardTone
}) {
    const toneStyles = UDS.statCardTone[tone]

    return (
        <div className={cn(UDS.summaryTileSurface, toneStyles.card, "relative overflow-hidden")}>
            <div aria-hidden className={cn("pointer-events-none absolute inset-0 opacity-80", toneStyles.glow)} />
            <div aria-hidden className={cn("pointer-events-none absolute inset-x-0 top-0 h-0.5", toneStyles.line)} />
            <div className="relative flex items-center justify-between">
                <p className={UDS.summaryLabel}>{title}</p>
                <Icon className={cn("size-3.5", toneStyles.icon)} />
            </div>
            <div className="relative mt-2">
                <p className={cn(UDS.summaryValue, toneStyles.value)}>{value}</p>
                {trend && trend.value > 0 && (
                    <p className={cn("mt-1 flex items-center gap-1 text-xs font-medium", toneStyles.meta)}>
                        <TrendingUp className="size-3" />
                        +{trend.value} {trend.label}
                    </p>
                )}
                {description && !trend && (
                    <p className={cn("mt-1 text-xs", toneStyles.meta)}>{description}</p>
                )}
            </div>
        </div>
    )
}

// --- Skeleton loaders ---
function StatCardSkeleton() {
    return (
        <div className={UDS.summaryTileSurface}>
            <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="size-3.5" />
            </div>
            <div className="mt-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-3 w-24 mt-2" />
            </div>
        </div>
    )
}

// --- Main Page ---
export default function AdminDashboardPage() {
    const { t } = useLanguage()
    const ad = getTranslations(t, "admin")
    const healthPage = getTranslations(ad, "health_page")
    const accountsPage = getTranslations(ad, "accounts_page")
    const usersPage = getTranslations(ad, "users_page")
    const auditPage = getTranslations(ad, "audit_page")
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
            <AdminHeader title={ad.dashboard || "Dashboard"} />

            <div className="flex-1 overflow-auto">
                <div className="p-4 lg:p-6 space-y-4">
                    {/* Primary Stats */}
                    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                        {loading ? (
                            Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
                        ) : (
                            <>
                                <StatCard
                                    title={ad.users || "Total Users"}
                                    value={c?.totalUsers ?? 0}
                                    icon={Users}
                                    tone="info"
                                    trend={a?.newUsersThisWeek ? { value: a.newUsersThisWeek, label: "this week" } : undefined}
                                    description={!a?.newUsersThisWeek ? `${c?.activeUsers ?? 0} ${ad.active || "active"}` : undefined}
                                />
                                <StatCard
                                    title={ad.transactions || "Transactions"}
                                    value={(c?.totalTransactions ?? 0).toLocaleString()}
                                    icon={ArrowLeftRight}
                                    tone="positive"
                                    trend={a?.transactionsThisWeek ? { value: a.transactionsThisWeek, label: "this week" } : undefined}
                                />
                                <StatCard
                                    title={healthPage.logins_today || "Active Today"}
                                    value={a?.loginsToday ?? 0}
                                    icon={LogIn}
                                    tone="warning"
                                    description={`${a?.loginsThisWeek ?? 0} ${healthPage.logins_week ? healthPage.logins_week.toLowerCase() : "this week"}`}
                                />
                                <StatCard
                                    title={healthPage.new_users_today || "New Today"}
                                    value={a?.newUsersToday ?? 0}
                                    icon={UserPlus}
                                    tone="accent"
                                    description={`${a?.newUsersThisWeek ?? 0} ${healthPage.new_users_week ? healthPage.new_users_week.toLowerCase() : "this week"}`}
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
                                <StatCard title={accountsPage.total_accounts || "Bank Accounts"} value={c?.totalAccounts ?? 0} icon={Wallet} tone="info" />
                                <StatCard title={ad.bills || "Bills"} value={c?.totalBills ?? 0} icon={Receipt} tone="warning" />
                                <StatCard title={ad.budgets || "Budgets"} value={c?.totalBudgets ?? 0} icon={PiggyBank} tone="positive" />
                                <StatCard title={ad.goals || "Goals"} value={c?.totalGoals ?? 0} icon={Target} tone="accent" />
                            </>
                        )}
                    </div>

                    {/* Account Status + User Growth Chart */}
                    <div className="grid gap-4 lg:grid-cols-5">
                        {/* Account Status Breakdown */}
                        <div className={`lg:col-span-2 ${UDS.panelSurface}`}>
                            <div className="p-4 border-b">
                                <h3 className="font-semibold">{usersPage.status || "Account Status"}</h3>
                                <p className="text-sm text-neutral-400">{"User distribution by status"}</p>
                            </div>
                            <div className="p-4 space-y-3">
                                {loading ? (
                                    Array.from({ length: 4 }).map((_, i) => (
                                        <Skeleton key={i} className="h-10 w-full" />
                                    ))
                                ) : (
                                    [
                                        { label: ad.active || "Active", value: c?.activeUsers ?? 0, icon: Activity, color: "text-green-600 dark:text-green-400" },
                                        { label: ad.suspended || "Suspended", value: c?.suspendedUsers ?? 0, icon: ShieldAlert, color: "text-yellow-600 dark:text-yellow-400" },
                                        { label: ad.banned || "Banned", value: c?.bannedUsers ?? 0, icon: Ban, color: "text-red-600 dark:text-red-400" },
                                    ].map((item) => (
                                        <div key={item.label} className="flex items-center justify-between py-2">
                                            <div className="flex items-center gap-3">
                                                <item.icon className={`size-4 ${item.color}`} />
                                                <span className="text-sm">{item.label}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-semibold">{item.value}</span>
                                                <span className="text-xs text-neutral-400 w-12 text-right">
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
                        <div className={`lg:col-span-3 ${UDS.panelSurface}`}>
                            <div className="p-4 border-b">
                                <h3 className="font-semibold">User Growth</h3>
                                <p className="text-sm text-neutral-400">{"Signups & total users — last 30 days"}</p>
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
                        <div className={`${UDS.panelSurface}`}>
                            <div className="p-4 border-b flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold">{ad.users_page ? (ad.users || "Recent Users") : "Recent Users"}</h3>
                                    <p className="text-sm text-neutral-400">{"Latest registered accounts"}</p>
                                </div>
                                <Link
                                    href="/admin/users"
                                    className="text-xs text-neutral-400 hover:text-foreground flex items-center gap-1 transition-colors"
                                >
                                    View all <ExternalLink className="size-3" />
                                </Link>
                            </div>
                            <div className="divide-y">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <div key={i} className="flex items-center gap-3 p-4">
                                            <Skeleton className="size-8 sq-full" />
                                            <div className="flex-1 space-y-1.5">
                                                <Skeleton className="h-3.5 w-28" />
                                                <Skeleton className="h-3 w-40" />
                                            </div>
                                            <Skeleton className="h-5 w-14 sq-full" />
                                        </div>
                                    ))
                                ) : data?.recentUsers.length === 0 ? (
                                    <div className="p-8 text-center text-sm text-neutral-400">
                                        No users yet
                                    </div>
                                ) : (
                                    data?.recentUsers.map((user) => (
                                        <div key={user.id} className="flex items-center justify-between p-3 px-4">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="flex size-8 shrink-0 items-center justify-center sq-full bg-primary/10 text-primary text-xs font-medium">
                                                    {user.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "U"}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium truncate">{user.name}</p>
                                                    <p className="text-xs text-neutral-400 truncate">{user.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className={`inline-flex items-center sq-full px-2 py-0.5 text-xs font-medium ${statusColors[user.status] || statusColors.active}`}>
                                                    {user.status}
                                                </span>
                                                <span className="text-xs text-neutral-400 whitespace-nowrap">
                                                    {timeAgo(user.createdAt, ad)}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Audit Log */}
                        <div className={`${UDS.panelSurface}`}>
                            <div className="p-4 border-b flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold">{auditPage.title || "Recent Admin Activity"}</h3>
                                    <p className="text-sm text-neutral-400">{"Latest audit log entries"}</p>
                                </div>
                                <Link
                                    href="/admin/audit-log"
                                    className="text-xs text-neutral-400 hover:text-foreground flex items-center gap-1 transition-colors"
                                >
                                    View all <ExternalLink className="size-3" />
                                </Link>
                            </div>
                            <div className="divide-y">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <div key={i} className="flex items-center gap-3 p-4">
                                            <Skeleton className="size-8 sq-md" />
                                            <div className="flex-1 space-y-1.5">
                                                <Skeleton className="h-3.5 w-32" />
                                                <Skeleton className="h-3 w-48" />
                                            </div>
                                            <Skeleton className="h-3 w-12" />
                                        </div>
                                    ))
                                ) : data?.recentAuditLogs.length === 0 ? (
                                    <div className="p-8 text-center text-sm text-neutral-400">
                                        <ScrollText className="size-8 mx-auto mb-2 text-neutral-400/50" />
                                        <p>No admin activity yet</p>
                                        <p className="text-xs mt-1">Actions will appear here as admins manage the platform</p>
                                    </div>
                                ) : (
                                    data?.recentAuditLogs.map((log) => (
                                        <div key={log.id} className="flex items-start justify-between p-3 px-4 gap-3">
                                            <div className="flex items-start gap-3 min-w-0">
                                                <div className={cn("flex size-7 shrink-0 items-center justify-center text-neutral-400 mt-0.5", UDS.iconSurface)}>
                                                    <ScrollText className="size-3.5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium">{formatAction(log.action)}</p>
                                                    <p className="text-xs text-neutral-400 truncate">
                                                        by {log.performer.name}
                                                        {log.targetUser && <> → {log.targetUser.name}</>}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-xs text-neutral-400 whitespace-nowrap shrink-0">
                                                {timeAgo(log.createdAt, ad)}
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
