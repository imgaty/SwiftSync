//
//  page.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Renders the /admin/goals route in Argent, composing page-level layout, data
//  dependencies, and feature components for that user-facing screen.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import Link from "next/link"
import {
    RefreshCw, Filter, Target, CheckCircle, XCircle,
} from "lucide-react"

import { AdminHeader } from "@/components/admin/admin-header"
import { useLanguage } from "@/components/language-provider"
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
    TableSortHeader,
    TableToolbar,
    TableToolbarGroup,
    UniversalTable,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

interface Goal {
    id: string; name: string; targetAmount: number; currentAmount: number
    deadline: string | null; category: string; color: string; status: string
    createdAt: string
    user: { id: string; name: string; email: string }
}
interface Pagination { page: number; limit: number; total: number; totalPages: number }
type AdminCopy = Record<string, string | undefined> & {
    goals_page?: Record<string, string>
}

function formatCurrency(v: number) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(v)
}

function goalStatusBadge(status: string, labels: Record<string, string>) {
    switch (status) {
        case "active": return <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs"><Target className="size-3" />{labels.active || "Active"}</Badge>
        case "completed": return <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs"><CheckCircle className="size-3" />{labels.done || "Done"}</Badge>
        case "cancelled": return <Badge variant="outline" className="border-neutral-500/30 bg-neutral-500/10 text-neutral-400 text-xs"><XCircle className="size-3" />{labels.cancelled || "Cancelled"}</Badge>
        default: return <Badge variant="outline" className="text-xs capitalize">{status}</Badge>
    }
}

