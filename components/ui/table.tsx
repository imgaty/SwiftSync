"use client"

import * as React from "react"
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Columns as ColumnsIcon,
    Filter,
    Pencil,
    Plus,
    Search,
    Trash2,
    X,
} from "lucide-react"
import type { Column, Table as TanstackTable } from "@tanstack/react-table"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Dropdown,
    DropdownCheckboxItem,
    DropdownContent,
    DropdownItem,
    DropdownLabel,
    DropdownSeparator,
    DropdownTrigger,
} from "@/components/ui/dropdown"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { SmartTooltip } from "@/components/ui/tooltip"

/**
 * TableShell — shared table surface for every data table.
 */
function TableShell({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="table-shell"
            className={cn(
                "relative w-full flex min-h-0 flex-col overflow-hidden rounded-lg",
                "border border-black/[0.08] dark:border-white/[0.10]",
                "bg-white/72 dark:bg-neutral-950/28",
                "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_10px_30px_rgba(0,0,0,0.04)]",
                "dark:shadow-[0_1px_2px_rgba(0,0,0,0.25),0_12px_32px_rgba(0,0,0,0.18)]",
                "backdrop-blur-md",
                className,
            )}
            {...props}
        />
    )
}

/**
 * TableScrollArea — vertical+horizontal scrolling container with a sticky
 * header. Use this in place of a static wrapper so that long tables stay
 * within `maxHeight` (default `28rem`) and scroll instead of paginating.
 */
function TableScrollArea({
    className,
    style,
    maxHeight,
    ...props
}: React.ComponentProps<"div"> & { maxHeight?: string | number }) {
    return (
        <div
            data-slot="table-scroll-area"
            className={cn(
                // Flex-fills the TableShell's remaining space (after the toolbar)
                // and scrolls internally. `min-h-0` is required so flex layout
                // doesn't stretch us beyond the parent height.
                "relative w-full flex-1 min-h-0 overflow-auto",
                "bg-gradient-to-b from-transparent via-transparent to-black/[0.015]",
                "dark:to-white/[0.018]",
                "[scrollbar-width:thin] [scrollbar-color:rgba(120,120,120,0.35)_transparent]",
                className,
            )}
            style={maxHeight !== undefined ? { maxHeight, ...style } : style}
            {...props}
        />
    )
}

function Table({ className, ...props }: React.ComponentProps<"table">) {
    return (
        <table
            data-slot="table"
            className={cn(
                "w-full min-w-max caption-bottom border-separate border-spacing-0 text-[13px]",
                className,
            )}
            {...props}
        />
    )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
    return (
        <thead
            data-slot="table-header"
            className={cn(
                "sticky top-0 z-10",
                "bg-neutral-50/90 dark:bg-neutral-950/82 backdrop-blur-md",
                "supports-[backdrop-filter]:bg-neutral-50/74 supports-[backdrop-filter]:dark:bg-neutral-950/66",
                "after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px",
                "after:bg-gradient-to-r after:from-transparent after:via-black/[0.12] after:to-transparent dark:after:via-white/[0.12]",
                "[&_tr]:hover:bg-transparent",
                className,
            )}
            {...props}
        />
    )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
    return (
        <tbody
            data-slot="table-body"
            className={cn(
                "[&>tr:last-child>td]:border-b-0",
                className,
            )}
            {...props}
        />
    )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
    return (
        <tfoot
            data-slot="table-footer"
            className={cn(
                "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
                className,
            )}
            {...props}
        />
    )
}

function TableRow({ className, onClick, ...props }: React.ComponentProps<"tr">) {
    return (
        <tr
            data-slot="table-row"
            onClick={onClick}
            className={cn(
                "group/row",
                "transition-colors duration-150",
                "hover:bg-black/[0.032] dark:hover:bg-white/[0.052]",
                "data-[state=selected]:bg-primary/[0.055] dark:data-[state=selected]:bg-primary/[0.11]",
                onClick && "cursor-pointer",
                className,
            )}
            {...props}
        />
    )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
    return (
        <th
            data-slot="table-head"
            className={cn(
                "h-10 px-4 text-left align-middle whitespace-nowrap",
                "text-[11px] font-semibold uppercase tracking-[0.05em]",
                "text-neutral-500 dark:text-neutral-400",
                "[&:has([role=checkbox])]:px-4 *:[[role=checkbox]]:translate-y-0.5",
                "select-none",
                className,
            )}
            {...props}
        />
    )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
    return (
        <td
            data-slot="table-cell"
            className={cn(
                "h-11 px-4 py-2 align-middle whitespace-nowrap text-[13px] leading-tight",
                "text-neutral-800 dark:text-neutral-200",
                "border-b border-black/[0.05] dark:border-white/[0.065]",
                "[&:has([role=checkbox])]:px-4 *:[[role=checkbox]]:translate-y-0.5",
                className,
            )}
            {...props}
        />
    )
}

