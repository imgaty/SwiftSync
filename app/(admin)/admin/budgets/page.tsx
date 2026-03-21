"use client"

import * as React from "react"
import Link from "next/link"
import {
    Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    ArrowUpDown, RefreshCw, PiggyBank,
} from "lucide-react"

import { AdminHeader } from "@/components/admin/admin-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

interface BudgetItem {
    id: string; tag: string; category: string; limit: number; color: string
    createdAt: string
    user: { id: string; name: string; email: string }
}
interface Pagination { page: number; limit: number; total: number; totalPages: number }

function formatCurrency(v: number) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(v)
}

export default function AdminBudgetsPage() {
    const [data, setData] = React.useState<BudgetItem[]>([])
    const [pagination, setPagination] = React.useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
    const [totalLimit, setTotalLimit] = React.useState(0)
    const [loading, setLoading] = React.useState(true)
    const [search, setSearch] = React.useState("")
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
            p.set("sortBy", sortBy); p.set("sortDir", sortDir)
            const res = await fetch(`/api/admin/budgets?${p}`)
            if (!res.ok) throw new Error()
            const json = await res.json()
            setData(json.budgets); setPagination(json.pagination)
            setTotalLimit(Number(json.summary.totalBudgetLimit))
        } catch { toast.error("Failed to load budgets") }
        finally { setLoading(false) }
    }, [debouncedSearch, sortBy, sortDir])

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
            <AdminHeader title="Budgets" breadcrumbs={[{ label: "Budgets" }]}
                actions={<Button variant="outline" size="sm" onClick={() => fetchData(pagination.page)} disabled={loading}><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/3 p-3">
                        <p className="text-xs text-neutral-500 flex items-center gap-1"><PiggyBank className="size-3" /> Total Budgets</p>
                        <p className="text-xl font-bold">{loading ? <Skeleton className="h-7 w-16" /> : pagination.total}</p>
                    </div>
                    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/3 p-3">
                        <p className="text-xs text-neutral-500">Combined Budget Limit</p>
                        <p className="text-xl font-bold">{loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(totalLimit)}</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
                        <Input label="Search" placeholder="Search by category..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                    </div>
                </div>

                {loading ? <TableSkeleton /> : data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-black/10 dark:border-white/10 p-12 text-center">
                        <p className="text-lg font-medium text-neutral-600 dark:text-neutral-400">No budgets found</p>
                    </div>
                ) : (
                    <div className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-black/3 dark:bg-white/3">
                                <TableRow>
                                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("category")}>Category <SortIcon field="category" /></TableHead>
                                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("tag")}>Tag <SortIcon field="tag" /></TableHead>
                                    <TableHead>Owner</TableHead>
                                    <TableHead>Color</TableHead>
                                    <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("limit")}>Limit <SortIcon field="limit" /></TableHead>
                                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("createdAt")}>Created <SortIcon field="createdAt" /></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map(b => (
                                    <TableRow key={b.id}>
                                        <TableCell className="font-medium">{b.category}</TableCell>
                                        <TableCell><Badge variant="outline" className="capitalize text-xs">{b.tag}</Badge></TableCell>
                                        <TableCell>
                                            <Link href={`/admin/users/${b.user.id}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">{b.user.name}</Link>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="size-4 rounded-full border" style={{ backgroundColor: b.color }} />
                                                <span className="text-xs text-neutral-500 font-mono">{b.color}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm">{formatCurrency(Number(b.limit))}</TableCell>
                                        <TableCell className="text-sm text-neutral-500">{new Date(b.createdAt).toLocaleDateString()}</TableCell>
                                    </TableRow>
                                ))}
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
                    <TableRow>{["Category","Tag","Owner","Color","Limit","Created"].map((h,i) => <TableHead key={i}>{h}</TableHead>)}</TableRow>
                </TableHeader>
                <TableBody>
                    {[...Array(8)].map((_,i) => (
                        <TableRow key={i}>
                            {[28,16,24,20,20,20].map((w,j) => <TableCell key={j}><Skeleton className="h-4" style={{width: w*4}} /></TableCell>)}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
