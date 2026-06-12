//
//  budget-table.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Implements the Budget table React component for Argent, encapsulating reusable interface
//  structure, state handling, and presentation logic for feature screens.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    AlertTriangle,
    CheckCircle,
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
import { UDS } from "@/lib/UDS"
import { cn } from "@/lib/utils"

import { useLanguage } from "@/components/language-provider"

export const budgetSchema = z.object({
    id: z.string().optional(),
    tag: z.string(),
    category: z.string(),
    limit: z.number(),
    budgetAmount: z.number(),
    spentAmount: z.number(),
    color: z.string(),
    status: z.string().optional(),
    remainingAmount: z.number().optional(),
    percentUsed: z.number().optional(),
    month: z.string().optional(),
    year: z.number().optional(),
})

export type Budget = z.infer<typeof budgetSchema>

function ProgressBar({ percent, status }: { percent: number; status: string }) {
    const getColor = () => {
        if (status === "over_budget") return "bg-red-500"
        if (status === "warning") return "bg-yellow-500"
        return "bg-green-500"
    }

    return (
        <div className={cn("w-full h-2.5", UDS.pillSurface)}>
            <div
                className={`h-2.5 sq-full transition-all duration-300 ${getColor()}`}
                style={{ width: `${Math.min(percent, 100)}%` }}
            />
        </div>
    )
}

const categoryColors: Record<string, string> = {
    Food: "bg-orange-500",
    Transport: "bg-blue-500",
    Bills: "bg-red-500",
    Entertainment: "bg-purple-500",
    Shopping: "bg-pink-500",
    Health: "bg-cyan-500",
    Education: "bg-indigo-500",
    Savings: "bg-green-500",
    Other: "bg-neutral-500",
}

