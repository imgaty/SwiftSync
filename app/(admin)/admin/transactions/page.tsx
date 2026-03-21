"use client"

import * as React from "react"
import Link from "next/link"
import {
    Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    ArrowUpDown, RefreshCw, ArrowUpRight, ArrowDownRight, Filter,
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

interface Transaction {
    id: string; date: string; type: string; amount: number; description: string
    tags: string[]; accountId: string; createdAt: string
    user: { id: string; name: string; email: string }
}
interface Pagination { page: number; limit: number; total: number; totalPages: number }
interface Summary { totalIncome: number; totalExpenses: number; count: number }

function formatCurrency(v: number) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(v)
}

export default function AdminTransactionsPage() {
    const [data, setData] = React.useState<Transaction[]>([])
    const [pagination, setPagination] = React.useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
    const [summary, setSummary] = React.useState<Summary>({ totalIncome: 0, totalExpenses: 0, count: 0 })
    const [loading, setLoading] = React.useState(true)
    const [search, setSearch] = React.useState("")
    const [typeFilter, setTypeFilter] = React.useState("all")
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
            if (typeFilter !== "all") p.set("type", typeFilter)
            p.set("sortBy", sortBy); p.set("sortDir", sortDir)
            const res = await fetch(`/api/admin/transactions?${p}`)
            if (!res.ok) throw new Error()
            const json = await res.json()
            setData(json.transactions); setPagination(json.pagination); setSummary(json.summary)
        } catch { toast.error("Failed to load transactions") }
        finally { setLoading(false) }
    }, [debouncedSearch, typeFilter, sortBy, sortDir])

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
            <AdminHeader title="Transactions" breadcrumbs={[{ label: "Transactions" }]}
                actions={<Button variant="outline" size="sm" onClick={() => fetchData(pagination.page)} disabled={loading}><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/3 p-3">
                        <p className="text-xs text-neutral-500 flex items-center gap-1"><ArrowUpRight className="size-3 text-emerald-500" /> Total Income</p>
                        <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{loading ? <Skeleton className="h-7 w-24" /> : formatCurrency(Number(summary.totalIncome))}</p>
                    </div>
                    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/3 p-3">
                        <p className="text-xs text-neutral-500 flex items-center gap-1"><ArrowDownRight className="size-3 text-red-500" /> Total Expenses</p>
                        <p className="text-xl font-bold text-red-600 dark:text-red-400">{loading ? <Skeleton className="h-7 w-24" /> : formatCurrency(Number(summary.totalExpenses))}</p>
                    </div>
                    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/3 p-3">
                        <p className="text-xs text-neutral-500">Total Count</p>
                        <p className="text-xl font-bold">{loading ? <Skeleton className="h-7 w-16" /> : summary.count.toLocaleString()}</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
                        <Input label="Search" placeholder="Search by description..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                    </div>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-[120px]" size="sm"><Filter className="size-4" /><SelectValue placeholder="Type" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="in">Income</SelectItem>
                            <SelectItem value="out">Expense</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Table */}
                {loading ? <TableSkeleton /> : data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-black/10 dark:border-white/10 p-12 text-center">
                        <p className="text-lg font-medium text-neutral-600 dark:text-neutral-400">No transactions found</p>
                    </div>
                ) : (
                    <div className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-black/3 dark:bg-white/3">
                                <TableRow>
                                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("date")}>Date <SortIcon field="date" /></TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>Tags</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("amount")}>Amount <SortIcon field="amount" /></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map(tx => (
                                    <TableRow key={tx.id}>
                                        <TableCell className="text-sm">{new Date(tx.date).toLocaleDateString()}</TableCell>
                                        <TableCell className="font-medium max-w-[200px] truncate">{tx.description}</TableCell>
                                        <TableCell>
                                            <Link href={`/admin/users/${tx.user.id}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">{tx.user.name}</Link>
                                        </TableCell>
                                        <TableCell>
                                            {tx.tags.slice(0, 2).map(t => <Badge key={t} variant="outline" className="mr-1 capitalize text-xs">{t}</Badge>)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                {tx.type === "in" ? <><ArrowUpRight className="size-4 text-emerald-500" /><span className="text-emerald-600 dark:text-emerald-400 text-sm">Income</span></> : <><ArrowDownRight className="size-4 text-red-500" /><span className="text-red-600 dark:text-red-400 text-sm">Expense</span></>}
                                            </div>
                                        </TableCell>
                                        <TableCell className={`text-right font-mono text-sm ${tx.type === "in" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                                            {tx.type === "in" ? "+" : "-"}{formatCurrency(Number(tx.amount))}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}

                {/* Pagination */}
                {!loading && pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-neutral-500 hidden lg:block">
                            Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                        </p>
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
                    <TableRow>{["Date","Description","User","Tags","Type","Amount"].map((h,i) => <TableHead key={i}>{h}</TableHead>)}</TableRow>
                </TableHeader>
                <TableBody>
                    {[...Array(10)].map((_,i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
