"use client"

import * as React from "react"
import Link from "next/link"
import {
    Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    RefreshCw, Filter, ScrollText, Shield,
} from "lucide-react"

import { AdminHeader } from "@/components/admin/admin-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

interface AuditEntry {
    id: string; action: string; entity: string; entityId: string | null
    details: string | null; ipAddress: string | null; createdAt: string
    performer: { id: string; name: string; email: string }
    targetUser: { id: string; name: string; email: string } | null
}
interface Pagination { page: number; limit: number; total: number; totalPages: number }

function actionBadge(action: string) {
    const color = action.includes("ban") || action.includes("delete")
        ? "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
        : action.includes("suspend")
            ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
            : action.includes("create")
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"
    return <Badge variant="outline" className={`font-mono text-xs ${color}`}>{action}</Badge>
}

function parseDetails(details: string | null): string {
    if (!details) return "—"
    try {
        const d = JSON.parse(details)
        return Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(", ")
    } catch { return details }
}

function timeAgo(dateStr: string) {
    const d = new Date(dateStr)
    const diff = Date.now() - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "Just now"
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}d ago`
    return d.toLocaleDateString()
}

export default function AdminAuditLogPage() {
    const [data, setData] = React.useState<AuditEntry[]>([])
    const [pagination, setPagination] = React.useState<Pagination>({ page: 1, limit: 30, total: 0, totalPages: 0 })
    const [loading, setLoading] = React.useState(true)
    const [actionFilter, setActionFilter] = React.useState("")
    const [entityFilter, setEntityFilter] = React.useState("all")

    const searchTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null)
    const [debouncedAction, setDebouncedAction] = React.useState("")
    React.useEffect(() => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current)
        searchTimeout.current = setTimeout(() => setDebouncedAction(actionFilter), 300)
        return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current) }
    }, [actionFilter])

    const fetchData = React.useCallback(async (page = 1) => {
        setLoading(true)
        try {
            const p = new URLSearchParams()
            p.set("page", String(page)); p.set("limit", "30")
            if (debouncedAction) p.set("action", debouncedAction)
            if (entityFilter !== "all") p.set("entity", entityFilter)
            const res = await fetch(`/api/admin/audit-log?${p}`)
            if (!res.ok) throw new Error()
            const json = await res.json()
            setData(json.logs); setPagination(json.pagination)
        } catch { toast.error("Failed to load audit log") }
        finally { setLoading(false) }
    }, [debouncedAction, entityFilter])

    React.useEffect(() => { fetchData(1) }, [fetchData])

    return (
        <>
            <AdminHeader title="Audit Log" breadcrumbs={[{ label: "Audit Log" }]}
                actions={<Button variant="outline" size="sm" onClick={() => fetchData(pagination.page)} disabled={loading}><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>}
            />

            <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
                <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/3 p-3 flex items-center gap-3">
                    <ScrollText className="size-5 text-neutral-500" />
                    <div>
                        <p className="text-sm font-medium">Total Entries</p>
                        <p className="text-2xl font-bold">{loading ? <Skeleton className="h-8 w-16" /> : pagination.total.toLocaleString()}</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
                        <Input label="Filter action" placeholder="Filter by action (e.g. user.suspend)..." value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="pl-9" />
                    </div>
                    <Select value={entityFilter} onValueChange={setEntityFilter}>
                        <SelectTrigger className="w-[130px]" size="sm"><Filter className="size-4" /><SelectValue placeholder="Entity" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Entities</SelectItem>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="announcement">Announcement</SelectItem>
                            <SelectItem value="system">System</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {loading ? <AuditSkeleton /> : data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-black/10 dark:border-white/10 p-12 text-center">
                        <ScrollText className="size-12 text-neutral-300 dark:text-neutral-600 mb-3" />
                        <p className="text-lg font-medium text-neutral-600 dark:text-neutral-400">No audit entries</p>
                    </div>
                ) : (
                    <div className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-black/3 dark:bg-white/3">
                                <TableRow>
                                    <TableHead>When</TableHead>
                                    <TableHead>Action</TableHead>
                                    <TableHead>Performed By</TableHead>
                                    <TableHead>Target User</TableHead>
                                    <TableHead>Details</TableHead>
                                    <TableHead>IP</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map(entry => (
                                    <TableRow key={entry.id}>
                                        <TableCell className="text-sm text-neutral-500 whitespace-nowrap">{timeAgo(entry.createdAt)}</TableCell>
                                        <TableCell>{actionBadge(entry.action)}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Shield className="size-3 text-blue-500 shrink-0" />
                                                <Link href={`/admin/users/${entry.performer.id}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">{entry.performer.name}</Link>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {entry.targetUser ? (
                                                <Link href={`/admin/users/${entry.targetUser.id}`} className="text-sm text-neutral-600 dark:text-neutral-400 hover:underline">{entry.targetUser.name}</Link>
                                            ) : <span className="text-xs text-neutral-400">—</span>}
                                        </TableCell>
                                        <TableCell className="max-w-[200px] truncate text-xs text-neutral-500">{parseDetails(entry.details)}</TableCell>
                                        <TableCell className="text-xs text-neutral-400 font-mono">{entry.ipAddress || "—"}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}

                {!loading && pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-neutral-500 hidden lg:block">Page {pagination.page} of {pagination.totalPages} ({pagination.total} entries)</p>
                        <div className="flex items-center gap-1 ml-auto">
                            <Button variant="outline" size="icon" className="size-8" disabled={pagination.page <= 1} onClick={() => fetchData(1)}><ChevronsLeft className="size-4" /></Button>
                            <Button variant="outline" size="icon" className="size-8" disabled={pagination.page <= 1} onClick={() => fetchData(pagination.page - 1)}><ChevronLeft className="size-4" /></Button>
                            <span className="px-3 text-sm text-neutral-600 dark:text-neutral-400">{pagination.page} / {pagination.totalPages}</span>
                            <Button variant="outline" size="icon" className="size-8" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchData(pagination.page + 1)}><ChevronRight className="size-4" /></Button>
                            <Button variant="outline" size="icon" className="size-8" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchData(pagination.totalPages)}><ChevronsRight className="size-4" /></Button>
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}

function AuditSkeleton() {
    return (
        <div className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
            <Table>
                <TableHeader className="bg-black/3 dark:bg-white/3">
                    <TableRow>{["When","Action","Performed By","Target","Details","IP"].map((h,i) => <TableHead key={i}>{h}</TableHead>)}</TableRow>
                </TableHeader>
                <TableBody>
                    {[...Array(10)].map((_,i) => (
                        <TableRow key={i}>
                            {[16,24,24,20,32,16].map((w,j) => <TableCell key={j}><Skeleton className="h-4" style={{width: w*4}} /></TableCell>)}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
