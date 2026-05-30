//
//  transactions-table.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Implements the Transactions table React component for Argent, encapsulating reusable
//  interface structure, state handling, and presentation logic for feature screens.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
    ArrowUpRight,
    ArrowDownRight,
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

import {
    Tabs,
    TabsContent,
} from "@/components/ui/tabs"

import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

import { useLanguage } from "@/components/language-provider"
import { useCurrency } from "@/components/currency-provider"
import { MobileCard, MobileCardList, useIsMobileView } from "@/components/mobile-card"
import type { Account } from "@/lib/types"
import { TagCell } from "@/components/transactions/tag-cell"
import { useAvailableTags } from "@/components/tag-picker"

export const transactionSchema = z.object({
    id: z.string(),
    date: z.string(),
    description: z.string(),
    tags: z.array(z.string()),
    type: z.enum(["in", "out"]),
    amount: z.number(),
    accountId: z.string(),
})

export type Transaction = z.infer<typeof transactionSchema>

interface TransactionsTableProps {
    data: Transaction[]
    accounts?: Account[]
    isLoading?: boolean
    showSummary?: boolean
    showToolbar?: boolean
    variant?: "default" | "dashboard"
    pageSize?: number
    showSelectColumn?: boolean
    showActionsColumn?: boolean
    onEditTransaction?: (transaction: Transaction) => void
    onDeleteTransaction?: (transaction: Transaction) => void
    onAddTransaction?: () => void
}

// (DraggableRow removed: drag-and-drop disabled.)

