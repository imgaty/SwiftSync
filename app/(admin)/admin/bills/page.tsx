//
//  page.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Renders the /admin/bills route in Argent, composing page-level layout, data
//  dependencies, and feature components for that user-facing screen.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import Link from "next/link"
import {
    RefreshCw, Filter, Receipt, CheckCircle, Clock, AlertTriangle,
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
    TableSortHeader,
    TableToolbar,
    TableToolbarGroup,
    UniversalTable,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

interface Bill {
    id: string; name: string; amount: number; tags: string[]; dueDay: number
    frequency: string; category: string; autopay: boolean; status: string
    createdAt: string
    user: { id: string; name: string; email: string }
}
interface Pagination { page: number; limit: number; total: number; totalPages: number }
type AdminCopy = Record<string, string | undefined> & {
    bills_page?: Record<string, string>
}

function formatCurrency(v: number) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(v)
}

function billStatusBadge(status: string, bp: Record<string, string>) {
    switch (status) {
        case "paid": return <Badge variant="outline" className={`${UDS.semanticBadge.positive} text-xs`}><CheckCircle className="size-3" />{bp.paid || "Paid"}</Badge>
        case "pending": return <Badge variant="outline" className={`${UDS.semanticBadge.warning} text-xs`}><Clock className="size-3" />{bp.pending || "Pending"}</Badge>
        case "overdue": return <Badge variant="outline" className={`${UDS.destructiveBadge} text-xs`}><AlertTriangle className="size-3" />{bp.overdue || "Overdue"}</Badge>
        default: return <Badge variant="outline" className="text-xs capitalize">{status}</Badge>
    }
}

export default function AdminBillsPage() {
    const { t } = useLanguage()
    const ad = ((t as { admin?: AdminCopy }).admin || {}) as AdminCopy
    const bp = ad.bills_page || {}

    const [data, setData] = React.useState<Bill[]>([])
    const [pagination, setPagination] = React.useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
    const [totalAmount, setTotalAmount] = React.useState(0)
    const [loading, setLoading] = React.useState(true)
    const [search, setSearch] = React.useState("")
    const [freqFilter, setFreqFilter] = React.useState("all")
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
            if (freqFilter !== "all") p.set("frequency", freqFilter)
            p.set("sortBy", sortBy); p.set("sortDir", sortDir)
            const res = await fetch(`/api/admin/bills?${p}`)
            if (!res.ok) throw new Error()
            const json = await res.json()
            setData(json.bills); setPagination(json.pagination)
            setTotalAmount(Number(json.summary.totalMonthly))
        } catch { toast.error(bp.failed_load || "Failed to load bills") }
        finally { setLoading(false) }
    }, [debouncedSearch, freqFilter, sortBy, sortDir, bp.failed_load])

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
                    placeholder={bp.search_placeholder || "Search bills..."}
                    width={280}
                />
                <Select value={freqFilter} onValueChange={setFreqFilter}>
                    <SelectTrigger className="w-[145px]" size="sm">
                        <Filter className="size-3.5" />
                        <SelectValue placeholder={bp.frequency || "Frequency"} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{bp.all || "All"}</SelectItem>
                        <SelectItem value="weekly">{bp.weekly || "Weekly"}</SelectItem>
                        <SelectItem value="monthly">{bp.monthly || "Monthly"}</SelectItem>
                        <SelectItem value="yearly">{bp.yearly || "Yearly"}</SelectItem>
                    </SelectContent>
                </Select>
            </TableToolbarGroup>
        </TableToolbar>
    )

    return (
        <>
            <AdminHeader title={ad.bills || "Bills"} breadcrumbs={[{ label: ad.bills || "Bills" }]}
                actions={<Button variant="glass" size="sm" onClick={() => fetchData(pagination.page)} disabled={loading}><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> {ad.refresh || "Refresh"}</Button>}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className={UDS.summaryTileSurface}>
                        <p className={UDS.summaryLabel}><Receipt className="size-3.5" /> {bp.total_bills || "Total Bills"}</p>
                        <p className={UDS.summaryValue}>{loading ? <Skeleton className="h-6 w-16" /> : pagination.total}</p>
                    </div>
                    <div className={UDS.summaryTileSurface}>
                        <p className={UDS.summaryLabel}>{bp.total_amount || "Total Amount"}</p>
                        <p className={UDS.summaryValue}>{loading ? <Skeleton className="h-6 w-28" /> : formatCurrency(totalAmount)}</p>
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
                            ofLabel={ad.showing_page || "of"}
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
                                            {bp.col_name || "Name"}
                                        </TableSortHeader>
                                    </TableHead>
                                    <TableHead>{bp.col_category || "Category"}</TableHead>
                                    <TableHead>{bp.col_owner || "Owner"}</TableHead>
                                    <TableHead>
                                        <TableSortHeader direction={sortDirection("frequency")} onClick={() => toggleSort("frequency")}>
                                            {bp.col_frequency || "Frequency"}
                                        </TableSortHeader>
                                    </TableHead>
                                    <TableHead>
                                        <TableSortHeader direction={sortDirection("dueDay")} onClick={() => toggleSort("dueDay")}>
                                            {bp.col_due_day || "Due Day"}
                                        </TableSortHeader>
                                    </TableHead>
                                    <TableHead>{bp.col_status || "Status"}</TableHead>
                                    <TableHead>{bp.col_autopay || "Autopay"}</TableHead>
                                    <TableHead>
                                        <TableSortHeader direction={sortDirection("amount")} onClick={() => toggleSort("amount")} align="right">
                                            {bp.col_amount || "Amount"}
                                        </TableSortHeader>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableSkeletonRows rows={8} columns={8} widths={[144, 96, 128, 88, 72, 92, 80, 104]} />
                                ) : data.length === 0 ? (
                                    <TableEmptyRow
                                        colSpan={8}
                                        title={bp.no_bills || "No bills found"}
                                        description={bp.no_bills_hint || "Try changing the search or frequency filter."}
                                    />
                                ) : data.map(bill => (
                                    <TableRow key={bill.id}>
                                        <TableCell className="font-medium">{bill.name}</TableCell>
                                        <TableCell><Badge variant="outline" className="capitalize text-xs">{bill.category}</Badge></TableCell>
                                        <TableCell>
                                            <Link href={`/admin/users/${bill.user.id}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">{bill.user.name}</Link>
                                        </TableCell>
                                        <TableCell className="capitalize text-sm">{bill.frequency}</TableCell>
                                        <TableCell className="text-sm">{bill.dueDay}</TableCell>
                                        <TableCell>{billStatusBadge(bill.status, bp)}</TableCell>
                                        <TableCell>{bill.autopay ? <Badge variant="outline" className={`${UDS.semanticBadge.info} text-xs`}>{bp.auto || "Auto"}</Badge> : <span className="text-xs text-neutral-400">{bp.manual || "Manual"}</span>}</TableCell>
                                        <TableCell className="text-right font-mono text-sm">{formatCurrency(Number(bill.amount))}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                </UniversalTable>
            </div>
        </>
    )
}
