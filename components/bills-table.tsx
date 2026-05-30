//
//  bills-table.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Implements the Bills table React component for Argent, encapsulating reusable interface
//  structure, state handling, and presentation logic for feature screens.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Calendar,
    CheckCircle,
    Clock,
    AlertCircle,
    RefreshCw,
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

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

import {
    TableShell,
    TableScrollArea,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableActionsCell,
    TableActionButton,
    TableToolbar,
    TableToolbarGroup,
    TableSearchControl,
    TableFilterSelect,
    TableSortControl,
    TableColumnsControl,
    TableAddButton,
} from "@/components/ui/table"
import { EmptyStateInline } from "@/components/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

import { useLanguage } from "@/components/language-provider"
import { useCurrency } from "@/components/currency-provider"
import { MobileCard, MobileCardList, useIsMobileView } from "@/components/mobile-card"

export const billSchema = z.object({
    id: z.string(),
    name: z.string(),
    amount: z.number(),
    tags: z.array(z.string()),
    dueDay: z.number(),
    frequency: z.enum(["weekly", "monthly", "yearly"]),
    accountId: z.string(),
    category: z.string(),
    dueDate: z.string().optional(),
    status: z.string().optional(),
    autopay: z.boolean().optional(),
    account: z.string().optional(),
})

export type Bill = z.infer<typeof billSchema>

const categoryConfig: Record<string, { color: string; icon: string }> = {
    Other: { color: "bg-neutral-500", icon: "📦" },
    utilities: { color: "bg-yellow-500", icon: "⚡" },
    housing: { color: "bg-blue-500", icon: "🏠" },
    insurance: { color: "bg-green-500", icon: "🛡️" },
    subscriptions: { color: "bg-purple-500", icon: "🔄" },
    services: { color: "bg-cyan-500", icon: "🔧" },
    health: { color: "bg-pink-500", icon: "🏥" },
}

