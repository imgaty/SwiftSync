//
//  accounts-table.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Implements the Accounts table React component for Argent, encapsulating reusable
//  interface structure, state handling, and presentation logic for feature screens.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import { motion, AnimatePresence } from "framer-motion"
import {
    Pencil,
    Trash2,
    Eye,
    EyeOff,
    Wallet,
    Building2,
    CreditCard,
    PiggyBank,
    TrendingUp,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Link,
    SquareArrowOutUpRight as ExternalLink,
} from "lucide-react"

import {
    ColumnDef,
    ColumnFiltersState,
    flexRender,
    getCoreRowModel,
    getFacetedRowModel,
    getFacetedUniqueValues,
    getFilteredRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
    VisibilityState,
} from "@tanstack/react-table"

import { z } from "zod"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    FormDialogActions,
    FormDialogBody,
    FormDialogContent,
    FormDialogHeader,
} from "@/components/form-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    TableShell,
    TableScrollArea,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableToolbar,
    TableToolbarGroup,
    TableSearchControl,
    TableFilterSelect,
    TableSortControl,
    TableColumnsControl,
    TableAddButton,
} from "@/components/ui/table"

import { EmptyStateInline } from "@/components/empty-state"
import { MobileCard, MobileCardList, useIsMobileView } from "@/components/mobile-card"
import { Skeleton } from "@/components/ui/skeleton"
import { SmartTooltip } from "@/components/ui/tooltip"
import { useLanguage } from "@/components/language-provider"
import { UDS } from "@/lib/UDS"
import { cn } from "@/lib/utils"
import { useCurrency } from "@/components/currency-provider"

export const accountSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(["checking", "savings", "credit_card", "digital_wallet", "loan"]),
    institution: z.string(),
    balance: z.number(),
    totalIn: z.number(),
    totalOut: z.number(),
    transactionCount: z.number(),
    color: z.string(),
    isActive: z.boolean().optional(),
    monthlyChange: z.number().optional(),
})

export type Account = z.infer<typeof accountSchema>

// Color options for accounts
const COLOR_OPTIONS = [
    { value: "#3B82F6", label: "Blue" },
    { value: "#22C55E", label: "Green" },
    { value: "#EF4444", label: "Red" },
    { value: "#8B5CF6", label: "Purple" },
    { value: "#F59E0B", label: "Amber" },
    { value: "#EC4899", label: "Pink" },
    { value: "#06B6D4", label: "Cyan" },
    { value: "#F97316", label: "Orange" },
]

// Helper type for nested translation objects
type TranslationObj = Record<string, string | Record<string, string>>

interface AccountFormData {
    name: string
    color: string
}

type AddDialogStep = "bank_connect"

const defaultFormData: AccountFormData = {
    name: "",
    color: "#3B82F6",
}

