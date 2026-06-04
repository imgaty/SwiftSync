//
//  page.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Renders the /admin/audit-log route in Argent, composing page-level layout, data
//  dependencies, and feature components for that user-facing screen.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import Link from "next/link"
import {
    RefreshCw, Filter, ScrollText, Shield,
} from "lucide-react"

import { AdminHeader } from "@/components/admin/admin-header"
import { useLanguage } from "@/components/language-provider"
import { UDS } from "@/lib/UDS"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableEmptyRow,
    TableHead,
    TableHeader,
    TablePaginationBar,
    TableRow,
    TableSearchControl,
    TableSkeletonRows,
    TableToolbar,
    TableToolbarGroup,
    UniversalTable,
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
type AdminCopy = Record<string, string | undefined> & {
    audit_page?: Record<string, string>
}

function actionBadge(action: string) {
    const color = action.includes("ban") || action.includes("delete")
        ? UDS.destructiveBadge
        : action.includes("suspend")
            ? UDS.semanticBadge.warning
            : action.includes("create")
                ? UDS.semanticBadge.positive
                : UDS.semanticBadge.info
    return <Badge variant="outline" className={`font-mono text-xs ${color}`}>{action}</Badge>
}

function parseDetails(details: string | null): string {
    if (!details) return "—"
    try {
        const d = JSON.parse(details)
        return Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(", ")
    } catch { return details }
}

function timeAgo(dateStr: string, ad: Record<string, string | undefined> = {}) {
    const d = new Date(dateStr)
    const diff = Date.now() - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return ad.just_now || "Just now"
    if (mins < 60) return `${mins}${ad.m_ago || "m ago"}`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}${ad.h_ago || "h ago"}`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}${ad.d_ago || "d ago"}`
    return d.toLocaleDateString()
}

export default function AdminAuditLogPage() {
    const { t } = useLanguage()
    const ad = ((t as { admin?: AdminCopy }).admin || {}) as AdminCopy
    const al = ad.audit_page || {}

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
        } catch { toast.error(al.failed_load || "Failed to load audit log") }
        finally { setLoading(false) }
    }, [debouncedAction, entityFilter, al.failed_load])

    React.useEffect(() => { fetchData(1) }, [fetchData])

    const toolbar = (
        <TableToolbar>
            <TableToolbarGroup>
                <TableSearchControl
                    value={actionFilter}
                    onValueChange={setActionFilter}
                    placeholder={al.filter_placeholder || "Filter by action (e.g. user.suspend)..."}
                    width={320}
                />
                <Select value={entityFilter} onValueChange={setEntityFilter}>
                    <SelectTrigger className="w-[145px]" size="sm">
                        <Filter className="size-3.5" />
                        <SelectValue placeholder={al.entity || "Entity"} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{al.all_entities || "All Entities"}</SelectItem>
                        <SelectItem value="user">{al.user || "User"}</SelectItem>
                        <SelectItem value="announcement">{al.announcement || "Announcement"}</SelectItem>
                        <SelectItem value="system">{al.system_entity || "System"}</SelectItem>
                    </SelectContent>
                </Select>
            </TableToolbarGroup>
        </TableToolbar>
    )

    return (
        <>
            <AdminHeader title={al.title || "Audit Log"} breadcrumbs={[{ label: al.title || "Audit Log" }]}
                actions={<Button variant="glass" size="sm" onClick={() => fetchData(pagination.page)} disabled={loading}><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> {ad.refresh || "Refresh"}</Button>}
            />

            <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
                <div className={`${UDS.summaryTileSurface} flex items-center gap-3`}>
                    <ScrollText className="size-4 text-neutral-400" />
                    <div>
                        <p className={UDS.summaryLabel}>{al.total_entries || "Total Entries"}</p>
                        <p className={UDS.summaryValue}>{loading ? <Skeleton className="h-6 w-16" /> : pagination.total.toLocaleString()}</p>
                    </div>
                </div>

                <UniversalTable
                    toolbar={toolbar}
                    maxHeight="calc(100vh - 18rem)"
                    footer={!loading && pagination.totalPages > 1 ? (
                        <TablePaginationBar
                            page={pagination.page}
                            totalPages={pagination.totalPages}
                            pageSize={pagination.limit}
                            total={pagination.total}
                            label={ad.showing_range || "Showing"}
                            onFirst={() => fetchData(1)}
                            onPrevious={() => fetchData(pagination.page - 1)}
                            onNext={() => fetchData(pagination.page + 1)}
                            onLast={() => fetchData(pagination.totalPages)}
                        />
                    ) : undefined}
                >
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{al.col_when || "When"}</TableHead>
                                    <TableHead>{al.col_action || "Action"}</TableHead>
                                    <TableHead>{al.col_performed_by || "Performed By"}</TableHead>
                                    <TableHead>{al.col_target_user || "Target User"}</TableHead>
                                    <TableHead>{al.col_details || "Details"}</TableHead>
                                    <TableHead>{al.col_ip || "IP"}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableSkeletonRows rows={10} columns={6} widths={[88, 132, 144, 128, 180, 92]} />
                                ) : data.length === 0 ? (
                                    <TableEmptyRow
                                        colSpan={6}
                                        title={al.no_entries || "No audit entries"}
                                        description={al.no_entries_hint || "Audit events will appear here after admin actions."}
                                    />
                                ) : data.map(entry => (
                                    <TableRow key={entry.id}>
                                        <TableCell className="text-sm text-neutral-400 whitespace-nowrap">{timeAgo(entry.createdAt, ad)}</TableCell>
                                        <TableCell>{actionBadge(entry.action)}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Shield className="size-3 text-blue-500 shrink-0" />
                                                <Link href={`/admin/users/${entry.performer.id}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">{entry.performer.name}</Link>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {entry.targetUser ? (
                                                <Link href={`/admin/users/${entry.targetUser.id}`} className="text-sm text-neutral-400 hover:underline">{entry.targetUser.name}</Link>
                                            ) : <span className="text-xs text-neutral-400">—</span>}
                                        </TableCell>
                                        <TableCell className="max-w-[200px] truncate text-xs text-neutral-400">{parseDetails(entry.details)}</TableCell>
                                        <TableCell className="text-xs text-neutral-400 font-mono">{entry.ipAddress || "—"}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                </UniversalTable>
            </div>
        </>
    )
}