function TableCaption({
    className,
    ...props
}: React.ComponentProps<"caption">) {
    return (
        <caption
            data-slot="table-caption"
            className={cn("text-neutral-400 mt-4 text-sm", className)}
            {...props}
        />
    )
}

/**
 * TableToolbar — consistent toolbar layout used by every table.
 * Place left-side filters as the first child and right-side actions
 * (columns dropdown / add button) as the second child.
 */
function TableToolbar({
    className,
    children,
    ...props
}: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="table-toolbar"
            className={cn(
                "flex flex-wrap items-center justify-between gap-2 max-sm:flex-col max-sm:items-stretch",
                "relative px-3 py-2.5",
                "after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px",
                "after:bg-gradient-to-r after:from-transparent after:via-black/[0.15] after:to-transparent dark:after:via-white/[0.14]",
                className,
            )}
            {...props}
        >
            {children}
        </div>
    )
}

function TableToolbarGroup({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="table-toolbar-group"
            className={cn("flex min-w-0 flex-wrap items-center gap-2 max-sm:w-full", className)}
            {...props}
        />
    )
}

function UniversalTable({
    toolbar,
    children,
    footer,
    maxHeight,
    className,
    scrollAreaClassName,
}: {
    toolbar?: React.ReactNode
    children: React.ReactNode
    footer?: React.ReactNode
    maxHeight?: string | number
    className?: string
    scrollAreaClassName?: string
}) {
    return (
        <TableShell className={className}>
            {toolbar}
            <TableScrollArea maxHeight={maxHeight} className={scrollAreaClassName}>
                {children}
            </TableScrollArea>
            {footer}
        </TableShell>
    )
}

function TableSortHeader({
    children,
    direction,
    onClick,
    align = "left",
    className,
}: {
    children: React.ReactNode
    direction?: "asc" | "desc"
    onClick?: () => void
    align?: "left" | "center" | "right"
    className?: string
}) {
    const Icon = direction === "asc" ? ArrowUp : direction === "desc" ? ArrowDown : ArrowUpDown

    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "inline-flex w-full items-center gap-1.5 rounded-md text-inherit",
                "transition-colors hover:text-neutral-900 dark:hover:text-neutral-100",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                align === "right" && "justify-end text-right",
                align === "center" && "justify-center text-center",
                align === "left" && "justify-start text-left",
                !onClick && "pointer-events-none",
                className,
            )}
        >
            <span className="truncate">{children}</span>
            <Icon
                className={cn(
                    "size-3.5 shrink-0",
                    direction ? "text-neutral-800 dark:text-neutral-200" : "text-neutral-400/75",
                )}
            />
        </button>
    )
}

function TableEmptyRow({
    colSpan,
    title = "No results",
    description = "Try adjusting your search or filters.",
    children,
    className,
}: {
    colSpan: number
    title?: React.ReactNode
    description?: React.ReactNode
    children?: React.ReactNode
    className?: string
}) {
    return (
        <TableRow className="hover:bg-transparent">
            <TableCell colSpan={colSpan} className={cn("h-48 whitespace-normal", className)}>
                {children ?? (
                    <div className="mx-auto flex max-w-sm flex-col items-center justify-center gap-1.5 text-center">
                        <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-black/[0.04] text-neutral-400 dark:bg-white/[0.06]">
                            <Search className="size-4" />
                        </div>
                        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{title}</p>
                        {description && (
                            <p className="text-xs leading-relaxed text-neutral-400">{description}</p>
                        )}
                    </div>
                )}
            </TableCell>
        </TableRow>
    )
}

