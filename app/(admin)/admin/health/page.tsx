"use client"

import * as React from "react"
import {
    Activity, Database, Server, Shield, Users, ArrowLeftRight,
    Receipt, PiggyBank, Target, Wallet, Bell, ScrollText, Megaphone,
    RefreshCw, CheckCircle, Clock, Zap, Globe, HardDrive,
} from "lucide-react"

import { AdminHeader } from "@/components/admin/admin-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

interface HealthData {
    status: string
    timestamp: string
    database: { connected: boolean; latencyMs: number; totalRecords: number }
    tables: Record<string, number>
    security: { twoFaEnabled: number; twoFaPercentage: number }
    activity: Record<string, number>
    runtime: {
        nodeVersion: string; platform: string; uptime: number
        memory: { heapUsed: number; heapTotal: number; rss: number; external: number }
    }
}

function formatUptime(seconds: number): string {
    const d = Math.floor(seconds / 86400)
    const h = Math.floor((seconds % 86400) / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    if (d > 0) return `${d}d ${h}h ${m}m`
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
}

export default function AdminHealthPage() {
    const [data, setData] = React.useState<HealthData | null>(null)
    const [loading, setLoading] = React.useState(true)
    const [lastFetched, setLastFetched] = React.useState<Date | null>(null)

    const fetchData = React.useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/admin/health")
            if (!res.ok) throw new Error()
            setData(await res.json())
            setLastFetched(new Date())
        } catch { toast.error("Failed to load health data") }
        finally { setLoading(false) }
    }, [])

    React.useEffect(() => { fetchData() }, [fetchData])

    // Auto-refresh every 30 seconds
    React.useEffect(() => {
        const interval = setInterval(fetchData, 30000)
        return () => clearInterval(interval)
    }, [fetchData])

    return (
        <>
            <AdminHeader title="System Health" breadcrumbs={[{ label: "System Health" }]}
                actions={
                    <div className="flex items-center gap-2">
                        {lastFetched && <span className="text-xs text-neutral-500">Updated {lastFetched.toLocaleTimeString()}</span>}
                        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
                        </Button>
                    </div>
                }
            />

            <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
                {loading && !data ? <HealthSkeleton /> : data && (
                    <>
                        {/* Status Banner */}
                        <div className={`rounded-xl border p-4 flex items-center gap-3 ${data.status === "healthy" ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                            {data.status === "healthy"
                                ? <CheckCircle className="size-6 text-emerald-500" />
                                : <Activity className="size-6 text-red-500" />}
                            <div>
                                <p className="font-semibold">{data.status === "healthy" ? "All Systems Operational" : "System Issues Detected"}</p>
                                <p className="text-sm text-neutral-500">Last checked: {new Date(data.timestamp).toLocaleString()}</p>
                            </div>
                            <Badge variant="outline" className={`ml-auto ${data.status === "healthy" ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400" : "border-red-500/30 text-red-600"}`}>
                                {data.status.toUpperCase()}
                            </Badge>
                        </div>

                        {/* Row 1: Database + Runtime */}
                        <div className="grid gap-4 lg:grid-cols-2">
                            {/* Database */}
                            <div className="rounded-xl border border-black/10 dark:border-white/10 p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <Database className="size-5 text-blue-500" />
                                    <h3 className="font-semibold">Database</h3>
                                    <Badge variant="outline" className="ml-auto border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs">Connected</Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <MetricRow icon={<Zap className="size-4" />} label="Query Latency" value={`${data.database.latencyMs}ms`}
                                        status={data.database.latencyMs < 100 ? "good" : data.database.latencyMs < 500 ? "warn" : "bad"} />
                                    <MetricRow icon={<Users className="size-4" />} label="User Records" value={data.database.totalRecords.toLocaleString()} />
                                </div>
                            </div>

                            {/* Runtime */}
                            <div className="rounded-xl border border-black/10 dark:border-white/10 p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <Server className="size-5 text-purple-500" />
                                    <h3 className="font-semibold">Runtime</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <MetricRow icon={<Globe className="size-4" />} label="Node.js" value={data.runtime.nodeVersion} />
                                    <MetricRow icon={<Clock className="size-4" />} label="Uptime" value={formatUptime(data.runtime.uptime)} />
                                    <MetricRow icon={<HardDrive className="size-4" />} label="Heap Used" value={`${data.runtime.memory.heapUsed} MB`}
                                        status={data.runtime.memory.heapUsed < 200 ? "good" : data.runtime.memory.heapUsed < 500 ? "warn" : "bad"} />
                                    <MetricRow icon={<HardDrive className="size-4" />} label="RSS Memory" value={`${data.runtime.memory.rss} MB`} />
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Security */}
                        <div className="rounded-xl border border-black/10 dark:border-white/10 p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Shield className="size-5 text-emerald-500" />
                                <h3 className="font-semibold">Security</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                                <div>
                                    <p className="text-xs text-neutral-500">2FA Adoption</p>
                                    <p className="text-2xl font-bold">{data.security.twoFaPercentage}%</p>
                                    <p className="text-xs text-neutral-500">{data.security.twoFaEnabled} users</p>
                                </div>
                                <div>
                                    <p className="text-xs text-neutral-500">Logins Today</p>
                                    <p className="text-2xl font-bold">{data.activity.loginsToday}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-neutral-500">Logins This Week</p>
                                    <p className="text-2xl font-bold">{data.activity.loginsThisWeek}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-neutral-500">Audit Events</p>
                                    <p className="text-2xl font-bold">{data.tables.auditLogs.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        {/* Row 3: Activity */}
                        <div className="rounded-xl border border-black/10 dark:border-white/10 p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Activity className="size-5 text-orange-500" />
                                <h3 className="font-semibold">Recent Activity</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                                <div>
                                    <p className="text-xs text-neutral-500">New Users Today</p>
                                    <p className="text-2xl font-bold">{data.activity.newUsersToday}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-neutral-500">New Users This Week</p>
                                    <p className="text-2xl font-bold">{data.activity.newUsersThisWeek}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-neutral-500">Transactions Today</p>
                                    <p className="text-2xl font-bold">{data.activity.transactionsToday}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-neutral-500">Transactions This Week</p>
                                    <p className="text-2xl font-bold">{data.activity.transactionsThisWeek}</p>
                                </div>
                            </div>
                        </div>

                        {/* Row 4: Data Volumes */}
                        <div className="rounded-xl border border-black/10 dark:border-white/10 p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Database className="size-5 text-sky-500" />
                                <h3 className="font-semibold">Data Volumes</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                                <TableCount icon={<Users className="size-4" />} label="Users" count={data.tables.users} active={data.tables.activeUsers} />
                                <TableCount icon={<ArrowLeftRight className="size-4" />} label="Transactions" count={data.tables.transactions} />
                                <TableCount icon={<Wallet className="size-4" />} label="Accounts" count={data.tables.accounts} />
                                <TableCount icon={<Receipt className="size-4" />} label="Bills" count={data.tables.bills} />
                                <TableCount icon={<PiggyBank className="size-4" />} label="Budgets" count={data.tables.budgets} />
                                <TableCount icon={<Target className="size-4" />} label="Goals" count={data.tables.goals} />
                                <TableCount icon={<Bell className="size-4" />} label="Notifications" count={data.tables.notifications} />
                                <TableCount icon={<ScrollText className="size-4" />} label="Audit Logs" count={data.tables.auditLogs} />
                                <TableCount icon={<Megaphone className="size-4" />} label="Announcements" count={data.tables.announcements} active={data.tables.activeAnnouncements} />
                                <TableCount icon={<Globe className="size-4" />} label="Salt Edge" count={data.tables.saltEdgeConnections} />
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    )
}

// ---------- Sub-components ----------

function MetricRow({ icon, label, value, status }: {
    icon: React.ReactNode; label: string; value: string; status?: "good" | "warn" | "bad"
}) {
    const statusColor = status === "good" ? "text-emerald-600 dark:text-emerald-400"
        : status === "warn" ? "text-amber-600 dark:text-amber-400"
            : status === "bad" ? "text-red-600 dark:text-red-400" : ""
    return (
        <div className="flex items-start gap-2">
            <div className="text-neutral-400 mt-0.5">{icon}</div>
            <div>
                <p className="text-xs text-neutral-500">{label}</p>
                <p className={`font-semibold ${statusColor}`}>{value}</p>
            </div>
        </div>
    )
}

function TableCount({ icon, label, count, active }: {
    icon: React.ReactNode; label: string; count: number; active?: number
}) {
    return (
        <div className="rounded-lg bg-black/2 dark:bg-white/3 border border-black/5 dark:border-white/5 p-2.5">
            <div className="flex items-center gap-1.5 text-neutral-500 text-xs mb-1">{icon} {label}</div>
            <p className="text-lg font-bold">{count.toLocaleString()}</p>
            {active !== undefined && <p className="text-xs text-emerald-600 dark:text-emerald-400">{active} active</p>}
        </div>
    )
}

function HealthSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-16 w-full rounded-xl" />
            <div className="grid gap-4 lg:grid-cols-2">
                <Skeleton className="h-40 rounded-xl" />
                <Skeleton className="h-40 rounded-xl" />
            </div>
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
        </div>
    )
}
