"use client"

// Unified data-table primitive.
//
// Linear / Notion-style: dense rows, hairline dividers, sticky header, action
// buttons revealed on row hover, tabular-nums for amounts, glass toolbar.
// Wraps @tanstack/react-table so consumers can still hook into its sorting,
// filtering, and column-visibility APIs if they need to — but the default
// rendering is fully driven by the simpler `DataTableColumn<T>` shape below.
//
// Each domain table (transactions, accounts, bills, budgets) builds its
// columns + filter chips + row actions, passes them in, and inherits the
// shared visual language. No more reinventing the toolbar per table.

import * as React from "react"
import {
    ColumnDef,
    Row,
    Table as ReactTable,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    type SortingState,
    type ColumnFiltersState,
} from "@tanstack/react-table"
import {
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    ChevronsUpDown,
    Search,
    X,
} from "lucide-react"

import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface DataTableColumn<T> {
    /** Stable id used for sort/filter state and column visibility. */
    id: string
    /** Header label or component. Omitted = no label (e.g. row-actions column). */
    header?: React.ReactNode
    /** Cell renderer. */
    cell: (row: T) => React.ReactNode
    /** Pixel width or "auto"; default auto. */
    width?: number
    /** Cell text alignment. */
    align?: "left" | "center" | "right"
    /** Allow click-to-sort on this column's header. */
    sortable?: boolean
    /** Use tabular-nums (e.g. for currency / counts). */
    numeric?: boolean
    /** Hide column on small screens. */
    hideOnMobile?: boolean
    /** Pass-through for tanstack's filter machinery. */
    accessor?: (row: T) => unknown
}

export interface DataTableFilterChip {
    /** Display label, e.g. "Type: Income". */
    label: string
    /** Removes this filter. */
    onClear: () => void
}

export interface DataTableProps<T> {
    data: T[]
    columns: DataTableColumn<T>[]
    rowKey: (row: T) => string

    /** Optional row-click handler — entire row becomes clickable. */
    onRowClick?: (row: T) => void
    /** Action buttons revealed on row hover (right-aligned). */
    rowActions?: (row: T) => React.ReactNode

    /** Loading shows a skeleton. */
    isLoading?: boolean
    /** Custom empty state when data is [] (after loading). */
    emptyState?: React.ReactNode

    /** Searchable text per row (concat description + counterparty + tags etc.). */
    searchAccessor?: (row: T) => string
    /** Initial search value (controlled). */
    search?: string
    onSearchChange?: (value: string) => void
    searchPlaceholder?: string

    /** Filter chips shown above the table. Domain-specific; consumer manages state. */
    filterChips?: DataTableFilterChip[]

    /** Slot for the right-side toolbar (e.g. "Add" / "Export" buttons). */
    toolbarActions?: React.ReactNode

    /** Vertical density. */
    density?: "compact" | "normal"
    /** Page size; 0 disables pagination. */
    pageSize?: number

    /** Mobile fallback — render this card per row when viewport is narrow. */
    mobileCard?: (row: T) => React.ReactNode