function TableSkeletonRows({
    rows = 8,
    columns,
    widths,
}: {
    rows?: number
    columns: number
    widths?: Array<number | string>
}) {
    return (
        <>
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <TableRow key={rowIndex} className="hover:bg-transparent">
                    {Array.from({ length: columns }).map((_, columnIndex) => {
                        const width = widths?.[columnIndex] ?? `${52 + ((rowIndex * 7 + columnIndex * 11) % 36)}%`
                        return (
                            <TableCell key={columnIndex}>
                                <div
                                    className="h-3.5 rounded-md bg-black/[0.055] dark:bg-white/[0.07] animate-pulse"
                                    style={{ width }}
                                />
                            </TableCell>
                        )
                    })}
                </TableRow>
            ))}
        </>
    )
}

function TablePaginationBar({
    page,
    totalPages,
    pageSize,
    total,
    onFirst,
    onPrevious,
    onNext,
    onLast,
    label = "Showing",
    ofLabel = "of",
    className,
}: {
    page: number
    totalPages: number
    pageSize: number
    total: number
    onFirst: () => void
    onPrevious: () => void
    onNext: () => void
    onLast: () => void
    label?: string
    ofLabel?: string
    className?: string
}) {
    const start = total === 0 ? 0 : (page - 1) * pageSize + 1
    const end = Math.min(page * pageSize, total)
    const previousDisabled = page <= 1
    const nextDisabled = page >= totalPages

    return (
        <div
            data-slot="table-pagination"
            className={cn(
                "flex flex-wrap items-center justify-between gap-3",
                "border-t border-black/[0.06] px-3 py-2.5 dark:border-white/[0.08]",
                className,
            )}
        >
            <p className="text-xs text-neutral-400 tabular-nums">
                {label} {start}-{end} {ofLabel} {total}
            </p>
            <div className="ml-auto flex items-center gap-1">
                <Button variant="glass" size="icon" disabled={previousDisabled} onClick={onFirst} aria-label="First page">
                    <ChevronsLeft className="size-4" />
                </Button>
                <Button variant="glass" size="icon" disabled={previousDisabled} onClick={onPrevious} aria-label="Previous page">
                    <ChevronLeft className="size-4" />
                </Button>
                <span className="min-w-16 px-2 text-center text-xs text-neutral-400 tabular-nums">
                    {page} / {totalPages || 1}
                </span>
                <Button variant="glass" size="icon" disabled={nextDisabled} onClick={onNext} aria-label="Next page">
                    <ChevronRight className="size-4" />
                </Button>
                <Button variant="glass" size="icon" disabled={nextDisabled} onClick={onLast} aria-label="Last page">
                    <ChevronsRight className="size-4" />
                </Button>
            </div>
        </div>
    )
}

// =============================================================================
// SHARED TOOLBAR CONTROLS
// All controls are 32px tall (size="sm" / h-8) and use Button variant="glass"
// or the existing PRISM-styled Select / Dropdown so every table looks the same.
// =============================================================================

type SortDirection = "asc" | "desc"

export interface TableSortOption {
    id: string
    label: string
    /** Restrict which directions are offered. Defaults to both. */
    directions?: SortDirection[]
}

export interface TableFilterOption {
    value: string
    label: string
}

/**
 * TableSearchControl — search input matching toolbar control sizing. Uses the
 * table's globalFilter state (or a custom value/onChange).
 */
function TableSearchControl<T>({
    table,
    value,
    onValueChange,
    placeholder = "Search…",
    width = 220,
    className,
}: {
    table?: TanstackTable<T>
    value?: string
    onValueChange?: (value: string) => void
    placeholder?: string
    width?: number | string
    className?: string
}) {
    const fallbackValue = (table?.getState().globalFilter ?? "") as string
    const current = value ?? fallbackValue
    const update = (next: string) => {
        if (onValueChange) onValueChange(next)
        else table?.setGlobalFilter(next)
    }
    return (
        <div className={cn("relative inline-flex items-center", className)} style={{ width }}>
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <input
                type="search"
                value={current}
                placeholder={placeholder}
                onChange={(e) => update(e.target.value)}
                className={cn(
                    "h-8 w-full rounded-lg pl-8 text-[13px]",
                    "bg-black/4 dark:bg-white/5",
                    "border border-black/8 dark:border-white/8",
                    "text-foreground placeholder:text-neutral-400/70",
                    "hover:bg-black/6 dark:hover:bg-white/7",
                    "focus:outline-none focus:bg-white dark:focus:bg-white/8",
                    "focus:border-black/15 dark:focus:border-white/15",
                    "focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] dark:focus:shadow-[0_0_0_3px_rgba(255,255,255,0.04)]",
                    "transition-all duration-150",
                    current ? "pr-8" : "pr-3",
                )}
            />
            {current && (
                <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => update("")}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex size-6 items-center justify-center rounded-md text-neutral-500 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                    <X className="size-3.5" />
                </button>
            )}
        </div>
    )
}

