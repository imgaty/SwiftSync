//
//  page.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Renders the /admin/budgets route in Argent, composing page-level layout, data
//  dependencies, and feature components for that user-facing screen.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import Link from "next/link"
import {
    RefreshCw, PiggyBank,
} from "lucide-react"

import { AdminHeader } from "@/components/admin/admin-header"
import { useLanguage } from "@/components/language-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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

interface BudgetItem {
    id: string; tag: string; category: string; limit: number; color: string
    createdAt: string
    user: { id: string; name: string; email: string }
}
interface Pagination { page: number; limit: number; total: number; totalPages: number }
type AdminCopy = Record<string, string | undefined> & {
    budgets_page?: Record<string, string>
}

function formatCurrency(v: number) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(v)
}

export default function AdminBudgetsPage() {
    const { t } = useLanguage()
    const ad = ((t as { admin?: AdminCopy }).admin || {}) as AdminCopy
    const bp = ad.budgets_page || {}

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
        } catch { toast.error(bp.failed_load || "Failed to load budgets") }
        finally { setLoading(false) }
    }, [debouncedSearch, sortBy, sortDir, bp.failed_load])

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
                    placeholder={bp.search_placeholder || "Search by category..."}
                    width={280}
                />
            </TableToolbarGroup>
        </TableToolbar>
    )

    return (
        <>
            <AdminHeader title={ad.budgets || "Budgets"} breadcrumbs={[{ label: ad.budgets || "Budgets" }]}
                actions={<Button variant="glass" size="sm" onClick={() => fetchData(pagination.page)} disabled={loading}><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> {ad.refresh || "Refresh"}</Button>}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/3 p-3">
                        <p className="text-xs text-neutral-400 flex items-center gap-1"><PiggyBank className="size-3" /> {bp.total_budgets || "Total Budgets"}</p>
                        <p className="text-xl font-bold">{loading ? <Skeleton className="h-7 w-16" /> : pagination.total}</p>
                    </div>
                    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/3 p-3">
                        <p className="text-xs text-neutral-400">{bp.combined_limit || "Combined Budget Limit"}</p>
                        <p className="text-xl font-bold">{loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(totalLimit)}</p>
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
                                        <TableSortHeader direction={sortDirection("category")} onClick={() => toggleSort("category")}>
                                            {bp.col_category || "Category"}
                                        </TableSortHeader>
                                    </TableHead>
                                    <TableHead>
                                        <TableSortHeader direction={sortDirection("tag")} onClick={() => toggleSort("tag")}>
                                            {bp.col_tag || "Tag"}
                                        </TableSortHeader>
                                    </TableHead>
                                    <TableHead>{bp.col_owner || "Owner"}</TableHead>
                                    <TableHead>{bp.col_color || "Color"}</TableHead>
                                    <TableHead>
                                        <TableSortHeader direction={sortDirection("limit")} onClick={() => toggleSort("limit")} align="right">
                                            {bp.col_limit || "Limit"}
                                        </TableSortHeader>
                                    </TableHead>
                                    <TableHead>
                                        <TableSortHeader direction={sortDirection("createdAt")} onClick={() => toggleSort("createdAt")}>
                                            {bp.col_created || "Created"}
                                        </TableSortHeader>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableSkeletonRows rows={8} columns={6} widths={[128, 88, 128, 112, 104, 96]} />
                                ) : data.length === 0 ? (
                                    <TableEmptyRow
                                        colSpan={6}
                                        title={bp.no_budgets || "No budgets found"}
                                        description={bp.no_budgets_hint || "Try changing the search filter."}
                                    />
                                ) : data.map(b => (
                                    <TableRow key={b.id}>
                                        <TableCell className="font-medium">{b.category}</TableCell>
                                        <TableCell><Badge variant="outline" className="capitalize text-xs">{b.tag}</Badge></TableCell>
                                        <TableCell>
                                            <Link href={`/admin/users/${b.user.id}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">{b.user.name}</Link>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="size-4 rounded-full border" style={{ backgroundColor: b.color }} />
                                                <span className="text-xs text-neutral-400 font-mono">{b.color}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm">{formatCurrency(Number(b.limit))}</TableCell>
                                        <TableCell className="text-sm text-neutral-400">{new Date(b.createdAt).toLocaleDateString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                </UniversalTable>
            </div>
        </>
    )
}
