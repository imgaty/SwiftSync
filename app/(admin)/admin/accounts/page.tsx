"use client"

import * as React from "react"
import Link from "next/link"
import {
    Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    ArrowUpDown, RefreshCw, Filter, Wallet,
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

interface Account {
    id: string; cardName: string; accountType: string; balance: number
    currency: string; isActive: boolean; createdAt: string
    user: { id: string; name: string; email: string }
    bank: { name: string }
}
interface Pagination { page: number; limit: number; total: number; totalPages: number }

function formatCurrency(v: number) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(v)
}

export default function AdminAccountsPage() {
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
        } catch { toast.error("Failed to load accounts") }
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
            <AdminHeader title="Accounts" breadcrumbs={[{ label: "Accounts" }]}
                actions={<Button variant="outline" size="sm" onClick={() => fetchData(pagination.page)} disabled={loading}><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/3 p-3">
                        <p className="text-xs text-neutral-500 flex items-center gap-1"><Wallet className="size-3" /> Total Accounts</p>
                        <p className="text-xl font-bold">{loading ? <Skeleton className="h-7 w-16" /> : pagination.total}</p>
                    </div>
                    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/3 p-3">
                        <p className="text-xs text-neutral-500">Combined Balance</p>
                        <p className="text-xl font-bold">{loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(totalBalance)}</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
                        <Input label="Search" placeholder="Search by account name..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                    </div>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-[140px]" size="sm"><Filter className="size-4" /><SelectValue placeholder="Type" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="checking">Checking</SelectItem>
                            <SelectItem value="savings">Savings</SelectItem>
                            <SelectItem value="credit_card">Credit Card</SelectItem>
                            <SelectItem value="digital_wallet">Digital Wallet</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {loading ? <TableSkeleton /> : data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-black/10 dark:border-white/10 p-12 text-center">
                        <p className="text-lg font-medium text-neutral-600 dark:text-neutral-400">No accounts found</p>
                    </div>
                ) : (
                    <div className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-black/3 dark:bg-white/3">
                                <TableRow>
                                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("cardName")}>Account <SortIcon field="cardName" /></TableHead>
                                    <TableHead>Bank</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Owner</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("balance")}>Balance <SortIcon field="balance" /></TableHead>
                                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("createdAt")}>Created <SortIcon field="createdAt" /></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map(acc => (
                                    <TableRow key={acc.id}>
                                        <TableCell className="font-medium">{acc.cardName}</TableCell>
                                        <TableCell className="text-neutral-500 text-sm">{acc.bank.name}</TableCell>
                                        <TableCell><Badge variant="outline" className="capitalize text-xs">{acc.accountType.replace("_", " ")}</Badge></TableCell>
                                        <TableCell>
                                            <Link href={`/admin/users/${acc.user.id}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">{acc.user.name}</Link>
                                        </TableCell>
                                        <TableCell>
                                            {acc.isActive
                                                ? <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs">Active</Badge>
                                                : <Badge variant="outline" className="border-neutral-500/30 bg-neutral-500/10 text-neutral-500 text-xs">Inactive</Badge>}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm">{formatCurrency(Number(acc.balance))}</TableCell>
                                        <TableCell className="text-sm text-neutral-500">{new Date(acc.createdAt).toLocaleDateString()}</TableCell>
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
                    <TableRow>{["Account","Bank","Type","Owner","Status","Balance","Created"].map((h,i) => <TableHead key={i}>{h}</TableHead>)}</TableRow>
                </TableHeader>
                <TableBody>
                    {[...Array(8)].map((_,i) => (
                        <TableRow key={i}>
                            {[28,24,16,24,14,20,20].map((w,j) => <TableCell key={j}><Skeleton className="h-4" style={{width: w*4}} /></TableCell>)}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