export function BillsTable({ data: initialData, isLoading = false, onAddBill, onEditBill, onDeleteBill, onMarkPaid }: { data: Bill[]; isLoading?: boolean; onAddBill?: () => void; onEditBill?: (bill: Bill) => void; onDeleteBill?: (bill: Bill) => void; onMarkPaid?: (bill: Bill) => void }) {
    const { t, isLoading: isLangLoading } = useLanguage()
    const { formatCurrency } = useCurrency()
    const f = React.useMemo(() => (t.finance || {}) as Record<string, unknown>, [t.finance])
    const bl = React.useMemo(() => (f.bills_table || {}) as Record<string, string>, [f])
    const fTable = React.useMemo(() => (f.table || {}) as Record<string, string>, [f])
    const fActions = React.useMemo(() => (f.actions || {}) as Record<string, string>, [f])
    const fFilters = React.useMemo(() => (f.filters || {}) as Record<string, string>, [f])

    const [data, setData] = React.useState(() => initialData)

    React.useEffect(() => {
        setData(initialData)
    }, [initialData])

    const statusConfig = React.useMemo(() => ({
        paid: {
            label: bl.paid,
            icon: CheckCircle,
            className: "bg-positive-subtle text-positive border-positive-subtle",
        },
        pending: {
            label: bl.pending,
            icon: Clock,
            className: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
        },
        overdue: {
            label: bl.overdue,
            icon: AlertCircle,
            className: "bg-negative-subtle text-negative border-negative-subtle",
        },
        upcoming: {
            label: bl.upcoming,
            icon: Calendar,
            className: "bg-blue-500/10 text-blue-600 border-blue-200",
        },
    }), [bl])

    const frequencyLabels: Record<string, string> = React.useMemo(() => ({
        weekly: bl.weekly,
        monthly: bl.monthly,
        quarterly: bl.quarterly,
        yearly: bl.yearly,
        one_time: bl.one_time,
    }), [bl])

    const columns: ColumnDef<Bill>[] = React.useMemo(() => [
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
            header: bl.bill_name,
            cell: ({ row }) => {
                const category = row.original.category
                const config = categoryConfig[category] || categoryConfig.Other
                return (
                    <div className="flex items-center gap-2">
                        <div className={`size-8 rounded-lg ${config.color} flex items-center justify-center text-white text-sm`}>
                            {config.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="auto-scroll font-medium">{row.original.name}</div>
                            <div className="auto-scroll text-xs text-neutral-400">{category}</div>
                        </div>
                    </div>
                )
            },
            enableHiding: false,
        },
        {
            accessorKey: "amount",
            header: () => <div className="text-right">{bl.amount}</div>,
            cell: ({ row }) => {
                const formatted = formatCurrency(row.original.amount)
                return <div className="text-right font-medium">{formatted}</div>
            },
        },
        {
            accessorKey: "dueDate",
            header: bl.due_date,
            cell: ({ row }) => {
                const dueDate = new Date(row.original.dueDate || new Date().toISOString())
                const today = new Date()
                const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                
                let dueDateClass = "text-neutral-400"
                let dueText = ""
                
                if (diffDays < 0) {
                    dueDateClass = "text-negative font-medium"
                    dueText = bl.days_overdue.replace("%days", String(Math.abs(diffDays)))
                } else if (diffDays === 0) {
                    dueDateClass = "text-orange-600 font-medium"
                    dueText = bl.due_today
                } else if (diffDays <= 7) {
                    dueDateClass = "text-yellow-600"
                    dueText = bl.in_days.replace("%days", String(diffDays))
                } else {
                    dueText = row.original.dueDate || ""
                }

                return (
                    <div>
                        <div className={dueDateClass}>{row.original.dueDate}</div>
                        <div className="text-xs text-neutral-400">{dueText}</div>
                    </div>
                )
            },
        },
        {
            accessorKey: "frequency",
            header: bl.frequency,
            cell: ({ row }) => (
                <Badge variant="secondary" className="gap-1">
                    <RefreshCw className="size-3" />
                    {frequencyLabels[row.original.frequency]}
                </Badge>
            ),
        },
        {
            accessorKey: "status",
            header: bl.status,
            cell: ({ row }) => {
                const status = row.original.status || "pending"
                // @ts-expect-error indexing translation map by status string
                const config = statusConfig[status] || statusConfig.pending
                const Icon = config.icon

                return (
                    <Badge variant="outline" className={`${config.className} gap-1`}>
                        <Icon className="size-3" />
                        {config.label}
                    </Badge>
                )
            },
        },
        {
            accessorKey: "autopay",
            header: bl.autopay,
            cell: ({ row }) => (
                <Badge variant={row.original.autopay ? "default" : "outline"} className="gap-1">
                    {row.original.autopay ? (
                        <>
                            <CheckCircle className="size-3" />
                            {bl.enabled}
                        </>
                    ) : (
                        bl.disabled
                    )}
                </Badge>
            ),
        },
        {
            accessorKey: "account",
            header: bl.account,
            cell: ({ row }) => (
                <div className="text-neutral-400">{row.original.account}</div>
            ),
        },
        {
            id: "actions",
            cell: ({ row }) => (
                <TableActionsCell>
                    <TableActionButton
                        intent="edit"
                        label={fActions.edit || "Edit"}
                        onClick={() => {
                            if (onEditBill) onEditBill(row.original)
                            else toast.info(`${fActions.edit || "Edit"}: ${row.original.name}`)
                        }}
                    />
                    <TableActionButton
                        label={fActions.mark_paid || "Mark Paid"}
                        icon={<CheckCircle className="size-4" />}
                        className="hover:text-green-600 dark:hover:text-green-400"
                        onClick={() => {
                            if (onMarkPaid) onMarkPaid(row.original)
                            else toast.success(`${fActions.mark_paid || "Mark Paid"}: ${row.original.name}`)
                        }}
                    />
                    <TableActionButton
                        intent="delete"
                        label={fActions.delete || "Delete"}
                        onClick={() => {
                            if (onDeleteBill) onDeleteBill(row.original)
                            else toast.info(`${fActions.delete || "Delete"}: ${row.original.name}`)
                        }}
                    />
                </TableActionsCell>
            ),
        },
    ], [bl, statusConfig, frequencyLabels, formatCurrency, fTable, fActions, onEditBill, onDeleteBill, onMarkPaid])

    const [rowSelection, setRowSelection] = React.useState({})
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })

    // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table owns internal mutable row helpers.
    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
            columnVisibility,
            rowSelection,
            columnFilters,
            pagination,
        },
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

    const isMobile = useIsMobileView()

    const totals = React.useMemo(() => {
        let totalMonthly = 0
        let totalPending = 0
        let overdueCount = 0
        let upcomingCount = 0
        // Single pass through data instead of multiple filter/reduce calls
        for (const b of data) {
            if (b.frequency === "monthly") totalMonthly += b.amount
            if (b.status === "pending" || b.status === "upcoming") {
                totalPending += b.amount
                upcomingCount++
            }
            if (b.status === "overdue") overdueCount++
        }
        return { totalMonthly, totalPending, overdueCount, upcomingCount }
    }, [data])

    // Show loading state while translations are loading
    if (isLangLoading) {
        return <div className="flex items-center justify-center p-8">Loading...</div>
    }

    // Loading skeleton
    if (isLoading) {
        return (
            <div className="flex flex-col gap-4 w-full">
                {/* Header skeleton */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-[130px]" />
                        <Skeleton className="h-8 w-[140px]" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-24" />
                        <Skeleton className="h-8 w-32" />
                    </div>
                </div>

                {/* Summary Cards skeleton */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} className="p-3.5 rounded-xl bg-black/2 dark:bg-white/3 border border-black/4 dark:border-white/4">
                            <Skeleton className="h-4 w-24 mb-2" />
                            <Skeleton className="h-8 w-32" />
                        </div>
                    ))}
                </div>

                {/* Table skeleton */}
                <TableShell>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-8"><Skeleton className="h-4 w-4" /></TableHead>
                                {[120, 80, 80, 100, 80, 80, 80, 40].map((w, i) => (
                                    <TableHead key={i}><Skeleton className="h-4" style={{ width: w }} /></TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[...Array(8)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Skeleton className="h-10 w-10 rounded-lg" />
                                            <div>
                                                <Skeleton className="h-4 w-24 mb-1" />
                                                <Skeleton className="h-3 w-20" />
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-4 rounded-full" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-6 rounded" /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableShell>

                {/* Pagination skeleton */}
                <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-40 hidden lg:block" />
                    <div className="flex items-center gap-2">
                        {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-8" />)}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4 w-full">
            <TableToolbar>
                <TableToolbarGroup>
                    <TableSearchControl table={table} placeholder={bl.search_bills || "Search bills…"} width={240} />
                    <TableFilterSelect
                        table={table}
                        columnId="status"
                        label={bl.status || "Status"}
                        allLabel={fFilters.all_status || "All Status"}
                        options={[
                            { value: "paid", label: bl.paid },
                            { value: "pending", label: bl.pending },
                            { value: "overdue", label: bl.overdue },
                            { value: "upcoming", label: bl.upcoming },
                        ]}
                    />
                    <TableFilterSelect
                        table={table}
                        columnId="frequency"
                        label={bl.frequency || "Frequency"}
                        allLabel={fFilters.all_frequencies || "All Frequencies"}
                        options={[
                            { value: "weekly", label: bl.weekly },
                            { value: "monthly", label: bl.monthly },
                            { value: "quarterly", label: bl.quarterly },
                            { value: "yearly", label: bl.yearly },
                            { value: "one_time", label: bl.one_time },
                        ]}
                    />
                </TableToolbarGroup>

                <TableToolbarGroup>
                    <TableSortControl
                        table={table}
                        options={[
                            { id: "name", label: bl.name || "Name" },
                            { id: "amount", label: bl.amount || "Amount" },
                            { id: "dueDate", label: bl.due_date || "Due Date" },
                        ]}
                    />
                    <TableColumnsControl table={table} label={fTable.columns || "Columns"} />
                    <TableAddButton onClick={onAddBill} label={bl.add_bill || "Add Bill"} />
                </TableToolbarGroup>
            </TableToolbar>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-3.5 rounded-xl bg-black/2 dark:bg-white/3 border border-black/4 dark:border-white/4">
                    <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">{bl.monthly_bills}</p>
                    <p className="text-lg font-bold mt-1">
                        {formatCurrency(totals.totalMonthly)}
                    </p>
                </div>
                <div className="p-3.5 rounded-xl bg-black/2 dark:bg-white/3 border border-black/4 dark:border-white/4">
                    <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">{bl.pending_amount}</p>
                    <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                        {formatCurrency(totals.totalPending)}
                    </p>
                </div>
                <div className="p-3.5 rounded-xl bg-black/2 dark:bg-white/3 border border-black/4 dark:border-white/4">
                    <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">{bl.overdue}</p>
                    <p className="text-lg font-bold text-negative mt-1">
                        {totals.overdueCount}
                    </p>
                </div>
                <div className="p-3.5 rounded-xl bg-black/2 dark:bg-white/3 border border-black/4 dark:border-white/4">
                    <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">{bl.upcoming}</p>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">
                        {totals.upcomingCount}
                    </p>
                </div>
            </div>

            <div className="relative flex flex-col gap-4 overflow-auto">
                {isMobile ? (
                    <MobileCardList>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row, index) => {
                                const bill = row.original
                                const status = bill.status || "pending"
                                // @ts-expect-error indexing translation map by status string
                                const statusCfg = statusConfig[status] || statusConfig.pending
                                return (
                                    <MobileCard
                                        key={row.id}
                                        item={bill}
                                        id={bill.id}
                                        index={index}
                                        isSelected={row.getIsSelected()}
                                        onSelect={(checked) => row.toggleSelected(checked)}
                                        icon={
                                            <div className={`size-8 rounded-lg ${(categoryConfig[bill.category] || categoryConfig.Other).color} flex items-center justify-center text-white text-sm`}>
                                                {(categoryConfig[bill.category] || categoryConfig.Other).icon}
                                            </div>
                                        }
                                        title={bill.name}
                                        subtitle={bill.category}
                                        badge={{
                                            label: statusCfg.label,
                                            variant: status === "overdue" ? "destructive" : status === "paid" ? "default" : "secondary",
                                        }}
                                        fields={[
                                            {
                                                label: bl.amount || "Amount",
                                                value: formatCurrency(bill.amount),
                                            },
                                            {
                                                label: bl.due_date || "Due Date",
                                                value: bill.dueDate || "—",
                                            },
                                            {
                                                label: bl.frequency || "Frequency",
                                                value: frequencyLabels[bill.frequency] || bill.frequency,
                                            },
                                            {
                                                label: bl.autopay || "Autopay",
                                                value: bill.autopay ? (bl.enabled || "Enabled") : (bl.disabled || "Disabled"),
                                            },
                                        ]}
                                    />
                                )
                            })
                        ) : (
                            <EmptyStateInline variant={columnFilters.length > 0 ? "filtered" : "no-bills"} />
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
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
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
                                        transition={{ 
                                            duration: 0.2,
                                            delay: index * 0.02
                                        }}
                                        data-state={row.getIsSelected() && "selected"}
                                        onClick={(e) => {
                                            const target = e.target as HTMLElement
                                            if (target.closest("button, a, input, select, textarea, [role=checkbox], [data-no-row-click]")) return
                                            row.toggleSelected()
                                        }}
                                        className="group/row cursor-pointer transition-colors hover:bg-black/2.5 dark:hover:bg-white/4 data-[state=selected]:bg-primary/5 dark:data-[state=selected]:bg-primary/10"
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
                                        <EmptyStateInline 
                                            variant={columnFilters.length > 0 ? "filtered" : "no-bills"}
                                        />
                                    </TableCell>
                                </TableRow>
                            )}
                            </AnimatePresence>
                        </TableBody>
                    </Table>
                    </TableScrollArea>
                </TableShell>
                )}
            </div>
        </div>
    )
}