export default function AdminGoalsPage() {
    const { t } = useLanguage()
    const ad = ((t as { admin?: AdminCopy }).admin || {}) as AdminCopy
    const gp = ad.goals_page || {}

    const [data, setData] = React.useState<Goal[]>([])
    const [pagination, setPagination] = React.useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
    const [summary, setSummary] = React.useState({ totalTarget: 0, totalCurrent: 0 })
    const [loading, setLoading] = React.useState(true)
    const [search, setSearch] = React.useState("")
    const [statusFilter, setStatusFilter] = React.useState("all")
    const [sortBy, setSortBy] = React.useState("createdAt")
    const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc")

    const searchTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null)
    const [debouncedSearch, setDebouncedSearch] = React.useState("")
    React.useEffect(() => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current)
        searchTimeout.current = setTimeout(() => setDebouncedSearch(search), 300)
        return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current) }
    }, [search])

    const fetchData = React.useCallback(async (page = 1) => {
        setLoading(true)
        try {
            const p = new URLSearchParams()
            p.set("page", String(page)); p.set("limit", "20")
            if (debouncedSearch) p.set("search", debouncedSearch)
            if (statusFilter !== "all") p.set("status", statusFilter)
            p.set("sortBy", sortBy); p.set("sortDir", sortDir)
            const res = await fetch(`/api/admin/goals?${p}`)
            if (!res.ok) throw new Error()
            const json = await res.json()
            setData(json.goals); setPagination(json.pagination)
            setSummary({ totalTarget: Number(json.summary.totalTarget), totalCurrent: Number(json.summary.totalCurrent) })
        } catch { toast.error(gp.failed_load || "Failed to load goals") }
        finally { setLoading(false) }
    }, [debouncedSearch, statusFilter, sortBy, sortDir, gp.failed_load])

    React.useEffect(() => { fetchData(1) }, [fetchData])

    const toggleSort = (f: string) => {
        if (sortBy === f) setSortDir(d => d === "asc" ? "desc" : "asc")
        else { setSortBy(f); setSortDir("desc") }
    }
    const sortDirection = (field: string) => sortBy === field ? sortDir : undefined

    const toolbar = (
        <TableToolbar>
            <TableToolbarGroup>
                <TableSearchControl
                    value={search}
                    onValueChange={setSearch}
                    placeholder={gp.search_placeholder || "Search goals..."}
                    width={280}
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]" size="sm">
                        <Filter className="size-4" />
                        <SelectValue placeholder={gp.status || "Status"} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{gp.all_status || "All Status"}</SelectItem>
                        <SelectItem value="active">{gp.active || "Active"}</SelectItem>
                        <SelectItem value="completed">{gp.completed || "Completed"}</SelectItem>
                        <SelectItem value="cancelled">{gp.cancelled || "Cancelled"}</SelectItem>
                    </SelectContent>
                </Select>
            </TableToolbarGroup>
        </TableToolbar>
    )

    return (
        <>
            <AdminHeader title={ad.goals || "Goals"} breadcrumbs={[{ label: ad.goals || "Goals" }]}
                actions={<Button variant="glass" size="sm" onClick={() => fetchData(pagination.page)} disabled={loading}><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> {ad.refresh || "Refresh"}</Button>}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
                <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/3 p-3">
                        <p className="text-xs text-neutral-400 flex items-center gap-1"><Target className="size-3" /> {gp.total_goals || "Total Goals"}</p>
                        <p className="text-xl font-bold">{loading ? <Skeleton className="h-7 w-16" /> : pagination.total}</p>
                    </div>
                    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/3 p-3">
                        <p className="text-xs text-neutral-400">{gp.target_total || "Target Total"}</p>
                        <p className="text-xl font-bold">{loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(summary.totalTarget)}</p>
                    </div>
                    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/3 p-3">
                        <p className="text-xs text-neutral-400">{gp.saved_so_far || "Saved So Far"}</p>
                        <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(summary.totalCurrent)}</p>
                    </div>
                </div>

                <UniversalTable
                    toolbar={toolbar}
                    maxHeight="calc(100vh - 20rem)"
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
                                    <TableHead>
                                        <TableSortHeader direction={sortDirection("name")} onClick={() => toggleSort("name")}>
                                            {gp.col_name || "Name"}
                                        </TableSortHeader>
                                    </TableHead>
                                    <TableHead>{gp.col_category || "Category"}</TableHead>
                                    <TableHead>{gp.col_owner || "Owner"}</TableHead>
                                    <TableHead>{gp.col_status || "Status"}</TableHead>
                                    <TableHead>{gp.col_progress || "Progress"}</TableHead>
                                    <TableHead>
                                        <TableSortHeader direction={sortDirection("targetAmount")} onClick={() => toggleSort("targetAmount")} align="right">
                                            {gp.col_target || "Target"}
                                        </TableSortHeader>
                                    </TableHead>
                                    <TableHead>
                                        <TableSortHeader direction={sortDirection("deadline")} onClick={() => toggleSort("deadline")}>
                                            {gp.col_deadline || "Deadline"}
                                        </TableSortHeader>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableSkeletonRows rows={8} columns={7} widths={[144, 92, 128, 92, 132, 104, 96]} />
                                ) : data.length === 0 ? (
                                    <TableEmptyRow
                                        colSpan={7}
                                        title={gp.no_goals || "No goals found"}
                                        description={gp.no_goals_hint || "Try changing the search or status filter."}
                                    />
                                ) : data.map(g => {
                                    const pct = Number(g.targetAmount) > 0 ? Math.min(100, Math.round((Number(g.currentAmount) / Number(g.targetAmount)) * 100)) : 0
                                    return (
                                        <TableRow key={g.id}>
                                            <TableCell className="font-medium">{g.name}</TableCell>
                                            <TableCell><Badge variant="outline" className="capitalize text-xs">{g.category}</Badge></TableCell>
                                            <TableCell>
                                                <Link href={`/admin/users/${g.user.id}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">{g.user.name}</Link>
                                            </TableCell>
                                            <TableCell>{goalStatusBadge(g.status, gp)}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-2 w-20 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                                                        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                                                    </div>
                                                    <span className="text-xs text-neutral-400">{pct}%</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-sm">{formatCurrency(Number(g.targetAmount))}</TableCell>
                                            <TableCell className="text-sm text-neutral-400">{g.deadline ? new Date(g.deadline).toLocaleDateString() : "—"}</TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                </UniversalTable>
            </div>
        </>
    )
}