    /** Container variant: 'bordered' = card, 'flush' = no outer border. */
    variant?: "bordered" | "flush"
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function alignClass(align?: "left" | "center" | "right"): string {
    if (align === "right") return "text-right justify-end"
    if (align === "center") return "text-center justify-center"
    return "text-left justify-start"
}

// Mobile breakpoint detection. Mirrors the project's existing useIsMobile but
// scoped to this module so the primitive doesn't need a hook import.
function useIsMobile(breakpoint = 640): boolean {
    const [mobile, setMobile] = React.useState(false)
    React.useEffect(() => {
        if (typeof window === "undefined") return
        const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
        const update = () => setMobile(mql.matches)
        update()
        mql.addEventListener("change", update)
        return () => mql.removeEventListener("change", update)
    }, [breakpoint])
    return mobile
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DataTable<T>({
    data,
    columns,
    rowKey,
    onRowClick,
    rowActions,
    isLoading,
    emptyState,
    searchAccessor,
    search,
    onSearchChange,
    searchPlaceholder = "Search…",
    filterChips,
    toolbarActions,
    density = "normal",
    pageSize = 25,
    mobileCard,
    variant = "bordered",
}: DataTableProps<T>) {
    const isMobile = useIsMobile()

    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [globalFilter, setGlobalFilter] = React.useState(search ?? "")

    React.useEffect(() => {
        if (search !== undefined) setGlobalFilter(search)
    }, [search])

    const handleSearchChange = (v: string) => {
        setGlobalFilter(v)
        onSearchChange?.(v)
    }

    // Map our friendly DataTableColumn to tanstack's ColumnDef.
    const tanstackColumns = React.useMemo<ColumnDef<T>[]>(
        () =>
            columns.map((c) => ({
                id: c.id,
                accessorFn: c.accessor ?? (() => undefined),
                header: c.header
                    ? () => (
                          <span
                              className={cn(
                                  "block text-[11px] font-semibold uppercase tracking-[0.05em] text-neutral-500 dark:text-neutral-400",
                                  alignClass(c.align),
                              )}
                          >
                              {c.header}
                          </span>
                      )
                    : "",
                cell: ({ row }) => c.cell(row.original),
                enableSorting: !!c.sortable,
            })),
        [columns],
    )

    const table = useReactTable<T>({
        data,
        columns: tanstackColumns,
        state: { sorting, columnFilters, globalFilter },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onGlobalFilterChange: setGlobalFilter,
        globalFilterFn: (row, _id, value) => {
            if (!value) return true
            if (!searchAccessor) return true
            const haystack = searchAccessor(row.original).toLowerCase()
            return haystack.includes(String(value).toLowerCase())
        },
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: pageSize > 0 ? getPaginationRowModel() : undefined,
        initialState: { pagination: { pageSize: pageSize > 0 ? pageSize : data.length || 1 } },
    })

    const rows = table.getRowModel().rows
    const hasSearch = !!searchAccessor
    const hasFilters = (filterChips?.length ?? 0) > 0
    const hasToolbar = hasSearch || hasFilters || !!toolbarActions
    const totalRows = data.length
    const filteredRows = table.getFilteredRowModel().rows.length

    // Tonal hierarchy: row bg flat, header bg subtly lifted, hover bg distinct
    // enough to be readable from a glance.
    const rowHeight = density === "compact" ? "h-10" : "h-11"
    const cellPad = "px-4"
    const headerHeight = "h-10"

    // ---- Mobile fallback: render cards instead of a table ----------------
    if (isMobile && mobileCard) {
        return (
            <div className={cn("flex flex-col gap-2", variant === "bordered" && "p-2")}>
                {hasToolbar && (
                    <Toolbar
                        searchAccessor={hasSearch}
                        search={globalFilter}
                        onSearchChange={handleSearchChange}
                        searchPlaceholder={searchPlaceholder}
                        filterChips={filterChips}
                        toolbarActions={toolbarActions}
                    />
                )}
                {isLoading ? (
                    <SkeletonRows count={6} variant="card" />
                ) : rows.length === 0 ? (
                    <EmptyContainer>{emptyState ?? <DefaultEmpty />}</EmptyContainer>
                ) : (
                    <div className="flex flex-col gap-1.5">
                        {rows.map((r) => (
                            <div
                                key={rowKey(r.original)}
                                onClick={onRowClick ? () => onRowClick(r.original) : undefined}
                                className={cn(
                                    "rounded-lg border border-black/8 dark:border-white/8 bg-white/40 dark:bg-white/[0.02]",
                                    onRowClick && "cursor-pointer hover:bg-black/4 dark:hover:bg-white/6 transition-colors",
                                )}
                            >
                                {mobileCard(r.original)}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )
    }

    // ---- Desktop table ---------------------------------------------------
    return (
        <div
            className={cn(
                "flex flex-col min-h-0",
                variant === "bordered" && [
                    "rounded-2xl overflow-hidden",
                    "border border-black/8 dark:border-white/10",
                    "bg-white/70 dark:bg-white/3",
                    "backdrop-blur-md",
                    "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.04)]",
                    "dark:shadow-[0_1px_2px_rgba(0,0,0,0.2),0_8px_24px_rgba(0,0,0,0.15)]",
                ],
            )}
        >
            {hasToolbar && (
                <Toolbar
                    searchAccessor={hasSearch}
                    search={globalFilter}
                    onSearchChange={handleSearchChange}
                    searchPlaceholder={searchPlaceholder}
                    filterChips={filterChips}
                    toolbarActions={toolbarActions}
                    bordered
                />
            )}

            <div className="relative flex-1 min-h-0 overflow-auto">
                <table className="w-full border-separate border-spacing-0">
                    <thead className="sticky top-0 z-10 bg-neutral-100/80 dark:bg-white/4 backdrop-blur-md">
                        {table.getHeaderGroups().map((hg) => (
                            <tr key={hg.id}>
                                {hg.headers.map((h, idx) => {
                                    const def = columns[idx]
                                    const sortDir = h.column.getIsSorted()
                                    const SortIcon =
                                        sortDir === "asc"
                                            ? ChevronUp
                                            : sortDir === "desc"
                                              ? ChevronDown
                                              : ChevronsUpDown
                                    return (
                                        <th
                                            key={h.id}
                                            className={cn(
                                                headerHeight,
                                                cellPad,
                                                "border-b border-black/8 dark:border-white/8",
                                                def?.hideOnMobile && "hidden sm:table-cell",
                                            )}
                                            style={def?.width ? { width: def.width } : undefined}
                                        >
                                            {h.isPlaceholder ? null : (
                                                <button
                                                    type="button"
                                                    onClick={
                                                        def?.sortable
                                                            ? h.column.getToggleSortingHandler()
                                                            : undefined
                                                    }
                                                    className={cn(
                                                        "flex items-center gap-1.5 w-full",
                                                        alignClass(def?.align),
                                                        def?.sortable && "cursor-pointer hover:[&>span]:text-black dark:hover:[&>span]:text-white transition-colors",
                                                    )}
                                                >
                                                    {flexRender(h.column.columnDef.header, h.getContext())}
                                                    {def?.sortable && (
                                                        <SortIcon className="size-3 shrink-0 text-neutral-400/70" />
                                                    )}
                                                </button>
                                            )}
                                        </th>
                                    )
                                })}
                                {rowActions && (
                                    <th
                                        className={cn(
                                            headerHeight,
                                            "border-b border-black/8 dark:border-white/8",
                                        )}
                                        style={{ width: 1 }}
                                    />
                                )}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <SkeletonRows count={6} cols={columns.length + (rowActions ? 1 : 0)} />
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + (rowActions ? 1 : 0)} className="p-0">
                                    <EmptyContainer>{emptyState ?? <DefaultEmpty />}</EmptyContainer>
                                </td>
                            </tr>
                        ) : (
                            rows.map((r) => (
                                <DataTableBodyRow
                                    key={rowKey(r.original)}
                                    row={r}
                                    columns={columns}
                                    rowHeight={rowHeight}
                                    cellPad={cellPad}
                                    onRowClick={onRowClick}
                                    rowActions={rowActions}
                                />
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {pageSize > 0 && filteredRows > pageSize && (
                <Pagination table={table} totalRows={totalRows} filteredRows={filteredRows} />
            )}
        </div>
    )
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function DataTableBodyRow<T>({
    row,
    columns,
    rowHeight,
    cellPad,
    onRowClick,
    rowActions,
}: {
    row: Row<T>
    columns: DataTableColumn<T>[]
    rowHeight: string
    cellPad: string
    onRowClick?: (row: T) => void
    rowActions?: (row: T) => React.ReactNode
}) {
    return (
        <tr
            onClick={onRowClick ? () => onRowClick(row.original) : undefined}
            className={cn(
                "group transition-colors",
                "border-b border-black/5 dark:border-white/6 last:border-b-0",
                "hover:bg-black/[0.025] dark:hover:bg-white/4",
                onRowClick && "cursor-pointer",
            )}
        >
            {row.getVisibleCells().map((cell, idx) => {
                const def = columns[idx]
                return (
                    <td
                        key={cell.id}
                        className={cn(
                            rowHeight,
                            cellPad,
                            "text-[13.5px] leading-tight text-neutral-800 dark:text-neutral-200",
                            def?.numeric && "tabular-nums",
                            def?.hideOnMobile && "hidden sm:table-cell",
                        )}
                        style={def?.width ? { width: def.width } : undefined}
                    >
                        <div className={cn("flex items-center", alignClass(def?.align))}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
                    </td>
                )
            })}
            {rowActions && (
                <td
                    className="pr-3 pl-1 align-middle"
                    style={{ width: 1 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Always visible. Sits in a soft pill so the cluster
                        reads as a deliberate group rather than loose icons. */}
                    <div
                        className={cn(
                            "flex items-center justify-end gap-0.5 p-0.5 rounded-lg",
                            "bg-black/3 dark:bg-white/4",
                            "border border-black/4 dark:border-white/4",
                            "transition-colors",
                            "group-hover:bg-black/5 dark:group-hover:bg-white/6",
                            "group-hover:border-black/7 dark:group-hover:border-white/7",
                        )}
                    >
                        {rowActions(row.original)}
                    </div>
                </td>
            )}
        </tr>
    )
}

function Toolbar({
    searchAccessor,
    search,
    onSearchChange,
    searchPlaceholder,
    filterChips,
    toolbarActions,
    bordered,
}: {
    searchAccessor: boolean
    search: string
    onSearchChange: (v: string) => void
    searchPlaceholder: string
    filterChips?: DataTableFilterChip[]
    toolbarActions?: React.ReactNode
    bordered?: boolean
}) {
    return (
        <div
            className={cn(
                "flex items-center gap-3 px-4 py-2.5",
                // Toolbar inherits the table container's translucency — no
                // separate bg, just a hairline divider when bordered.
                bordered && "border-b border-black/8 dark:border-white/8",
            )}
        >
            {searchAccessor && (
                <div className="relative flex items-center min-w-0 flex-1 max-w-[320px]">
                    <Search className="absolute left-2.5 size-3.5 text-neutral-400 pointer-events-none" />
                    <input
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder={searchPlaceholder}
                        className={cn(
                            "w-full h-8 pl-8 pr-8 text-[12.5px] rounded-lg",
                            "bg-black/4 dark:bg-white/5",
                            "placeholder:text-neutral-400/80 outline-none",
                            "border border-black/6 dark:border-white/8",
                            "hover:bg-black/6 dark:hover:bg-white/7",
                            "focus:bg-white dark:focus:bg-white/8",
                            "focus:border-black/15 dark:focus:border-white/15",
                            "focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] dark:focus:shadow-[0_0_0_3px_rgba(255,255,255,0.04)]",
                            "transition-all",
                        )}
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => onSearchChange("")}
                            className="absolute right-2 p-0.5 rounded text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                            aria-label="Clear search"
                        >
                            <X className="size-3" />
                        </button>
                    )}
                </div>
            )}

            {filterChips && filterChips.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    {filterChips.map((chip, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={chip.onClear}
                            className={cn(
                                "inline-flex items-center gap-1.5 h-7 pl-2.5 pr-2 rounded-lg",
                                "text-[11.5px] font-medium",
                                "bg-black/[0.04] dark:bg-white/[0.06] text-black/80 dark:text-white/85",
                                "border border-black/8 dark:border-white/8",
                                "hover:bg-black/[0.07] dark:hover:bg-white/[0.10]",
                                "hover:border-black/12 dark:hover:border-white/12",
                                "transition-colors",
                            )}
                        >
                            {chip.label}
                            <X className="size-3 opacity-60" />
                        </button>
                    ))}
                </div>
            )}

            {toolbarActions && (
                <div className="ml-auto flex items-center gap-2">{toolbarActions}</div>
            )}
        </div>
    )
}

function Pagination<T>({
    table,
    totalRows,
    filteredRows,
}: {
    table: ReactTable<T>
    totalRows: number
    filteredRows: number
}) {
    const pageIndex = table.getState().pagination.pageIndex
    const pageCount = table.getPageCount()
    const showing = Math.min(filteredRows, (pageIndex + 1) * table.getState().pagination.pageSize)

    return (
        <div className="flex items-center justify-between gap-3 px-4 py-2 border-t border-black/8 dark:border-white/8">
            <span className="text-[11.5px] text-neutral-400 tabular-nums">
                {filteredRows === totalRows
                    ? `${showing} of ${totalRows}`
                    : `${showing} of ${filteredRows} (${totalRows} total)`}
            </span>
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    className="size-7 inline-flex items-center justify-center rounded-md text-neutral-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/6 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    aria-label="Previous page"
                >
                    <ChevronLeft className="size-3.5" />
                </button>
                <span className="text-[11.5px] text-neutral-500 dark:text-neutral-400 tabular-nums px-2 min-w-14 text-center">
                    {pageIndex + 1} / {pageCount || 1}
                </span>
                <button
                    type="button"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    className="size-7 inline-flex items-center justify-center rounded-md text-neutral-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/6 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    aria-label="Next page"
                >
                    <ChevronRight className="size-3.5" />
                </button>
            </div>
        </div>
    )
}

function SkeletonRows({
    count,
    cols,
    variant,
}: {
    count: number
    cols?: number
    variant?: "card"
}) {
    if (variant === "card") {
        return (
            <div className="flex flex-col gap-1.5">
                {Array.from({ length: count }).map((_, i) => (
                    <div
                        key={i}
                        className="h-16 rounded-lg bg-black/4 dark:bg-white/4 animate-pulse"
                    />
                ))}
            </div>
        )
    }
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <tr key={i} className="border-b border-black/5 dark:border-white/6">
                    {Array.from({ length: cols ?? 5 }).map((_, j) => (
                        <td key={j} className="px-4 h-11">
                            <div
                                className="h-3 rounded-md bg-black/5 dark:bg-white/6 animate-pulse"
                                style={{ width: `${50 + ((i * 7 + j * 13) % 40)}%` }}
                            />
                        </td>
                    ))}
                </tr>
            ))}
        </>
    )
}

function EmptyContainer({ children }: { children: React.ReactNode }) {
    return <div className="flex items-center justify-center py-20">{children}</div>
}

function DefaultEmpty() {
    return (
        <div className="text-center space-y-1">
            <p className="text-[13px] font-medium text-neutral-500 dark:text-neutral-400">
                No results
            </p>
            <p className="text-[12px] text-neutral-400 dark:text-neutral-500">
                Try clearing filters or adding new entries.
            </p>
        </div>
    )
}
