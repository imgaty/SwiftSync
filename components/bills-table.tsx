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
    Calendar,
    CheckCircle,
    Clock,
    AlertCircle,
    RefreshCw,
    Bell,
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

const tagColors: Record<string, string> = {
    utilities: "bg-yellow-500",
    housing: "bg-blue-500",
    insurance: "bg-green-500",
    subscriptions: "bg-purple-500",
    services: "bg-cyan-500",
    health: "bg-pink-500",
    other: "bg-neutral-500",
}

const categoryConfig: Record<string, { color: string; icon: string }> = {
    Other: { color: "bg-neutral-500", icon: "📦" },
    utilities: { color: "bg-yellow-500", icon: "⚡" },
    housing: { color: "bg-blue-500", icon: "🏠" },
    insurance: { color: "bg-green-500", icon: "🛡️" },
    subscriptions: { color: "bg-purple-500", icon: "🔄" },
    services: { color: "bg-cyan-500", icon: "🔧" },
    health: { color: "bg-pink-500", icon: "🏥" },
}

const tagIcons: Record<string, string> = {
    utilities: "⚡",
    housing: "🏠",
    insurance: "🛡️",
    subscriptions: "📺",
    services: "🔧",
    health: "🏥",
    other: "📋",
}

export function BillsTable({ data: initialData, isLoading = false }: { data: Bill[]; isLoading?: boolean }) {
    const { t, isLoading: isLangLoading } = useLanguage()
    const f = (t.finance || {}) as Record<string, unknown>
    const bl = (f.bills_table || {}) as Record<string, string>
    const fTable = (f.table || {}) as Record<string, string>
    const fActions = (f.actions || {}) as Record<string, string>
    const fFilters = (f.filters || {}) as Record<string, string>

    // Show loading state while translations are loading
    if (isLangLoading) {
        return <div className="flex items-center justify-center p-8">Loading...</div>
    }

    const statusConfig = {
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
    }

    const frequencyLabels: Record<string, string> = {
        weekly: bl.weekly,
        monthly: bl.monthly,
        quarterly: bl.quarterly,
        yearly: bl.yearly,
        one_time: bl.one_time,
    }

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
                            <div className="auto-scroll text-xs text-neutral-500 dark:text-neutral-400">{category}</div>
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
                const formatted = new Intl.NumberFormat(t.config.locale, {
                    style: "currency",
                    currency: "EUR",
                }).format(row.original.amount)
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
                
                let dueDateClass = "text-neutral-500 dark:text-neutral-400"
                let dueText = ""
                
                if (diffDays < 0) {
                    dueDateClass = "text-red-600 font-medium"
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
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">{dueText}</div>
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
                // @ts-ignore
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
                <div className="text-neutral-500 dark:text-neutral-400">{row.original.account}</div>
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
                    <SmartTooltip text={fActions.mark_paid || 'Mark Paid'} group="table-actions">
                        <Button variant="ghost" size="icon" className="size-8 text-neutral-500 dark:text-neutral-400 hover:text-green-600">
                            <CheckCircle className="size-4" />
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
    ], [t, f, bl, statusConfig, frequencyLabels])

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
        getRowId: (row) => row.id.toString(),
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
                <div className="border border-black/6 dark:border-white/6 rounded-xl overflow-hidden">
                    <Table>
                        <TableHeader className="bg-black/3 dark:bg-white/3">
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
                        <SelectTrigger className="w-[130px]" size="sm">
                            <SelectValue placeholder={bl.status} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{fFilters.all_status || 'All Status'}</SelectItem>
                            <SelectItem value="paid">{bl.paid}</SelectItem>
                            <SelectItem value="pending">{bl.pending}</SelectItem>
                            <SelectItem value="overdue">{bl.overdue}</SelectItem>
                            <SelectItem value="upcoming">{bl.upcoming}</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select
                        onValueChange={(value) => {
                            if (value === "all") {
                                table.getColumn("frequency")?.setFilterValue(undefined)
                            } else {
                                table.getColumn("frequency")?.setFilterValue(value)
                            }
                        }}
                    >
                        <SelectTrigger className="w-[140px]" size="sm">
                            <SelectValue placeholder={bl.frequency} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{fFilters.all_frequencies || 'All Frequencies'}</SelectItem>
                            <SelectItem value="weekly">{bl.weekly}</SelectItem>
                            <SelectItem value="monthly">{bl.monthly}</SelectItem>
                            <SelectItem value="quarterly">{bl.quarterly}</SelectItem>
                            <SelectItem value="yearly">{bl.yearly}</SelectItem>
                            <SelectItem value="one_time">{bl.one_time}</SelectItem>
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

                    <SmartTooltip text={t.tooltips?.add_bill || 'Add Bill'} group="table-toolbar">
                        <Button variant="outline" size="sm">
                            <Plus />
                            <span className="hidden lg:inline">{bl.add_bill}</span>
                        </Button>
                    </SmartTooltip>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-3.5 rounded-xl bg-black/2 dark:bg-white/3 border border-black/4 dark:border-white/4">
                    <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{bl.monthly_bills}</p>
                    <p className="text-lg font-bold mt-1">
                        {formatCurrency(totals.totalMonthly)}
                    </p>
                </div>
                <div className="p-3.5 rounded-xl bg-black/2 dark:bg-white/3 border border-black/4 dark:border-white/4">
                    <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{bl.pending_amount}</p>
                    <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                        {formatCurrency(totals.totalPending)}
                    </p>
                </div>
                <div className="p-3.5 rounded-xl bg-black/2 dark:bg-white/3 border border-black/4 dark:border-white/4">
                    <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{bl.overdue}</p>
                    <p className="text-lg font-bold text-negative mt-1">
                        {totals.overdueCount}
                    </p>
                </div>
                <div className="p-3.5 rounded-xl bg-black/2 dark:bg-white/3 border border-black/4 dark:border-white/4">
                    <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{bl.upcoming}</p>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">
                        {totals.upcomingCount}
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
                                            variant={columnFilters.length > 0 ? "filtered" : "no-bills"}
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