export function AccountsTable({ data: initialData, isLoading = false }: { data: Account[]; isLoading?: boolean }) {
    const { t, isLoading: isLangLoading } = useLanguage()
    const { formatCurrency } = useCurrency()
    const queryClient = useQueryClient()
    const f = (t.finance || {}) as TranslationObj
    const at = (f.accounts_table || {}) as Record<string, string>
    const fTable = (f.table || {}) as Record<string, string>
    const fActions = (f.actions || {}) as Record<string, string>
    const fFilter = (f.filter || {}) as Record<string, string>

    // State for CRUD
    const [data, setData] = React.useState<Account[]>(() => initialData)
    const [dialogOpen, setDialogOpen] = React.useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
    const [editingAccount, setEditingAccount] = React.useState<Account | null>(null)
    const [deletingAccount, setDeletingAccount] = React.useState<Account | null>(null)
    const [formData, setFormData] = React.useState<AccountFormData>(defaultFormData)
    const [isSaving, setIsSaving] = React.useState(false)
    const [isDeleting, setIsDeleting] = React.useState(false)

    // Bank connect state
    const [addStep] = React.useState<AddDialogStep>("bank_connect")
    const [syncError, setSyncError] = React.useState<string | null>(null)
    const [isConnectingBank, setIsConnectingBank] = React.useState(false)

    // Sync data when initialData changes
    React.useEffect(() => {
        setData(initialData)
    }, [initialData])

    const accountTypeConfig: Record<string, { label: string; icon: typeof Building2; color: string }> = React.useMemo(() => ({
        checking: { label: at.checking || "Checking", icon: Building2, color: "bg-blue-500" },
        savings: { label: at.savings || "Savings", icon: PiggyBank, color: "bg-green-500" },
        credit_card: { label: at.credit_card || "Credit Card", icon: CreditCard, color: "bg-purple-500" },
        digital_wallet: { label: at.digital_wallet || "Digital Wallet", icon: Wallet, color: "bg-cyan-500" },
        loan: { label: at.loan || "Loan", icon: Building2, color: "bg-red-500" },
    }), [at.checking, at.savings, at.credit_card, at.digital_wallet, at.loan])

    // --- CRUD handlers ---
    function openAddDialog() {
        setEditingAccount(null)
        setFormData(defaultFormData)
        setSyncError(null)
        setDialogOpen(true)
    }

    function openEditDialog(account: Account) {
        setEditingAccount(account)
        setFormData({
            name: account.name,
            color: account.color || "#3B82F6",
        })
        setDialogOpen(true)
    }

    function openDeleteDialog(account: Account) {
        setDeletingAccount(account)
        setDeleteDialogOpen(true)
    }

    async function handleSave() {
        if (!editingAccount) return
        if (!formData.name) {
            toast.error("Please enter an account name")
            return
        }

        setIsSaving(true)
        try {
            const payload = {
                name: formData.name,
                color: formData.color,
            }

            const res = await fetch(`/api/accounts/${editingAccount.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || "Failed to update account")
            }
            const updated = await res.json()
            setData((prev) =>
                prev.map((a) =>
                    a.id === editingAccount.id
                        ? { ...a, ...updated }
                        : a
                )
            )
            // Invalidate shared finance cache so other pages get fresh data
            queryClient.invalidateQueries({ queryKey: queryKeys.financeData })
            toast.success(`"${formData.name}" updated`)
            setDialogOpen(false)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "An error occurred")
        } finally {
            setIsSaving(false)
        }
    }

    async function handleDelete() {
        if (!deletingAccount) return
        setIsDeleting(true)
        try {
            const res = await fetch(`/api/accounts/${deletingAccount.id}`, {
                method: "DELETE",
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || "Failed to delete account")
            }
            setData((prev) => prev.filter((a) => a.id !== deletingAccount.id))
            queryClient.invalidateQueries({ queryKey: queryKeys.financeData })
            toast.success(`"${deletingAccount.name}" deleted`)
            setDeleteDialogOpen(false)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "An error occurred")
        } finally {
            setIsDeleting(false)
        }
    }

    async function toggleVisibility(account: Account) {
        try {
            const res = await fetch(`/api/accounts/${account.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !(account.isActive ?? true) }),
            })
            if (!res.ok) throw new Error("Failed to update")
            setData((prev) =>
                prev.map((a) =>
                    a.id === account.id ? { ...a, isActive: !(a.isActive ?? true) } : a
                )
            )
            queryClient.invalidateQueries({ queryKey: queryKeys.financeData })
        } catch {
            toast.error("Failed to update account visibility")
        }
    }

    const columns: ColumnDef<Account>[] = React.useMemo(() => [
        {
            id: "select",
            header: ({ table }) => (
                <div className="flex items-center justify-center">
                    <Checkbox
                        checked={
                            table.getIsAllPageRowsSelected() ||
                            (table.getIsSomePageRowsSelected() && "indeterminate")
                        }
                        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                        aria-label={fTable.select_all}
                    />
                </div>
            ),
            cell: ({ row }) => (
                <div className="flex items-center justify-center">
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value) => row.toggleSelected(!!value)}
                        aria-label={fTable.select_row}
                    />
                </div>
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: "name",
            header: at.account || "Account",
            cell: ({ row }) => {
                const type = row.original.type
                const config = accountTypeConfig[type] || accountTypeConfig.checking
                const Icon = config.icon

                return (
                    <div className="flex items-center gap-3">
                        <div
                            className="size-10 sq-lg flex items-center justify-center text-white"
                            style={{ backgroundColor: row.original.color || undefined }}
                        >
                            <Icon className="size-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="auto-scroll font-medium">{row.original.name}</div>
                            <div className="auto-scroll text-xs text-neutral-400">
                                {row.original.institution}
                            </div>
                        </div>
                    </div>
                )
            },
            enableHiding: false,
        },
        {
            accessorKey: "type",
            header: at.type || "Type",
            cell: ({ row }) => {
                const type = row.original.type
                const config = accountTypeConfig[type] || accountTypeConfig.checking
                return (
                    <Badge variant="secondary" className="gap-1">
                        {config.label}
                    </Badge>
                )
            },
        },
        {
            accessorKey: "balance",
            header: () => <div className="text-right">{at.balance || "Balance"}</div>,
            cell: ({ row }) => {
                const balance = row.original.balance
                const formatted = formatCurrency(Math.abs(balance))
                const isNegative = balance < 0 || row.original.type === "credit_card"

                return (
                    <div className={`text-right font-bold text-lg tabular-nums ${isNegative && balance !== 0 ? "text-negative" : ""}`}>
                        {isNegative && balance !== 0 ? "-" : ""}{formatted}
                    </div>
                )
            },
        },
        {
            accessorKey: "totalIn",
            header: () => <div className="text-right">{at.monthly_change || "Total In"}</div>,
            cell: ({ row }) => {
                const totalIn = row.original.totalIn
                const formatted = formatCurrency(totalIn)
                return (
                    <div className="flex items-center justify-end gap-1 text-positive tabular-nums">
                        <TrendingUp className="size-4" />
                        +{formatted}
                    </div>
                )
            },
        },
        {
            accessorKey: "transactionCount",
            header: () => <div className="text-right">{at.transactions || "Transactions"}</div>,
            cell: ({ row }) => (
                <div className="text-right text-neutral-400">
                    {row.original.transactionCount} {at.this_month || "total"}
                </div>
            ),
        },
        {
            id: "actions",
            cell: ({ row }) => (
                <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                    <SmartTooltip text={fActions.edit || "Edit"} group="table-actions">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(row.original)}
                        >
                            <Pencil className="size-4" />
                        </Button>
                    </SmartTooltip>
                    <SmartTooltip
                        text={(row.original.isActive ?? true) ? (fActions.hide || "Hide") : (fActions.show || "Show")}
                        group="table-actions"
                    >
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleVisibility(row.original)}
                        >
                            {(row.original.isActive ?? true) ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </Button>
                    </SmartTooltip>
                    <SmartTooltip text={fActions.delete || "Delete"} group="table-actions">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={UDS.destructiveHover}
                            onClick={() => openDeleteDialog(row.original)}
                        >
                            <Trash2 className="size-4" />
                        </Button>
                    </SmartTooltip>
                </div>
            ),
        },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ], [t, at, fActions, accountTypeConfig, formatCurrency])

    const [rowSelection, setRowSelection] = React.useState({})
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })

    const table = useReactTable({
        data,
        columns,
        state: { sorting, columnVisibility, rowSelection, columnFilters, pagination },
        getRowId: (row) => row.id.toString(),
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
    })

    const totals = React.useMemo(() => {
        let assets = 0
        let liabilities = 0
        for (const a of data) {
            if (a.type === "credit_card" || a.type === "loan") {
                liabilities += Math.abs(a.balance)
            } else {
                assets += a.balance
            }
        }
        return { assets, liabilities, netWorth: assets - liabilities, totalAccounts: data.length }
    }, [data])

    const isMobile = useIsMobileView()

    // Loading skeleton
    if (isLoading || isLangLoading) {
        return (
            <div className="flex flex-col gap-4 w-full">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-[150px]" />
                        <Skeleton className="h-8 w-[130px]" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-24" />
                        <Skeleton className="h-8 w-32" />
                    </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} className={`${UDS.tileSurface} p-3.5`}>
                            <Skeleton className="h-4 w-24 mb-2" />
                            <Skeleton className="h-8 w-32" />
                        </div>
                    ))}
                </div>
                <TableShell>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-8"><Skeleton className="size-4" /></TableHead>
                                {[180, 100, 100, 80, 80, 100, 40].map((w, i) => (
                                    <TableHead key={i}><Skeleton className="h-4" style={{ width: w }} /></TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[...Array(5)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="size-4" /></TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Skeleton className="size-10 sq-lg" />
                                            <div>
                                                <Skeleton className="h-4 w-24 mb-1" />
                                                <Skeleton className="h-3 w-32" />
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell><Skeleton className="h-5 w-20 sq-full" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                    <TableCell><Skeleton className="size-6 sq" /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableShell>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4 w-full">
            {/* Toolbar */}
            <TableToolbar>
                <TableToolbarGroup>
                    <TableSearchControl table={table} placeholder={at.search_accounts || "Search accounts…"} width={240} />
                    <TableFilterSelect
                        table={table}
                        columnId="type"
                        label={at.type || "Type"}
                        allLabel={fFilter.all_types || "All Types"}
                        options={[
                            { value: "checking", label: at.checking || "Checking" },
                            { value: "savings", label: at.savings || "Savings" },
                            { value: "credit_card", label: at.credit_card || "Credit Card" },
                            { value: "digital_wallet", label: at.digital_wallet || "Digital Wallet" },
                            { value: "loan", label: at.loan || "Loan" },
                        ]}
                    />
                </TableToolbarGroup>

                <TableToolbarGroup>
                    <TableSortControl
                        table={table}
                        options={[
                            { id: "name", label: at.name || "Name" },
                            { id: "balance", label: at.balance || "Balance" },
                            { id: "type", label: at.type || "Type" },
                        ]}
                    />
                    <TableColumnsControl table={table} label={fTable.columns || "Columns"} />
                    <TableAddButton onClick={openAddDialog} label={at.add_account || "Connect Bank"} />
                </TableToolbarGroup>
            </TableToolbar>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`${UDS.tileSurface} p-3.5`}>
                    <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">{at.total_assets || "Total Assets"}</p>
                    <p className="text-lg font-bold mt-1 text-green-600 tabular-nums">{formatCurrency(totals.assets)}</p>
                </div>
                <div className={`${UDS.tileSurface} p-3.5`}>
                    <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">{at.total_liabilities || "Total Liabilities"}</p>
                    <p className="text-lg font-bold mt-1 text-red-600 tabular-nums">-{formatCurrency(totals.liabilities)}</p>
                </div>
                <div className={`${UDS.tileSurface} p-3.5`}>
                    <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">{at.net_worth || "Net Worth"}</p>
                    <p className={`text-lg font-bold mt-1 tabular-nums ${totals.netWorth >= 0 ? "text-green-600" : UDS.destructiveText}`}>
                        {formatCurrency(totals.netWorth)}
                    </p>
                </div>
                <div className={`${UDS.tileSurface} p-3.5`}>
                    <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">{at.total_accounts || "Total Accounts"}</p>
                    <p className="text-lg font-bold mt-1 tabular-nums">{totals.totalAccounts}</p>
                </div>
            </div>

            {/* Table / Cards */}
            <div className="relative flex flex-col gap-4 overflow-auto">
                {isMobile ? (
                    <MobileCardList>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row, index) => {
                                const account = row.original
                                const TypeIcon = accountTypeConfig[account.type]?.icon || Wallet
                                return (
                                    <MobileCard
                                        key={row.id}
                                        item={account}
                                        id={account.id}
                                        index={index}
                                        isSelected={row.getIsSelected()}
                                        onSelect={(checked) => row.toggleSelected(checked)}
                                        icon={<TypeIcon className="size-5 text-neutral-400" />}
                                        title={account.name}
                                        subtitle={account.institution}
                                        badge={{
                                            label: accountTypeConfig[account.type]?.label || account.type,
                                            variant: "secondary"
                                        }}
                                        fields={[
                                            { label: at.balance || "Balance", value: <span className="tabular-nums">{formatCurrency(account.balance)}</span> },
                                            {
                                                label: at.monthly_change || "Monthly",
                                                value: (
                                                    <span className={`tabular-nums ${(account.monthlyChange ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                                                        {(account.monthlyChange ?? 0) >= 0 ? "+" : ""}{formatCurrency(account.monthlyChange ?? 0)}
                                                    </span>
                                                )
                                            },
                                            { label: at.transactions || "Transactions", value: <span className="tabular-nums">{account.transactionCount}</span> },
                                            {
                                                label: at.status || "Status",
                                                value: (account.isActive ?? true) ? (at.active || "Active") : (at.hidden || "Hidden")
                                            }
                                        ]}
                                        onEdit={() => openEditDialog(account)}
                                        onDelete={() => openDeleteDialog(account)}
                                    />
                                )
                            })
                        ) : (
                            <EmptyStateInline variant={columnFilters.length > 0 ? "filtered" : "no-accounts"} />
                        )}
                    </MobileCardList>
                ) : (
                    <TableShell>
                        <TableScrollArea maxHeight="calc(100vh - 22rem)">
                        <Table>
                            <TableHeader>
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => (
                                            <TableHead key={header.id} colSpan={header.colSpan}>
                                                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody>
                                <AnimatePresence mode="popLayout">
                                    {table.getRowModel().rows?.length ? (
                                        table.getRowModel().rows.map((row, index) => (
                                            <motion.tr
                                                key={row.id}
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 10 }}
                                                transition={{ duration: 0.2, delay: index * 0.02 }}
                                                data-state={row.getIsSelected() && "selected"}
                                                onClick={(e) => {
                                                    const target = e.target as HTMLElement
                                                    if (target.closest("button, a, input, select, textarea, [role=checkbox], [data-no-row-click]")) return
                                                    row.toggleSelected()
                                                }}
                                                className={cn("group/row cursor-pointer border-b transition-colors", UDS.itemHover, UDS.rowSelected)}
                                            >
                                                {row.getVisibleCells().map((cell) => (
                                                    <TableCell key={cell.id}>
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </TableCell>
                                                ))}
                                            </motion.tr>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={columns.length} className="h-48">
                                                <EmptyStateInline variant={columnFilters.length > 0 ? "filtered" : "no-accounts"} />
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </AnimatePresence>
                            </TableBody>
                        </Table>
                        </TableScrollArea>
                    </TableShell>
                )}

                {/* Pagination removed; tables are scrollable */}
            </div>

            {/* Add / Edit Account Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <FormDialogContent maxWidth={editingAccount ? "390px" : "430px"}>
                    {/* ============== Connect Bank (Salt Edge) — for new accounts ============== */}
                    {!editingAccount && addStep === "bank_connect" && (
                        <>
                            <FormDialogHeader
                                icon={
                                    <div className="mb-1 flex size-14 items-center justify-center sq-full bg-primary/10 text-primary">
                                        <Link className="size-6" />
                                    </div>
                                }
                                title="Connect Your Bank"
                                description="Securely connect your bank via Open Banking. You'll be redirected to authorize access."
                            />
                            <FormDialogBody>
                                <div className={`${UDS.tileSurface} p-4`}>
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center sq-full bg-primary/10 text-primary">
                                            <CheckCircle2 className="size-4" />
                                        </div>
                                        <div className="text-sm">
                                            <p className="font-medium">How it works:</p>
                                            <ol className="mt-1.5 list-inside list-decimal space-y-1 text-neutral-400">
                                                <li>You&apos;ll be redirected to Salt Edge Connect</li>
                                                <li>Choose your bank and log in securely</li>
                                                <li>Authorize Argent to read your data</li>
                                                <li>Accounts &amp; transactions are imported automatically</li>
                                            </ol>
                                        </div>
                                    </div>
                                </div>

                                {syncError && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex items-center gap-2 sq-lg bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400"
                                    >
                                        <AlertCircle className="size-4 shrink-0" />
                                        <span>{syncError}</span>
                                    </motion.div>
                                )}

                                <div className={cn(UDS.largeTileSurface, "border-dashed p-3 text-center text-xs text-neutral-400")}>
                                    <p>Your banking credentials are handled directly by your bank.</p>
                                    <p className="mt-1">Argent never sees or stores your login details.</p>
                                </div>
                            </FormDialogBody>
                            <FormDialogActions>
                                <Button
                                    variant="solid"
                                    size="lg"
                                    className="w-full gap-2"
                                    onClick={async () => {
                                        setIsConnectingBank(true)
                                        setSyncError(null)
                                        try {
                                            const returnTo = `${window.location.origin}/Accounts/callback`
                                            const res = await fetch("/api/bank/connect", {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({
                                                    returnTo,
                                                    action: "connect",
                                                }),
                                            })
                                            if (!res.ok) {
                                                const err = await res.json()
                                                throw new Error(err.error || "Failed to create connect session")
                                            }
                                            const { connectUrl } = await res.json()
                                            window.location.href = connectUrl
                                        } catch (err) {
                                            setSyncError(err instanceof Error ? err.message : "Connection failed")
                                            setIsConnectingBank(false)
                                        }
                                    }}
                                    disabled={isConnectingBank}
                                >
                                    {isConnectingBank ? (
                                        <>
                                            <Loader2 className="size-4 animate-spin" />
                                            Connecting...
                                        </>
                                    ) : (
                                        <>
                                            <ExternalLink className="size-4" />
                                            Connect Bank
                                        </>
                                    )}
                                </Button>
                                <Button variant="glass" size="lg" className="w-full" onClick={() => setDialogOpen(false)}>
                                    {fActions.cancel || "Cancel"}
                                </Button>
                            </FormDialogActions>
                        </>
                    )}

                    {/* ============== Edit Account (name & color only) ============== */}
                    {editingAccount && (
                        <>
                            <FormDialogHeader
                                title={at.edit_account || "Edit Account"}
                                description={at.edit_account_description || "Update your account display name and color."}
                            />

                            <form
                                onSubmit={(e) => {
                                    e.preventDefault()
                                    handleSave()
                                }}
                                className="flex flex-col gap-4"
                            >
                                {/* Account Name */}
                                <div className="grid gap-2">
                                    <Label htmlFor="account-name">{at.account || "Account Name"}</Label>
                                    <Input
                                        id="account-name"
                                        label={at.account || "Account Name"}
                                        placeholder="e.g. Main Checking, Revolut"
                                        value={formData.name}
                                        onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                                    />
                                </div>

                                {/* Color */}
                                <div className="grid gap-2">
                                    <Label>{at.color || "Color"}</Label>
                                    <div className="flex gap-2 flex-wrap">
                                        {COLOR_OPTIONS.map((c) => (
                                            <Button variant="ghost"
                                                key={c.value}
                                                type="button"
                                                className={`size-8 sq-full border-2 transition-all ${
                                                    formData.color === c.value ? "border-foreground scale-110" : "border-transparent"
                                                }`}
                                                style={{ backgroundColor: c.value }}
                                                onClick={() => setFormData((p) => ({ ...p, color: c.value }))}
                                                title={c.label}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <FormDialogActions>
                                <Button type="submit" variant="solid" size="lg" className="w-full" disabled={isSaving}>
                                    {isSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
                                    {fActions.save || "Save"}
                                </Button>
                                <Button type="button" variant="glass" size="lg" className="w-full" onClick={() => setDialogOpen(false)}>
                                    {fActions.cancel || "Cancel"}
                                </Button>
                                </FormDialogActions>
                            </form>
                        </>
                    )}
                </FormDialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>{fActions.delete || "Delete"} &quot;{deletingAccount?.name}&quot;?</DialogTitle>
                        <DialogDescription>
                            {at.delete_description || "This action cannot be undone. This account and all associated data will be permanently removed."}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="glass" onClick={() => setDeleteDialogOpen(false)}>
                            {fActions.cancel || "Cancel"}
                        </Button>
                        <Button variant="solid-destructive" onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting && <Loader2 className="mr-2 size-4 animate-spin" />}
                            {fActions.delete || "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
