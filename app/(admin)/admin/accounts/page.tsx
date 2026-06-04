//
//  page.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Renders the /admin/accounts route in Argent, composing page-level layout, data
//  dependencies, and feature components for that user-facing screen.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import Link from "next/link"
import {
    RefreshCw, Filter, Wallet,
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
import { UDS } from "@/lib/UDS"

interface Account {
    id: string; cardName: string; accountType: string; balance: number
    currency: string; isActive: boolean; createdAt: string
    user: { id: string; name: string; email: string }
    bank: { name: string }
}
interface Pagination { page: number; limit: number; total: number; totalPages: number }
type AdminCopy = Record<string, string | undefined> & {
    accounts_page?: Record<string, string>
}

function formatCurrency(v: number) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(v)
}

export default function AdminAccountsPage() {
    const { t } = useLanguage()
    const ad = ((t as { admin?: AdminCopy }).admin || {}) as AdminCopy
    const ap = ad.accounts_page || {}
    const [data, setData] = React.useState<Account[]>([])
    const [pagination, setPagination] = React.useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
    const [totalBalance, setTotalBalance] = React.useState(0)
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
            const res = await fetch(`/api/admin/accounts?${p}`)
            if (!res.ok) throw new Error()
            const json = await res.json()
            setData(json.accounts); setPagination(json.pagination)
            setTotalBalance(Number(json.summary.totalBalance))
        } catch { toast.error(ap.failed_load || "Failed to load accounts") }
        finally { setLoading(false) }
    }, [debouncedSearch, typeFilter, sortBy, sortDir, ap.failed_load])

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
                    placeholder={ap.search_placeholder || "Search by account name..."}
                    width={280}
                />
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[150px]" size="sm">
                        <Filter className="size-3.5" />
                        <SelectValue placeholder={ap.col_type || "Type"} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{ap.all_types || "All Types"}</SelectItem>
                        <SelectItem value="checking">{ap.checking || "Checking"}</SelectItem>
                        <SelectItem value="savings">{ap.savings || "Savings"}</SelectItem>
                        <SelectItem value="credit_card">{ap.credit_card || "Credit Card"}</SelectItem>
                        <SelectItem value="digital_wallet">{ap.digital_wallet || "Digital Wallet"}</SelectItem>
                    </SelectContent>
                </Select>
            </TableToolbarGroup>
        </TableToolbar>
    )

    return (
        <>
            <AdminHeader title={ad.accounts || "Accounts"} breadcrumbs={[{ label: ad.accounts || "Accounts" }]}
                actions={<Button variant="glass" size="sm" onClick={() => fetchData(pagination.page)} disabled={loading}><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> {ad.refresh || "Refresh"}</Button>}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className={UDS.summaryTileSurface}>
                        <p className={UDS.summaryLabel}><Wallet className="size-3.5" /> {ap.total_accounts || "Total Accounts"}</p>
                        <p className={UDS.summaryValue}>{loading ? <Skeleton className="h-6 w-16" /> : pagination.total}</p>
                    </div>
                    <div className={UDS.summaryTileSurface}>
                        <p className={UDS.summaryLabel}>{ap.combined_balance || "Combined Balance"}</p>
                        <p className={UDS.summaryValue}>{loading ? <Skeleton className="h-6 w-28" /> : formatCurrency(totalBalance)}</p>
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
                                        <TableSortHeader direction={sortDirection("cardName")} onClick={() => toggleSort("cardName")}>
                                            {ap.col_account || "Account"}
                                        </TableSortHeader>
                                    </TableHead>
                                    <TableHead>{ap.col_bank || "Bank"}</TableHead>
                                    <TableHead>{ap.col_type || "Type"}</TableHead>
                                    <TableHead>{ap.col_owner || "Owner"}</TableHead>
                                    <TableHead>{ap.col_status || "Status"}</TableHead>
                                    <TableHead>
                                        <TableSortHeader direction={sortDirection("balance")} onClick={() => toggleSort("balance")} align="right">
                                            {ap.col_balance || "Balance"}
                                        </TableSortHeader>
                                    </TableHead>
                                    <TableHead>
                                        <TableSortHeader direction={sortDirection("createdAt")} onClick={() => toggleSort("createdAt")}>
                                            {ap.col_created || "Created"}
                                        </TableSortHeader>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableSkeletonRows rows={8} columns={7} widths={[132, 96, 88, 128, 80, 104, 96]} />
                                ) : data.length === 0 ? (
                                    <TableEmptyRow
                                        colSpan={7}
                                        title={ap.no_accounts || "No accounts found"}
                                        description={ap.no_accounts_hint || "Try changing the search or type filter."}
                                    />
                                ) : data.map(acc => (
                                    <TableRow key={acc.id}>
                                        <TableCell className="font-medium">{acc.cardName}</TableCell>
                                        <TableCell className="text-neutral-400 text-sm">{acc.bank.name}</TableCell>
                                        <TableCell><Badge variant="outline" className="capitalize text-xs">{acc.accountType.replace("_", " ")}</Badge></TableCell>
                                        <TableCell>
                                            <Link href={`/admin/users/${acc.user.id}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">{acc.user.name}</Link>
                                        </TableCell>
                                        <TableCell>
                                            {acc.isActive
                                                ? <Badge variant="outline" className={`${UDS.semanticBadge.positive} text-xs`}>{ad.active || "Active"}</Badge>
                                                : <Badge variant="outline" className={`${UDS.semanticBadge.neutral} text-xs`}>{ap.inactive || "Inactive"}</Badge>}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm">{formatCurrency(Number(acc.balance))}</TableCell>
                                        <TableCell className="text-sm text-neutral-400">{new Date(acc.createdAt).toLocaleDateString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                </UniversalTable>
            </div>
        </>
    )
}