export function BudgetTable({
    data: initialData,
    isLoading = false,
    onAddBudget,
    onEditBudget,
    onDeleteBudget,
}: {
    data: Budget[]
    isLoading?: boolean
    onAddBudget?: () => void
    onEditBudget?: (budget: Budget) => void
    onDeleteBudget?: (budget: Budget) => void
}) {
    const { t, isLoading: isLangLoading } = useLanguage()
    const f = React.useMemo(() => (t.finance || {}) as Record<string, unknown>, [t.finance])
    const bt = React.useMemo(() => (f.budget_table || {}) as Record<string, string>, [f])
    const cat = React.useMemo(() => (f.categories || {}) as Record<string, string>, [f])
    const fTable = React.useMemo(() => (f.table || {}) as Record<string, string>, [f])
    const fActions = React.useMemo(() => (f.actions || {}) as Record<string, string>, [f])
    const fFilter = React.useMemo(() => (f.filter || {}) as Record<string, string>, [f])

    const categoryLabels: Record<string, string> = React.useMemo(() => ({
        Food: cat.food,
        Transport: cat.transport,
        Bills: cat.bills,
        Entertainment: cat.entertainment,
        Shopping: cat.shopping,
        Health: cat.health,
        Education: cat.education,
        Savings: cat.savings,
        Other: cat.other,
    }), [cat])

    const statusLabels: Record<string, string> = React.useMemo(() => ({
        on_track: bt.on_track,
        warning: bt.warning,
        over_budget: bt.over_budget,
    }), [bt])

    const columns: ColumnDef<Budget>[] = React.useMemo(() => [
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
            accessorKey: "category",
            header: bt.category,
            cell: ({ row }) => (
                <div className="flex items-center gap-2 min-w-0">
                    <div className={`size-3 sq-full shrink-0 ${categoryColors[row.original.category] || categoryColors.Other}`} />
                    <span className="auto-scroll font-medium">{categoryLabels[row.original.category] || row.original.category}</span>
                </div>
            ),
            enableHiding: false,
        },
        {
            accessorKey: "budgetAmount",
            header: () => <div className="text-right">{bt.budget}</div>,
            cell: ({ row }) => {
                const formatted = new Intl.NumberFormat(t.config.locale, {
                    style: "currency",
                    currency: "EUR",
                }).format(row.original.budgetAmount)
                return <div className="text-right font-medium tabular-nums">{formatted}</div>
            },
        },
        {
            accessorKey: "spentAmount",
            header: () => <div className="text-right">{bt.spent}</div>,
            cell: ({ row }) => {
                const formatted = new Intl.NumberFormat(t.config.locale, {
                    style: "currency",
                    currency: "EUR",
                }).format(row.original.spentAmount)
                return (
                    <div className={`text-right font-medium tabular-nums ${row.original.status === "over_budget" ? "text-red-600" : ""}`}>
                        {formatted}
                    </div>
                )
            },
        },
        {
            accessorKey: "remainingAmount",
            header: () => <div className="text-right">{bt.remaining}</div>,
            cell: ({ row }) => {
                const remaining = row.original.remainingAmount ?? 0
                const formatted = new Intl.NumberFormat(t.config.locale, {
                    style: "currency",
                    currency: "EUR",
                }).format(Math.abs(remaining))
                return (
                    <div className={`text-right font-medium tabular-nums ${remaining < 0 ? "text-red-600" : "text-green-600"}`}>
                        {remaining < 0 ? "-" : ""}{formatted}
                    </div>
                )
            },
        },
        {
            accessorKey: "percentUsed",
            header: bt.progress,
            cell: ({ row }) => (
                <div className="flex items-center gap-2 min-w-[150px]">
                    <ProgressBar percent={row.original.percentUsed ?? 0} status={row.original.status ?? 'on_track'} />
                    <span className="text-sm text-neutral-500 dark:text-neutral-400 w-12 tabular-nums">
                        {(row.original.percentUsed ?? 0).toFixed(0)}%
                    </span>
                </div>
            ),
        },
        {
            accessorKey: "status",
            header: bt.status,
            cell: ({ row }) => {
                const status = row.original.status ?? 'on_track'
                const statusConfig: Record<string, { icon: typeof CheckCircle; className: string }> = {
                    on_track: {
                        icon: CheckCircle,
                        className: "bg-green-500/10 text-green-600 border-green-200",
                    },
                    warning: {
                        icon: AlertTriangle,
                        className: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
                    },
                    over_budget: {
                        icon: AlertTriangle,
                        className: "bg-red-500/10 text-red-600 border-red-200",
                    },
                }
                const config = statusConfig[status] ?? statusConfig.on_track
                const Icon = config.icon

                return (
                    <Badge variant="outline" className={`${config.className} gap-1`}>
                        <Icon className="size-3" />
                        {statusLabels[status]}
                    </Badge>
                )
            },
        },
        {
            accessorKey: "month",
            header: bt.period,
            cell: ({ row }) => (
                <div className="text-neutral-500 dark:text-neutral-400">
                    {row.original.month} {row.original.year}
                </div>
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
                            if (onEditBudget) onEditBudget(row.original)
                            else toast.info(`${fActions.edit || "Edit"}: ${row.original.category}`)
                        }}
                    />
                    <TableActionButton
                        intent="delete"
                        label={fActions.delete || "Delete"}
                        onClick={() => {
                            if (onDeleteBudget) onDeleteBudget(row.original)
                            else toast.info(`${fActions.delete || "Delete"}: ${row.original.category}`)
                        }}
                    />
                </TableActionsCell>
            ),
        },
    ], [t, bt, categoryLabels, statusLabels, fTable, fActions, onEditBudget, onDeleteBudget])

    const [data, setData] = React.useState(() => initialData)

    React.useEffect(() => {
        setData(initialData)
    }, [initialData])
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
        getRowId: (row) => (row.id ?? row.tag).toString(),
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
        let totalBudget = 0
        let totalSpent = 0
        let overBudgetCount = 0
        // Single pass through data instead of multiple reduce calls
        for (const b of data) {
            totalBudget += b.budgetAmount
            totalSpent += b.spentAmount
            if (b.status === "over_budget") overBudgetCount++
        }
        return { totalBudget, totalSpent, totalRemaining: totalBudget - totalSpent, overBudgetCount }
    }, [data])

    // Memoize currency formatter to avoid recreation on each render
    const formatCurrency = React.useCallback(
        (value: number) => new Intl.NumberFormat(t.config.locale, { style: "currency", currency: "EUR" }).format(value),
        [t.config.locale]
    )

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
                        <Skeleton className="h-8 w-[120px]" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-24" />
                        <Skeleton className="h-8 w-32" />
                    </div>
                </div>

                {/* Summary Cards skeleton */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} className={`${UDS.tileSurface} p-3.5`}>
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
                                <TableHead className="w-8"><Skeleton className="size-4" /></TableHead>
                                {[120, 80, 80, 80, 120, 80, 40].map((w, i) => (
                                    <TableHead key={i}><Skeleton className="h-4" style={{ width: w }} /></TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[...Array(8)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="size-4" /></TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Skeleton className="size-6 sq" />
                                            <Skeleton className="h-4 w-24" />
                                        </div>
                                    </TableCell>
                                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Skeleton className="h-2.5 w-full sq-full" />
                                            <Skeleton className="h-4 w-10" />
                                        </div>
                                    </TableCell>
                                    <TableCell><Skeleton className="h-5 w-20 sq-full" /></TableCell>
                                    <TableCell><Skeleton className="size-6 sq" /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableShell>

                {/* Pagination skeleton */}
                <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-40 hidden lg:block" />
                    <div className="flex items-center gap-2">
                        {[0, 1, 2, 3].map(i => <Skeleton key={i} className="size-8" />)}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4 w-full">
            <TableToolbar>
                <TableToolbarGroup>
                    <TableSearchControl table={table} placeholder={bt.search_budgets || "Search budgets…"} width={240} />
                    <TableFilterSelect
                        table={table}
                        columnId="status"
                        label={bt.status || "Status"}
                        allLabel={fFilter.all_status || "All Status"}
                        options={[
                            { value: "on_track", label: bt.on_track },
                            { value: "warning", label: bt.warning },
                            { value: "over_budget", label: bt.over_budget },
                        ]}
                    />
                    <TableFilterSelect
                        table={table}
                        columnId="category"
                        label={bt.category || "Category"}
                        allLabel={fFilter.all_categories || "All Categories"}
                        options={[
                            { value: "Food", label: cat.food },
                            { value: "Transport", label: cat.transport },
                            { value: "Bills", label: cat.bills },
                            { value: "Entertainment", label: cat.entertainment },
                            { value: "Shopping", label: cat.shopping },
                            { value: "Health", label: cat.health },
                            { value: "Education", label: cat.education },
                            { value: "Savings", label: cat.savings },
                            { value: "Other", label: cat.other },
                        ]}
                    />
                </TableToolbarGroup>

                <TableToolbarGroup>
                    <TableSortControl
                        table={table}
                        options={[
                            { id: "category", label: bt.category || "Category" },
                            { id: "budget", label: bt.budget || "Budget" },
                            { id: "spent", label: bt.spent || "Spent" },
                        ]}
                    />
                    <TableColumnsControl table={table} label={fTable.columns || "Columns"} />
                    <TableAddButton onClick={onAddBudget} label={bt.add_budget || "Add Budget"} />
                </TableToolbarGroup>
            </TableToolbar>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`${UDS.tileSurface} p-3.5`}>
                    <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{bt.total_budget}</p>
                    <p className="text-lg font-bold mt-1 tabular-nums">
                        {formatCurrency(totals.totalBudget)}
                    </p>
                </div>
                <div className={`${UDS.tileSurface} p-3.5`}>
                    <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{bt.total_spent}</p>
                    <p className="text-lg font-bold text-orange-600 dark:text-orange-400 mt-1 tabular-nums">
                        {formatCurrency(totals.totalSpent)}
                    </p>
                </div>
                <div className={`${UDS.tileSurface} p-3.5`}>
                    <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{bt.remaining}</p>
                    <p className={`text-lg font-bold mt-1 tabular-nums ${totals.totalRemaining >= 0 ? "text-positive" : "text-negative"}`}>
                        {formatCurrency(totals.totalRemaining)}
                    </p>
                </div>
                <div className={`${UDS.tileSurface} p-3.5`}>
                    <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{bt.categories_over}</p>
                    <p className="text-lg font-bold text-negative mt-1 tabular-nums">
                        {totals.overBudgetCount}
                    </p>
                </div>
            </div>

            <div className="relative flex flex-col gap-4 overflow-auto">
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
                                        className={cn("group/row cursor-pointer transition-colors", UDS.itemHover, UDS.rowSelected)}
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
                                            variant={columnFilters.length > 0 ? "filtered" : "no-budgets"}
                                        />
                                    </TableCell>
                                </TableRow>
                            )}
                            </AnimatePresence>
                        </TableBody>
                    </Table>
                    </TableScrollArea>
                </TableShell>
            </div>
        </div>
    )
}