/**
 * TableFilterSelect — single-column filter using the shared Select primitive.
 * Pass `options` to populate the dropdown. An "All" entry is added automatically.
 */
function TableFilterSelect<T>({
    table,
    columnId,
    label,
    options,
    allLabel = "All",
    width,
}: {
    table: TanstackTable<T>
    columnId: string
    label: string
    options: TableFilterOption[]
    allLabel?: string
    width?: number | string
}) {
    const column = table.getColumn(columnId)
    const value = (column?.getFilterValue() as string | undefined) ?? "all"
    return (
        <Select
            value={value}
            onValueChange={(next) => column?.setFilterValue(next === "all" ? undefined : next)}
        >
            <SelectTrigger size="sm" className="min-w-[120px]" style={width ? { width } : undefined}>
                <Filter className="size-3.5" />
                <SelectValue placeholder={label} />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">{allLabel}</SelectItem>
                {options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}

/**
 * TableSortControl — dropdown that sets the table's sorting on a single
 * column. Uses Dropdown (PRISM-styled) so it matches the rest of the app.
 */
function TableSortControl<T>({
    table,
    options,
    label = "Sort",
}: {
    table: TanstackTable<T>
    options: TableSortOption[]
    label?: string
}) {
    const sorting = table.getState().sorting?.[0]
    const activeId = sorting?.id
    const activeDir: SortDirection = sorting?.desc ? "desc" : "asc"
    const activeOption = options.find((o) => o.id === activeId)

    function setSort(id: string, dir: SortDirection) {
        table.setSorting([{ id, desc: dir === "desc" }])
    }
    function clearSort() {
        table.setSorting([])
    }

    return (
        <Dropdown>
            <DropdownTrigger asChild>
                <Button variant="glass" size="sm">
                    <ArrowUpDown />
                    <span className="hidden lg:inline">
                        {activeOption ? `${label}: ${activeOption.label}` : label}
                    </span>
                    {activeOption && (
                        activeDir === "asc"
                            ? <ArrowUp className="size-3.5 text-neutral-400" />
                            : <ArrowDown className="size-3.5 text-neutral-400" />
                    )}
                </Button>
            </DropdownTrigger>
            <DropdownContent align="end" width={220}>
                <DropdownLabel>{label}</DropdownLabel>
                <DropdownSeparator />
                {options.map((opt) => {
                    const dirs = opt.directions ?? ["asc", "desc"]
                    return dirs.map((dir) => {
                        const isActive = activeId === opt.id && activeDir === dir
                        return (
                            <DropdownItem
                                key={`${opt.id}-${dir}`}
                                onSelect={() => setSort(opt.id, dir)}
                            >
                                {dir === "asc" ? <ArrowUp /> : <ArrowDown />}
                                <span className="flex-1">{opt.label}</span>
                                <span className="text-[11px] text-neutral-400">
                                    {dir === "asc" ? "A→Z" : "Z→A"}
                                </span>
                                {isActive && <span className="ml-1 size-1.5 rounded-full bg-primary" />}
                            </DropdownItem>
                        )
                    })
                })}
                {activeId && (
                    <>
                        <DropdownSeparator />
                        <DropdownItem onSelect={clearSort}>Clear sort</DropdownItem>
                    </>
                )}
            </DropdownContent>
        </Dropdown>
    )
}

/**
 * TableColumnsControl — column visibility toggle dropdown. Lists every
 * hideable column on the TanStack table.
 */
function TableColumnsControl<T>({
    table,
    label = "Columns",
    columnLabels,
}: {
    table: TanstackTable<T>
    label?: string
    /** Optional map from column id → human label. */
    columnLabels?: Record<string, string>
}) {
    const hideable = table
        .getAllColumns()
        .filter((column: Column<T, unknown>) => typeof column.accessorFn !== "undefined" && column.getCanHide())

    return (
        <Dropdown>
            <DropdownTrigger asChild>
                <Button variant="glass" size="sm">
                    <ColumnsIcon />
                    <span className="hidden lg:inline">{label}</span>
                </Button>
            </DropdownTrigger>
            <DropdownContent align="end" width={220}>
                <DropdownLabel>{label}</DropdownLabel>
                <DropdownSeparator />
                {hideable.map((column) => (
                    <DropdownCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(checked) => column.toggleVisibility(!!checked)}
                    >
                        {columnLabels?.[column.id] ?? column.id}
                    </DropdownCheckboxItem>
                ))}
            </DropdownContent>
        </Dropdown>
    )
}

/**
 * TableAddButton — primary "add" action. Uses Button variant="solid" so it
 * stands apart from the secondary glass controls.
 */
function TableAddButton({
    onClick,
    label = "Add",
    icon,
    className,
}: {
    onClick?: () => void
    label?: string
    icon?: React.ReactNode
    className?: string
}) {
    // Glass — table toolbar buttons are uniformly glass per the design rule:
    // glass = default, solid = required actions (in dialogs), ghost = page topbar.
    return (
        <Button variant="glass" size="sm" onClick={onClick} className={className}>
            {icon ?? <Plus />}
            <span className="hidden lg:inline">{label}</span>
        </Button>
    )
}

// Legacy alias kept for compatibility with consumers still importing
// TableSearchInput. Behaves identically to TableSearchControl.
function TableSearchInput(props: React.ComponentProps<typeof TableSearchControl> & { inputRef?: React.Ref<HTMLInputElement> }) {
    const { inputRef: _inputRef, ...rest } = props
    void _inputRef
    return <TableSearchControl {...rest} />
}

/**
 * TableInlineInput — same control sizing for inline text inputs.
 */
function TableInlineInput({ className, ...props }: React.ComponentProps<"input">) {
    return (
        <input
            {...props}
            className={cn(
                "h-8 w-44 rounded-lg px-3 text-[13px]",
                "bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10",
                "backdrop-blur-xl backdrop-saturate-150",
                "text-foreground placeholder:text-neutral-400/70",
                "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30",
                "transition-all duration-150",
                className,
            )}
        />
    )
}

/**
 * TableActionsCell — right-aligned, hover-revealed row actions.
 * Use as the wrapper inside a table column's `cell` for consistent feel.
 */
function TableActionsCell({
    className,
    children,
    ...props
}: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="table-actions"
            className={cn(
                "flex items-center justify-end gap-1",
                "opacity-0 group-hover/row:opacity-100 focus-within:opacity-100",
                "[@media(hover:none)]:opacity-100",
                "transition-opacity duration-150",
                className,
            )}
            {...props}
        >
            {children}
        </div>
    )
}