export function TransactionsTable({
    data: initialData,
    accounts = [],
    isLoading = false,
    showToolbar = true,
    variant = "default",
    pageSize = 10,
    showSelectColumn,
    showActionsColumn,
    onEditTransaction,
    onDeleteTransaction,
    onAddTransaction,
}: TransactionsTableProps) {
    const { t, isLoading: isLangLoading } = useLanguage()
    const { formatCurrency } = useCurrency()
    const f = React.useMemo(() => (t.finance || {}) as Record<string, unknown>, [t.finance])
    const tt = React.useMemo(() => (f.transactions_table || {}) as Record<string, string>, [f])
    const fTable = React.useMemo(() => (f.table || {}) as Record<string, string>, [f])
    const fActions = React.useMemo(() => (f.actions || {}) as Record<string, string>, [f])
    const fFilter = React.useMemo(() => (f.filter || {}) as Record<string, string>, [f])
    const isDashboard = variant === "dashboard"
    const selectEnabled = showSelectColumn ?? !isDashboard
    const actionsEnabled = showActionsColumn ?? !isDashboard

    const accountsById = React.useMemo(() => {
        const map = new Map<string, Account>()
        for (const acc of accounts) map.set(acc.id, acc)
        return map
    }, [accounts])

    // Real tags from the user's Tag table — used by both the tag-filter
    // dropdown and to translate raw slugs to display names + colors.
    const availableTags = useAvailableTags()

    const columns: ColumnDef<Transaction>[] = React.useMemo(() => {
        const baseColumns: ColumnDef<Transaction>[] = [
        {
            accessorKey: "date",
            header: tt.date,
            cell: ({ row }) => {
                const date = new Date(row.original.date)
                const isValid = !isNaN(date.getTime())
                if (!isValid) return <span className="text-[13px] text-neutral-400">{row.original.date}</span>
                return (
                    <div className="flex flex-col leading-tight">
                        <span className="text-[13px] font-medium tabular-nums">
                            {date.toLocaleDateString(t.config?.locale || "en-US", { month: "short", day: "numeric" })}
                        </span>
                        <span className="text-[11px] text-neutral-400 tabular-nums">
                            {date.toLocaleDateString(t.config?.locale || "en-US", { year: "numeric" })}
                        </span>
                    </div>
                )
            },
            size: 110,
            minSize: 80,
            maxSize: 200,
        },
        {
            accessorKey: "description",
            header: tt.description,
            cell: ({ row }) => (
                <span className="auto-scroll block max-w-[260px] text-[13px] font-medium">{row.original.description}</span>
            ),
            enableHiding: false,
            size: 220,
            minSize: 100,
            maxSize: 400,
        },
        {
            accessorKey: "tags",
            header: tt.category || "Tags",
            cell: ({ row }) => (
                <TagCell
                    transactionId={row.original.id}
                    tags={row.original.tags}
                />
            ),
            size: 160,
            minSize: 100,
            maxSize: 240,
        },
        {
            accessorKey: "type",
            header: tt.type,
            cell: ({ row }) => {
                const isIncome = row.original.type === "in"
                return (
                    <span
                        className={cn(
                            "inline-flex items-center gap-1.5 h-5 px-2 rounded-full text-[11px] font-medium",
                            isIncome
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-red-500/10 text-red-600 dark:text-red-400",
                        )}
                    >
                        {isIncome
                            ? <ArrowUpRight className="size-3" />
                            : <ArrowDownRight className="size-3" />}
                        {isIncome ? (tt.income || "Income") : (tt.expense || "Expense")}
                    </span>
                )
            },
            size: 110,
            minSize: 80,
            maxSize: 150,
        },
        {
            accessorKey: "amount",
            header: () => <div className="text-right">{tt.amount}</div>,
            cell: ({ row }) => {
                const amount = row.original.amount
                const type = row.original.type
                const formatted = formatCurrency(amount)

                return (
                    <div className={cn(
                        "text-right text-[13px] font-semibold tabular-nums",
                        type === "in" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
                    )}>
                        {type === "in" ? "+" : "−"}{formatted}
                    </div>
                )
            },
            size: 130,
            minSize: 100,
            maxSize: 200,
        },
        {
            accessorKey: "accountId",
            header: tt.account || "Account",
            cell: ({ row }) => {
                const account = accountsById.get(row.original.accountId)
                return (
                    <div className="flex items-center gap-2 min-w-0">
                        <span
                            className="size-2 rounded-full shrink-0"
                            style={{ backgroundColor: account?.color || "var(--muted-foreground)" }}
                        />
                        <span className="truncate text-[13px]">
                            {account?.name || row.original.accountId}
                        </span>
                    </div>
                )
            },
            size: 140,
            minSize: 100,
            maxSize: 220,
        },
        ]

        if (actionsEnabled) {
            baseColumns.push({
            id: "actions",
            header: () => <span className="text-[11px] uppercase tracking-wider text-neutral-400">{fActions.actions || "Actions"}</span>,
            cell: ({ row }) => (
                <TableActionsCell>
                    <TableActionButton
                        intent="edit"
                        label={fActions.edit || "Edit"}
                        onClick={() => {
                            if (onEditTransaction) onEditTransaction(row.original)
                            else toast.info(`${fActions.edit || "Edit"}: ${row.original.description}`)
                        }}
                    />
                    <TableActionButton
                        intent="delete"
                        label={fActions.delete || "Delete"}
                        onClick={() => {
                            if (onDeleteTransaction) onDeleteTransaction(row.original)
                            else toast.info(`${fActions.delete || "Delete"}: ${row.original.description}`)
                        }}
                    />
                </TableActionsCell>
            ),
            size: 96,
            minSize: 80,
            maxSize: 120,
            enableResizing: false,
            })
        }

        if (selectEnabled) {
            baseColumns.unshift({
                id: "select",
                header: ({ table }) => (
                    <div className="flex items-center justify-center">
                        <Checkbox
                            checked={
                                table.getIsAllPageRowsSelected() ||
                                (table.getIsSomePageRowsSelected() && "indeterminate")
                            }
                            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                            aria-label={fTable.select_all || "Select all"}
                        />
                    </div>
                ),
                cell: ({ row }) => (
                    <div className="flex items-center justify-center">
                        <Checkbox
                            checked={row.getIsSelected()}
                            onCheckedChange={(value) => row.toggleSelected(!!value)}
                            aria-label={fTable.select_row || "Select row"}
                        />
                    </div>
                ),
                enableSorting: false,
                enableHiding: false,
                size: 50,
                minSize: 50,
                maxSize: 50,
            })
        }

        return baseColumns
    }, [t, fTable.select_all, fTable.select_row, fActions.actions, fActions.edit, fActions.delete, tt, formatCurrency, accountsById, selectEnabled, actionsEnabled, onEditTransaction, onDeleteTransaction])
    const [data, setData] = React.useState<Transaction[]>(() => initialData)
    const [rowSelection, setRowSelection] = React.useState({})
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(() => {
        if (!isDashboard) return {} as VisibilityState
        return { tags: false, type: false }
    })
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize })

    React.useEffect(() => {
        setPagination((current) => current.pageSize === pageSize ? current : { pageIndex: 0, pageSize })
    }, [pageSize])
    React.useEffect(() => {
        if (!isDashboard) return
        setColumnVisibility((current) => ({
            ...current,
            tags: false,
            type: false,
        }))
    }, [isDashboard])
    const [globalFilter, setGlobalFilter] = React.useState("")
    const isMobile = useIsMobileView()

    // Sync data when initialData changes (e.g., after async fetch)
    React.useEffect(() => {
        setData(initialData)
    }, [initialData])

    // TanStack Table returns method-heavy state that React Compiler intentionally skips.
    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
            columnVisibility,
            rowSelection,
            columnFilters,
            pagination,
            globalFilter,
        },
        getRowId: (row) => row.id,
        enableRowSelection: selectEnabled,
        onRowSelectionChange: setRowSelection,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        onPaginationChange: setPagination,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
    })

    void setData

    // Show loading state while translations are loading
    if (isLangLoading) {
        return <div className="flex items-center justify-center p-8">Loading...</div>
    }

    // Loading skeleton
    if (isLoading) {
        return (
            <div className="flex flex-col gap-4 w-full">
                {showToolbar && (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-9 w-[200px] lg:w-[300px]" />
                            <Skeleton className="h-8 w-[130px]" />
                            <Skeleton className="h-8 w-[150px]" />
                        </div>
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-8 w-24" />
                            <Skeleton className="h-8 w-32" />
                        </div>
                    </div>
                )}

                {/* Table skeleton */}
                <TableShell>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-8"><Skeleton className="h-4 w-4" /></TableHead>
                                <TableHead className="w-8"><Skeleton className="h-4 w-4" /></TableHead>
                                {[80, 150, 80, 60, 80, 80, 60, 40].map((w, i) => (
                                    <TableHead key={i}><Skeleton className="h-4" style={{ width: w }} /></TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[...Array(10)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
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
        <Tabs defaultValue="all" className={cn("flex flex-col justify-start w-full min-h-0 flex-1", isDashboard ? "h-full gap-4" : "gap-4")}>
            {showToolbar && (
            <TableToolbar className={cn(isDashboard && "border-b border-black/6 dark:border-white/8 pb-2") }>
                <TableToolbarGroup className="flex-wrap">
                    <TableSearchControl
                        table={table}
                        placeholder={tt.search_transactions}
                        width={isDashboard ? 200 : 260}
                    />
                    {!isDashboard && (
                        <>
                            <TableFilterSelect
                                table={table}
                                columnId="type"
                                label={tt.type || "Type"}
                                allLabel={fFilter.all_types || "All Types"}
                                options={[
                                    { value: "in", label: tt.income || "Income" },
                                    { value: "out", label: tt.expense || "Expense" },
                                ]}
                            />
                            <TableFilterSelect
                                table={table}
                                columnId="tags"
                                label={tt.category || "Tags"}
                                allLabel={fFilter.all_categories || "All"}
                                options={availableTags.map((tag) => ({ value: tag.slug, label: tag.name }))}
                            />
                            {accounts.length > 0 && (
                                <TableFilterSelect
                                    table={table}
                                    columnId="accountId"
                                    label={tt.account || "Account"}
                                    allLabel={(t as { account_filter?: { all_accounts?: string } }).account_filter?.all_accounts || "All Accounts"}
                                    options={accounts.map((acc) => ({ value: acc.id, label: acc.name }))}
                                />
                            )}
                        </>
                    )}
                </TableToolbarGroup>

                <TableToolbarGroup>
                    {!isDashboard && (
                        <TableSortControl
                            table={table}
                            options={[
                                { id: "date", label: tt.date || "Date" },
                                { id: "amount", label: tt.amount || "Amount" },
                                { id: "description", label: tt.description || "Description" },
                            ]}
                        />
                    )}
                    <TableColumnsControl table={table} label={fTable.columns || "Columns"} />
                    <TableAddButton onClick={onAddTransaction} label={tt.add_transaction || "Add"} />
                </TableToolbarGroup>
            </TableToolbar>
            )}

            <TabsContent value="all" className={cn("relative flex flex-col min-h-0 flex-1", isDashboard ? "gap-4" : "gap-4")}>
                {isMobile ? (
                    <>
                    <MobileCardList>
                        {table.getRowModel().rows?.length ? (
                            (isDashboard
                                ? table.getRowModel().rows.slice(0, 3)
                                : table.getRowModel().rows
                            ).map((row, index) => {
                                const tx = row.original
                                return (
                                    <MobileCard
                                        key={row.id}
                                        item={tx}
                                        id={tx.id}
                                        index={index}
                                        fieldLayout={isDashboard ? "grid" : "carousel"}
                                        isSelected={row.getIsSelected()}
                                        onSelect={(checked) => row.toggleSelected(checked)}
                                        icon={
                                            tx.type === "in"
                                                ? <ArrowDownRight className="size-5 text-positive" />
                                                : <ArrowUpRight className="size-5 text-negative" />
                                        }
                                        title={tx.description}
                                        subtitle={new Date(tx.date).toLocaleDateString(t.config?.locale || "en-US")}
                                        badge={{
                                            label: tx.type === "in" ? (tt.income || "Income") : (tt.expense || "Expense"),
                                            variant: tx.type === "in" ? "default" : "destructive",
                                        }}
                                        fields={[
                                            {
                                                label: tt.amount || "Amount",
                                                value: (
                                                    <span className={tx.type === "in" ? "text-positive" : "text-negative"}>
                                                        {tx.type === "in" ? "+" : "-"}{formatCurrency(tx.amount)}
                                                    </span>
                                                ),
                                            },
                                            {
                                                label: tt.tags || "Tags",
                                                value: tx.tags.length > 0 ? tx.tags.join(", ") : "—",
                                            },
                                        ]}
                                    />
                                )
                            })
                        ) : (
                            <EmptyStateInline variant={globalFilter || columnFilters.length > 0 ? "filtered" : "no-transactions"} />
                        )}
                    </MobileCardList>
                    </>
                ) : (
                <TableShell className={cn(isDashboard ? "h-full rounded-none border-0 bg-transparent shadow-none backdrop-blur-0 dark:bg-transparent dark:shadow-none" : "flex-1")}>
                    <TableScrollArea>
                    <Table className="w-full">
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                                    {headerGroup.headers.map((header) => (
                                        <TableHead
                                            key={header.id}
                                            colSpan={header.colSpan}
                                        >
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
                            {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                        onClick={(e) => {
                                            const target = e.target as HTMLElement
                                            if (target.closest("button, a, input, select, textarea, [role=checkbox], [data-no-row-click]")) return
                                            row.toggleSelected()
                                        }}
                                        className="group/row animate-fade-in"
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id} className={cn(isDashboard && "py-2")}>
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="h-48">
                                        <EmptyStateInline
                                            variant={globalFilter || columnFilters.length > 0 ? "filtered" : "no-transactions"}
                                        />
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                    </TableScrollArea>
                </TableShell>
                )}
            </TabsContent>
        </Tabs>
    )
}
