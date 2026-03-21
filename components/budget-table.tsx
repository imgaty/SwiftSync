"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    EllipsisVertical,
    Columns,
    Plus,
    Pencil,
    Delete,
    AlertTriangle,
    CheckCircle,
    TrendingUp,
} from "lucide-react"

import {
    ColumnDef,
    ColumnFiltersState,
    flexRender,
    getCoreRowModel,
    getFacetedRowModel,
    getFacetedUniqueValues,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
    VisibilityState,
} from "@tanstack/react-table"

import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Dropdown,
    DropdownCheckboxItem,
    DropdownShell,
    DropdownItem,
    DropdownSeparator,
    DropdownTrigger,
} from "@/components/ui/app-dropdown"

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { EmptyStateInline } from "@/components/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { SmartTooltip } from "@/components/ui/tooltip"

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
        <div className="w-full bg-black/6 dark:bg-white/8 rounded-full h-2.5">
            <div
                className={`h-2.5 rounded-full transition-all duration-300 ${getColor()}`}
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

export function BudgetTable({ data: initialData, isLoading = false }: { data: Budget[]; isLoading?: boolean }) {
    const { t, isLoading: isLangLoading } = useLanguage()
    const f = (t.finance || {}) as Record<string, unknown>
    const bt = (f.budget_table || {}) as Record<string, string>
    const cat = (f.categories || {}) as Record<string, string>
    const fTable = (f.table || {}) as Record<string, string>
    const fActions = (f.actions || {}) as Record<string, string>
    const fFilter = (f.filter || {}) as Record<string, string>

    // Show loading state while translations are loading
    if (isLangLoading) {
        return <div className="flex items-center justify-center p-8">Loading...</div>
    }

    const categoryLabels: Record<string, string> = {
        Food: cat.food,
        Transport: cat.transport,
        Bills: cat.bills,
        Entertainment: cat.entertainment,
        Shopping: cat.shopping,
        Health: cat.health,
        Education: cat.education,
        Savings: cat.savings,
        Other: cat.other,
    }

    const statusLabels: Record<string, string> = {
        on_track: bt.on_track,
        warning: bt.warning,
        over_budget: bt.over_budget,
    }

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
                    <div className={`size-3 rounded-full shrink-0 ${categoryColors[row.original.category] || categoryColors.Other}`} />
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
                return <div className="text-right font-medium">{formatted}</div>
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
                    <div className={`text-right font-medium ${row.original.status === "over_budget" ? "text-red-600" : ""}`}>
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
                    <div className={`text-right font-medium ${remaining < 0 ? "text-red-600" : "text-green-600"}`}>
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
                    <span className="text-sm text-neutral-500 dark:text-neutral-400 w-12">
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
            cell: () => (
                <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                    <SmartTooltip text={fActions.edit || 'Edit'} group="table-actions">
                        <Button variant="ghost" size="icon" className="size-8 text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white">
                            <Pencil className="size-4" />
                        </Button>
                    </SmartTooltip>
                    <SmartTooltip text={fActions.delete || 'Delete'} group="table-actions">
                        <Button variant="ghost" size="icon" className="size-8 text-neutral-500 dark:text-neutral-400 hover:text-red-500">
                            <Delete className="size-4" />
                        </Button>
                    </SmartTooltip>
                </div>
            ),
        },
    ], [t, f, bt, cat, categoryLabels, statusLabels])

    const [data] = React.useState(() => initialData)
    const [rowSelection, setRowSelection] = React.useState({})
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })

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
        getPaginationRowModel: getPaginationRowModel(),
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
                        <div key={i} className="p-3.5 rounded-xl bg-black/2 dark:bg-white/3 border border-black/4 dark:border-white/4">
                            <Skeleton className="h-4 w-24 mb-2" />
                            <Skeleton className="h-8 w-32" />
                        </div>
                    ))}
                </div>

                {/* Table skeleton */}
                <div className="border border-black/6 dark:border-white/6 rounded-xl overflow-hidden">
                    <Table>
                        <TableHeader className="bg-black/3 dark:bg-white/3">
                            <TableRow>
                                <TableHead className="w-8"><Skeleton className="h-4 w-4" /></TableHead>
                                {[120, 80, 80, 80, 120, 80, 40].map((w, i) => (
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
                                            <Skeleton className="h-6 w-6 rounded" />
                                            <Skeleton className="h-4 w-24" />
                                        </div>
                                    </TableCell>
                                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Skeleton className="h-2.5 w-full rounded-full" />
                                            <Skeleton className="h-4 w-10" />
                                        </div>
                                    </TableCell>
                                    <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-6 rounded" /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

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
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Select
                        onValueChange={(value) => {
                            if (value === "all") {
                                table.getColumn("status")?.setFilterValue(undefined)
                            } else {
                                table.getColumn("status")?.setFilterValue(value)
                            }
                        }}
                    >
                        <SelectTrigger className="w-[150px]" size="sm">
                            <SelectValue placeholder={bt.status} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{fFilter.all_status || 'All Status'}</SelectItem>
                            <SelectItem value="on_track">{bt.on_track}</SelectItem>
                            <SelectItem value="warning">{bt.warning}</SelectItem>
                            <SelectItem value="over_budget">{bt.over_budget}</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select
                        onValueChange={(value) => {
                            if (value === "all") {
                                table.getColumn("category")?.setFilterValue(undefined)
                            } else {
                                table.getColumn("category")?.setFilterValue(value)
                            }
                        }}
                    >
                        <SelectTrigger className="w-[150px]" size="sm">
                            <SelectValue placeholder={bt.category} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{fFilter.all_categories || 'All Categories'}</SelectItem>
                            <SelectItem value="Food">{cat.food}</SelectItem>
                            <SelectItem value="Transport">{cat.transport}</SelectItem>
                            <SelectItem value="Bills">{cat.bills}</SelectItem>
                            <SelectItem value="Entertainment">{cat.entertainment}</SelectItem>
                            <SelectItem value="Shopping">{cat.shopping}</SelectItem>
                            <SelectItem value="Health">{cat.health}</SelectItem>
                            <SelectItem value="Education">{cat.education}</SelectItem>
                            <SelectItem value="Savings">{cat.savings}</SelectItem>
                            <SelectItem value="Other">{cat.other}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-2">
                    <Dropdown>
                        <SmartTooltip text={t.tooltips?.columns || 'Columns'} group="table-toolbar">
                            <DropdownTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <Columns />
                                    <span className="hidden lg:inline">{fTable.columns}</span>
                                    <ChevronDown />
                                </Button>
                            </DropdownTrigger>
                        </SmartTooltip>
                        <DropdownShell align="end" className="w-56">
                            {table
                                .getAllColumns()
                                .filter(
                                    (column) =>
                                        typeof column.accessorFn !== "undefined" &&
                                        column.getCanHide()
                                )
                                .map((column) => (
                                    <DropdownCheckboxItem
                                        key={column.id}
                                        className="capitalize"
                                        checked={column.getIsVisible()}
                                        onCheckedChange={(value) =>
                                            column.toggleVisibility(!!value)
                                        }
                                    >
                                        {column.id}
                                    </DropdownCheckboxItem>
                                ))}
                        </DropdownShell>
                    </Dropdown>

                    <SmartTooltip text={t.tooltips?.add_budget || 'Add Budget'} group="table-toolbar">
                        <Button variant="outline" size="sm">
                            <Plus />
                            <span className="hidden lg:inline">{bt.add_budget}</span>
                        </Button>
                    </SmartTooltip>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-3.5 rounded-xl bg-black/2 dark:bg-white/3 border border-black/4 dark:border-white/4">
                    <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{bt.total_budget}</p>
                    <p className="text-lg font-bold mt-1">
                        {formatCurrency(totals.totalBudget)}
                    </p>
                </div>
                <div className="p-3.5 rounded-xl bg-black/2 dark:bg-white/3 border border-black/4 dark:border-white/4">
                    <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{bt.total_spent}</p>
                    <p className="text-lg font-bold text-orange-600 dark:text-orange-400 mt-1">
                        {formatCurrency(totals.totalSpent)}
                    </p>
                </div>
                <div className="p-3.5 rounded-xl bg-black/2 dark:bg-white/3 border border-black/4 dark:border-white/4">
                    <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{bt.remaining}</p>
                    <p className={`text-lg font-bold mt-1 ${totals.totalRemaining >= 0 ? "text-positive" : "text-negative"}`}>
                        {formatCurrency(totals.totalRemaining)}
                    </p>
                </div>
                <div className="p-3.5 rounded-xl bg-black/2 dark:bg-white/3 border border-black/4 dark:border-white/4">
                    <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{bt.categories_over}</p>
                    <p className="text-lg font-bold text-negative mt-1">
                        {totals.overBudgetCount}
                    </p>
                </div>
            </div>

            <div className="relative flex flex-col gap-4 overflow-auto">
                <div className="border border-black/6 dark:border-white/6 rounded-xl overflow-hidden">
                    <Table>
                        <TableHeader className="bg-black/3 dark:bg-white/3 sticky top-0 z-10">
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
                                        className="group/row border-b transition-colors hover:bg-black/3 dark:hover:bg-white/3 data-[state=selected]:bg-black/5 dark:bg-white/5"
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
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between">
                    <div className="hidden lg:flex flex-1 text-neutral-500 dark:text-neutral-400 text-sm">
                        {(fTable.rows_selected || "%count of %total selected")
                            .replace("%count", String(table.getFilteredSelectedRowModel().rows.length))
                            .replace("%total", String(table.getFilteredRowModel().rows.length))}
                    </div>
                    <div className="flex items-center gap-2">
                        <SmartTooltip text={t.tooltips?.first_page || 'First Page'} group="table-pagination">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => table.setPageIndex(0)}
                                disabled={!table.getCanPreviousPage()}
                            >
                                <ChevronsLeft className="size-4" />
                            </Button>
                        </SmartTooltip>
                        <SmartTooltip text={t.tooltips?.previous_page || 'Previous Page'} group="table-pagination">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => table.previousPage()}
                                disabled={!table.getCanPreviousPage()}
                            >
                                <ChevronLeft className="size-4" />
                            </Button>
                        </SmartTooltip>
                        <span className="text-sm">
                            {(fTable.page_of || "Page %current of %total")
                                .replace("%current", String(table.getState().pagination.pageIndex + 1))
                                .replace("%total", String(table.getPageCount()))}
                        </span>
                        <SmartTooltip text={t.tooltips?.next_page || 'Next Page'} group="table-pagination">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => table.nextPage()}
                                disabled={!table.getCanNextPage()}
                            >
                                <ChevronRight className="size-4" />
                            </Button>
                        </SmartTooltip>
                        <SmartTooltip text={t.tooltips?.last_page || 'Last Page'} group="table-pagination">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                                disabled={!table.getCanNextPage()}
                            >
                                <ChevronsRight className="size-4" />
                            </Button>
                        </SmartTooltip>
                    </div>
                </div>
            </div>
        </div>
    )
}