/**
 * TableActionButton — standard per-row action with tooltip.
 * intent="delete" applies a red-tinted hover state.
 */
function TableActionButton({
    intent = "default",
    label,
    onClick,
    icon,
    className,
    disabled,
}: {
    intent?: "default" | "edit" | "delete"
    label: string
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
    icon?: React.ReactNode
    className?: string
    disabled?: boolean
}) {
    const isDelete = intent === "delete"
    const fallbackIcon = isDelete ? <Trash2 className="size-4" /> : <Pencil className="size-4" />
    return (
        <SmartTooltip text={label} group="table-actions">
            <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled}
                onClick={(e) => {
                    e.stopPropagation()
                    onClick?.(e)
                }}
                className={cn(
                    "size-8 text-neutral-500 dark:text-neutral-400",
                    "hover:text-black dark:hover:text-white",
                    isDelete && "hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10",
                    className,
                )}
                aria-label={label}
            >
                {icon ?? fallbackIcon}
            </Button>
        </SmartTooltip>
    )
}

/**
 * TablePagination — DEPRECATED no-op kept so existing imports don't break.
 * Tables now scroll instead of paginating; remove the component when done
 * cleaning up consumers.
 */
function TablePagination<T>(_props: { table: TanstackTable<T>; [key: string]: unknown }) {
    void _props
    return null
}

export {
    TableShell,
    TableScrollArea,
    UniversalTable,
    Table,
    TableHeader,
    TableBody,
    TableFooter,
    TableHead,
    TableRow,
    TableCell,
    TableCaption,
    TableSortHeader,
    TableEmptyRow,
    TableSkeletonRows,
    TablePaginationBar,
    TableToolbar,
    TableToolbarGroup,
    TableSearchInput,
    TableSearchControl,
    TableSortControl,
    TableFilterSelect,
    TableColumnsControl,
    TableAddButton,
    TableInlineInput,
    TableActionsCell,
    TableActionButton,
    TablePagination,
}
