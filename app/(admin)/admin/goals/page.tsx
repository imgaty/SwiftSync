"use client"

import * as React from "react"
import Link from "next/link"
import {
    Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    ArrowUpDown, RefreshCw, Filter, Target, CheckCircle, XCircle,
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

interface Goal {
    id: string; name: string; targetAmount: number; currentAmount: number
    deadline: string | null; category: string; color: string; status: string
    createdAt: string
    user: { id: string; name: string; email: string }
}
interface Pagination { page: number; limit: number; total: number; totalPages: number }

function formatCurrency(v: number) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(v)
}

function goalStatusBadge(status: string) {
    switch (status) {
        case "active": return <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs"><Target className="size-3" />Active</Badge>
        case "completed": return <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs"><CheckCircle className="size-3" />Done</Badge>
        case "cancelled": return <Badge variant="outline" className="border-neutral-500/30 bg-neutral-500/10 text-neutral-500 text-xs"><XCircle className="size-3" />Cancelled</Badge>
        default: return <Badge variant="outline" className="text-xs capitalize">{status}</Badge>
    }
}

export default function AdminGoalsPage() {
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
        } catch { toast.error("Failed to load goals") }
        finally { setLoading(false) }
    }, [debouncedSearch, statusFilter, sortBy, sortDir])

    React.useEffect(() => { fetchData(1) }, [fetchData])

    const toggleSort = (f: string) => {
        if (sortBy === f) setSortDir(d => d === "asc" ? "desc" : "asc")
        else { setSortBy(f); setSortDir("desc") }
    }
    const SortIcon = ({ field }: { field: string }) => (
        <ArrowUpDown className={`ml-1 inline size-3 ${sortBy === field ? "text-blue-500" : "text-neutral-400"}`} />
    )

    return (
        <>
            <AdminHeader title="Goals" breadcrumbs={[{ label: "Goals" }]}
                actions={<Button variant="outline" size="sm" onClick={() => fetchData(pagination.page)} disabled={loading}><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
                <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/3 p-3">
                        <p className="text-xs text-neutral-500 flex items-center gap-1"><Target className="size-3" /> Total Goals</p>
                        <p className="text-xl font-bold">{loading ? <Skeleton className="h-7 w-16" /> : pagination.total}</p>
                    </div>
                    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/3 p-3">
                        <p className="text-xs text-neutral-500">Target Total</p>
                        <p className="text-xl font-bold">{loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(summary.totalTarget)}</p>
                    </div>
                    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/3 p-3">
                        <p className="text-xs text-neutral-500">Saved So Far</p>
                        <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(summary.totalCurrent)}</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
                        <Input label="Search" placeholder="Search goals..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[130px]" size="sm"><Filter className="size-4" /><SelectValue placeholder="Status" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {loading ? <TableSkeleton /> : data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-black/10 dark:border-white/10 p-12 text-center">
                        <p className="text-lg font-medium text-neutral-600 dark:text-neutral-400">No goals found</p>
                    </div>
                ) : (
                    <div className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-black/3 dark:bg-white/3">
                                <TableRow>
                                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("name")}>Name <SortIcon field="name" /></TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Owner</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Progress</TableHead>
                                    <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("targetAmount")}>Target <SortIcon field="targetAmount" /></TableHead>
                                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("deadline")}>Deadline <SortIcon field="deadline" /></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map(g => {
                                    const pct = Number(g.targetAmount) > 0 ? Math.min(100, Math.round((Number(g.currentAmount) / Number(g.targetAmount)) * 100)) : 0
                                    return (
                                        <TableRow key={g.id}>
                                            <TableCell className="font-medium">{g.name}</TableCell>
                                            <TableCell><Badge variant="outline" className="capitalize text-xs">{g.category}</Badge></TableCell>
                                            <TableCell>
                                                <Link href={`/admin/users/${g.user.id}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">{g.user.name}</Link>
                                            </TableCell>
                                            <TableCell>{goalStatusBadge(g.status)}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-2 w-20 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                                                        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                                                    </div>
                                                    <span className="text-xs text-neutral-500">{pct}%</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-sm">{formatCurrency(Number(g.targetAmount))}</TableCell>
                                            <TableCell className="text-sm text-neutral-500">{g.deadline ? new Date(g.deadline).toLocaleDateString() : "—"}</TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}

                {!loading && pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-neutral-500 hidden lg:block">Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}</p>
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

function TableSkeleton() {
    return (
        <div className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
            <Table>
                <TableHeader className="bg-black/3 dark:bg-white/3">
                    <TableRow>{["Name","Category","Owner","Status","Progress","Target","Deadline"].map((h,i) => <TableHead key={i}>{h}</TableHead>)}</TableRow>
                </TableHeader>
                <TableBody>
                    {[...Array(8)].map((_,i) => (
                        <TableRow key={i}>
                            {[28,16,24,16,24,20,20].map((w,j) => <TableCell key={j}><Skeleton className="h-4" style={{width: w*4}} /></TableCell>)}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
