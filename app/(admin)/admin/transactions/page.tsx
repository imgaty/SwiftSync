"use client"

import * as React from "react"
import Link from "next/link"
import {
    RefreshCw, ArrowUpRight, ArrowDownRight, Filter,
} from "lucide-react"

import { AdminHeader } from "@/components/admin/admin-header"
import { useLanguage } from "@/components/language-provider"
import { PRISM } from "@/lib/PRISM"
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

interface Transaction {
    id: string; date: string; type: string; amount: number; description: string
    tags: string[]; accountId: string; createdAt: string
    user: { id: string; name: string; email: string }
}
interface Pagination { page: number; limit: number; total: number; totalPages: number }
interface Summary { totalIncome: number; totalExpenses: number; count: number }
type AdminCopy = Record<string, string | undefined> & {
    transactions_page?: Record<string, string>
}

function formatCurrency(v: number) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(v)
}

export default function AdminTransactionsPage() {
    const { t } = useLanguage()
    const ad = ((t as { admin?: AdminCopy }).admin || {}) as AdminCopy
    const tp = ad.transactions_page || {}

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
        } catch { toast.error(tp.failed_load || "Failed to load transactions") }
        finally { setLoading(false) }
    }, [debouncedSearch, typeFilter, sortBy, sortDir, tp.failed_load])

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
                    placeholder={tp.search_placeholder || "Search by description..."}
                    width={280}
                />
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[130px]" size="sm">
                        <Filter className="size-4" />
                        <SelectValue placeholder={tp.type || "Type"} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{tp.all_types || "All Types"}</SelectItem>
                        <SelectItem value="in">{tp.income || "Income"}</SelectItem>
                        <SelectItem value="out">{tp.expense || "Expense"}</SelectItem>
                    </SelectContent>
                </Select>
            </TableToolbarGroup>
        </TableToolbar>
    )

    return (
        <>
            <AdminHeader title={ad.transactions || "Transactions"} breadcrumbs={[{ label: ad.transactions || "Transactions" }]}
                actions={<Button variant="glass" size="sm" onClick={() => fetchData(pagination.page)} disabled={loading}><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> {ad.refresh || "Refresh"}</Button>}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/3 p-3">
                        <p className="text-xs text-neutral-400 flex items-center gap-1"><ArrowUpRight className="size-3 text-emerald-500" /> {tp.total_income || "Total Income"}</p>
                        <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{loading ? <Skeleton className="h-7 w-24" /> : formatCurrency(Number(summary.totalIncome))}</p>
                    </div>
                    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/3 p-3">
                        <p className="text-xs text-neutral-400 flex items-center gap-1"><ArrowDownRight className="size-3 text-red-500" /> {tp.total_expenses || "Total Expenses"}</p>
                        <p className={`text-xl font-bold ${PRISM.destructiveText}`}>{loading ? <Skeleton className="h-7 w-24" /> : formatCurrency(Number(summary.totalExpenses))}</p>
                    </div>
                    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/3 p-3">
                        <p className="text-xs text-neutral-400">{tp.total_count || "Total Count"}</p>
                        <p className="text-xl font-bold">{loading ? <Skeleton className="h-7 w-16" /> : summary.count.toLocaleString()}</p>
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
                                        <TableSortHeader direction={sortDirection("date")} onClick={() => toggleSort("date")}>
                                            {tp.col_date || "Date"}
                                        </TableSortHeader>
                                    </TableHead>
                                    <TableHead>{tp.col_description || "Description"}</TableHead>
                                    <TableHead>{tp.col_user || "User"}</TableHead>
                                    <TableHead>{tp.col_tags || "Tags"}</TableHead>
                                    <TableHead>{tp.col_type || "Type"}</TableHead>
                                    <TableHead>
                                        <TableSortHeader direction={sortDirection("amount")} onClick={() => toggleSort("amount")} align="right">
                                            {tp.col_amount || "Amount"}
                                        </TableSortHeader>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableSkeletonRows rows={10} columns={6} widths={[88, 168, 120, 92, 92, 108]} />
                                ) : data.length === 0 ? (
                                    <TableEmptyRow
                                        colSpan={6}
                                        title={tp.no_transactions || "No transactions found"}
                                        description={tp.no_transactions_hint || "Try changing the search or type filter."}
                                    />
                                ) : data.map(tx => (
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
                                                {tx.type === "in" ? <><ArrowUpRight className="size-4 text-emerald-500" /><span className="text-emerald-600 dark:text-emerald-400 text-sm">{tp.income || "Income"}</span></> : <><ArrowDownRight className="size-4 text-red-500" /><span className={`${PRISM.destructiveText} text-sm`}>{tp.expense || "Expense"}</span></>}
                                            </div>
                                        </TableCell>
                                        <TableCell className={`text-right font-mono text-sm ${tx.type === "in" ? "text-emerald-600 dark:text-emerald-400" : PRISM.destructiveText}`}>
                                            {tx.type === "in" ? "+" : "-"}{formatCurrency(Number(tx.amount))}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                </UniversalTable>
            </div>
        </>
    )
}
