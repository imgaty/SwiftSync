"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
    closestCenter,
    DndContext,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    type UniqueIdentifier,
} from "@dnd-kit/core"

import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
    arrayMove,
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities"
import type { DraggableAttributes } from "@dnd-kit/core"

import { CSS } from "@dnd-kit/utilities"
import {
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    EllipsisVertical,
    GripVertical,
    Columns,
    Plus,
    Pencil,
    Copy,
    Delete,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    Filter,
    X,
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
    Row,
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

import { Input } from "@/components/ui/input"
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
    TableResizeHandle,
} from "@/components/ui/table"

import { EmptyStateInline } from "@/components/empty-state"

import {
    Tabs,
    TabsContent,
} from "@/components/ui/tabs"

import { Skeleton } from "@/components/ui/skeleton"
import { SmartTooltip } from "@/components/ui/tooltip"

import { useLanguage } from "@/components/language-provider"

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

function DragHandle({ attributes, listeners }: { attributes?: DraggableAttributes; listeners?: SyntheticListenerMap }) {
    return (
        <Button
            {...attributes}
            {...listeners}
            variant="ghost"
            size="icon"
            className="text-neutral-500 dark:text-neutral-400 size-7 hover:bg-transparent cursor-grab active:cursor-grabbing"
        >
            <GripVertical className="text-neutral-500 dark:text-neutral-400 size-3" />
        </Button>
    )
}

const tagColors: Record<string, string> = {
    food: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800",
    transport: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    housing: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
    utilities: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    subscriptions: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800",
    entertainment: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800",
    shopping: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-800",
    health: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800",
    insurance: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    services: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800",
    salary: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800",
    freelance: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800",
    other: "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800",
}

// Memoized draggable row component for performance
const DraggableRow = React.memo(function DraggableRow({ row }: { row: Row<Transaction> }) {
    const { transform, transition, setNodeRef, isDragging, attributes, listeners } = useSortable({
        id: row.original.id,
    })

    return (
        <TableRow
            data-state={row.getIsSelected() && "selected"}
            data-dragging={isDragging}
            ref={setNodeRef}
            className="group/row relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80 data-[dragging=true]:shadow-lg animate-fade-in"
            style={{
                transform: CSS.Transform.toString(transform),
                transition: transition,
            }}
        >
            {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className="transition-colors duration-150">
                    {cell.column.id === "drag" 
                        ? <DragHandle attributes={attributes} listeners={listeners} />
                        : flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
            ))}
        </TableRow>
    )
})

export function TransactionsTable({ data: initialData, isLoading = false }: { data: Transaction[]; isLoading?: boolean }) {
    const { t, isLoading: isLangLoading } = useLanguage()
    const f = (t.finance || {}) as Record<string, unknown>
    const tt = (f.transactions_table || {}) as Record<string, string>
    const fTable = (f.table || {}) as Record<string, string>
    const fActions = (f.actions || {}) as Record<string, string>
    const fFilter = (f.filter || {}) as Record<string, string>
    const dataLabels = t.data_type_labels || {}

    const tagLabels: Record<string, string> = React.useMemo(() => ({
        food: dataLabels.food || "Food",
        transport: dataLabels.transport || "Transport",
        housing: dataLabels.housing || "Housing",
        utilities: dataLabels.utilities || "Utilities",
        subscriptions: dataLabels.subscriptions || "Subscriptions",
        entertainment: dataLabels.entertainment || "Entertainment",
        shopping: dataLabels.shopping || "Shopping",
        health: dataLabels.health || "Health",
        insurance: dataLabels.insurance || "Insurance",
        services: dataLabels.services || "Services",
        salary: dataLabels.income || "Salary",
        freelance: "Freelance",
        other: dataLabels.other || "Other",
    }), [dataLabels])

    const columns: ColumnDef<Transaction>[] = React.useMemo(() => [
        {
            id: "drag",
            header: () => null,
            cell: () => null, // DraggableRow handles this
            size: 40,
            minSize: 40,
            maxSize: 40,
            enableResizing: false,
        },
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
            enableResizing: false,
        },
        {
            accessorKey: "date",
            header: tt.date,
            cell: ({ row }) => (
                <div className="font-medium">{row.original.date}</div>
            ),
            size: 120,
            minSize: 80,
            maxSize: 200,
        },
        {
            accessorKey: "description",
            header: tt.description,
            cell: ({ row }) => (
                <span className="auto-scroll block max-w-[200px] font-medium">{row.original.description}</span>
            ),
            enableHiding: false,
            size: 200,
            minSize: 100,
            maxSize: 400,
        },
        {
            accessorKey: "tags",
            header: tt.category || "Tags",
            cell: ({ row }) => {
                const tags = row.original.tags
                const firstTag = tags[0] || "other"
                return (
                    <Badge variant="outline" className={`${tagColors[firstTag] || tagColors.other} px-2`}>
                        {tagLabels[firstTag] || firstTag}
                    </Badge>
                )
            },
            size: 130,
            minSize: 80,
            maxSize: 200,
        },
        {
            accessorKey: "type",
            header: tt.type,
            cell: ({ row }) => (
                <div className="flex items-center gap-1">
                    {row.original.type === "in" ? (
                        <>
                            <ArrowUpRight className="size-4 text-positive" />
                            <span className="text-positive">{tt.income || "Income"}</span>
                        </>
                    ) : (
                        <>
                            <ArrowDownRight className="size-4 text-negative" />
                            <span className="text-negative">{tt.expense || "Expense"}</span>
                        </>
                    )}
                </div>
            ),
            size: 100,
            minSize: 80,
            maxSize: 150,
        },
        {
            accessorKey: "amount",
            header: () => <div className="text-right">{tt.amount}</div>,
            cell: ({ row }) => {
                const amount = row.original.amount
                const type = row.original.type
                const formatted = new Intl.NumberFormat(t.config?.locale || "en-US", {
                    style: "currency",
                    currency: "EUR",
                }).format(amount)

                return (
                    <div className={`text-right font-medium ${type === "in" ? "text-positive" : "text-negative"}`}>
                        {type === "in" ? "+" : "-"}{formatted}
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
            cell: ({ row }) => (
                <Badge variant="secondary" className="font-normal">
                    {row.original.accountId}
                </Badge>
            ),
            size: 120,
            minSize: 80,
            maxSize: 200,
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
    ], [t, f, tt, tagLabels])

    const [data, setData] = React.useState<Transaction[]>(() => initialData)
    const [rowSelection, setRowSelection] = React.useState({})
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })
    const [globalFilter, setGlobalFilter] = React.useState("")

    // Sync data when initialData changes (e.g., after async fetch)
    React.useEffect(() => {
        setData(initialData)
    }, [initialData])

    const sortableId = React.useId()
    const sensors = useSensors(
        useSensor(MouseSensor, {}),
        useSensor(TouchSensor, {}),
        useSensor(KeyboardSensor, {})
    )

    const dataIds = React.useMemo<UniqueIdentifier[]>(
        () => data?.map(({ id }) => id) || [],
        [data]
    )

    const [columnSizing, setColumnSizing] = React.useState({})

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
            columnSizing,
        },
        getRowId: (row) => row.id,
        enableRowSelection: true,
        enableColumnResizing: true,
        columnResizeMode: 'onChange',
        onColumnSizingChange: setColumnSizing,
        onRowSelectionChange: setRowSelection,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        onPaginationChange: setPagination,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
    })

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event
        if (active && over && active.id !== over.id) {
            setData((data) => {
                const oldIndex = dataIds.indexOf(active.id)
                const newIndex = dataIds.indexOf(over.id)
                return arrayMove(data, oldIndex, newIndex)
            })
        }
    }

    const totals = React.useMemo(() => {
        let income = 0
        let expenses = 0
        // Single pass through data instead of two filter passes
        for (const tx of data) {
            if (tx.type === "in") {
                income += tx.amount
            } else {
                expenses += tx.amount
            }
        }
        return { income, expenses, balance: income - expenses }
    }, [data])

    // Memoize currency formatter to avoid recreation on each render
    const formatCurrency = React.useCallback(
        (value: number) => new Intl.NumberFormat(t.config?.locale || "en-US", { style: "currency", currency: "EUR" }).format(value),
        [t.config?.locale]
    )

    // Search state - must be before any conditional returns
    const [searchOpen, setSearchOpen] = React.useState(false)
    const searchInputRef = React.useRef<HTMLInputElement>(null)

    React.useEffect(() => {
        if (searchOpen && searchInputRef.current) {
            searchInputRef.current.focus()
        }
    }, [searchOpen])

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
                        <Skeleton className="h-9 w-[200px] lg:w-[300px]" />
                        <Skeleton className="h-8 w-[130px]" />
                        <Skeleton className="h-8 w-[150px]" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-24" />
                        <Skeleton className="h-8 w-32" />
                    </div>
                </div>

                {/* Summary Cards skeleton */}
                <div className="grid grid-cols-3 gap-4">
                    {[0, 1, 2].map(i => (
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
        <Tabs defaultValue="all" className="flex-col justify-start gap-4 w-full">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="relative flex items-center">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn("size-9 shrink-0", searchOpen && "hidden")}
                            onClick={() => setSearchOpen(true)}
                        >
                            <Search className="size-4 text-neutral-500 dark:text-neutral-400" />
                        </Button>
                        <div className={cn(
                            "flex items-center transition-all duration-200 overflow-hidden",
                            searchOpen ? "w-[200px] lg:w-[300px] opacity-100" : "w-0 opacity-0"
                        )}>
                            <div className="relative w-full">
                                <Search className="absolute left-2.5 top-2.5 size-4 text-neutral-500 dark:text-neutral-400" />
                                <Input
                                    label="Search transactions"
                                    ref={searchInputRef}
                                    placeholder={tt.search_transactions}
                                    value={globalFilter}
                                    onChange={(e) => setGlobalFilter(e.target.value)}
                                    onBlur={() => !globalFilter && setSearchOpen(false)}
                                    className="pl-8 pr-8 w-full"
                                />
                                {globalFilter && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-0 top-0 size-9 text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white"
                                        onClick={() => { setGlobalFilter(""); setSearchOpen(false) }}
                                    >
                                        <X className="size-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <Select
                        onValueChange={(value) => {
                            if (value === "all") {
                                table.getColumn("type")?.setFilterValue(undefined)
                            } else {
                                table.getColumn("type")?.setFilterValue(value)
                            }
                        }}
                    >
                        <SelectTrigger className="w-[130px]" size="sm">
                            <Filter className="size-4" />
                            <SelectValue placeholder={tt.type} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{fFilter.all_types || "All Types"}</SelectItem>
                            <SelectItem value="in">{tt.income || "Income"}</SelectItem>
                            <SelectItem value="out">{tt.expense || "Expense"}</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select
                        onValueChange={(value) => {
                            if (value === "all") {
                                table.getColumn("tags")?.setFilterValue(undefined)
                            } else {
                                table.getColumn("tags")?.setFilterValue(value)
                            }
                        }}
                    >
                        <SelectTrigger className="w-[150px]" size="sm">
                            <SelectValue placeholder={tt.category || "Tags"} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{fFilter.all_categories || "All"}</SelectItem>
                            <SelectItem value="food">{tagLabels.food}</SelectItem>
                            <SelectItem value="transport">{tagLabels.transport}</SelectItem>
                            <SelectItem value="housing">{tagLabels.housing}</SelectItem>
                            <SelectItem value="utilities">{tagLabels.utilities}</SelectItem>
                            <SelectItem value="subscriptions">{tagLabels.subscriptions}</SelectItem>
                            <SelectItem value="entertainment">{tagLabels.entertainment}</SelectItem>
                            <SelectItem value="shopping">{tagLabels.shopping}</SelectItem>
                            <SelectItem value="health">{tagLabels.health}</SelectItem>
                            <SelectItem value="insurance">{tagLabels.insurance}</SelectItem>
                            <SelectItem value="services">{tagLabels.services}</SelectItem>
                            <SelectItem value="other">{tagLabels.other}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-2">
                    <Dropdown>
                        <SmartTooltip text={t.tooltips?.columns || 'Columns'} group="table-toolbar">
                            <DropdownTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <Columns />
                                    <span className="hidden lg:inline">{fTable.columns || "Columns"}</span>
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

                    <SmartTooltip text={t.tooltips?.add_transaction || 'Add Transaction'} group="table-toolbar">
                        <Button variant="outline" size="sm">
                            <Plus />
                            <span className="hidden lg:inline">{tt.add_transaction}</span>
                        </Button>
                    </SmartTooltip>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="p-3.5 rounded-xl bg-black/2 dark:bg-white/3 border border-black/4 dark:border-white/4">
                    <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{tt.total_income}</p>
                    <p className="text-lg font-bold text-positive mt-1">
                        +{formatCurrency(totals.income)}
                    </p>
                </div>
                <div className="p-3.5 rounded-xl bg-black/2 dark:bg-white/3 border border-black/4 dark:border-white/4">
                    <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{tt.total_expenses}</p>
                    <p className="text-lg font-bold text-negative mt-1">
                        -{formatCurrency(totals.expenses)}
                    </p>
                </div>
                <div className="p-3.5 rounded-xl bg-black/2 dark:bg-white/3 border border-black/4 dark:border-white/4">
                    <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{tt.balance}</p>
                    <p className={`text-lg font-bold mt-1 ${totals.balance >= 0 ? "text-positive" : "text-negative"}`}>
                        {formatCurrency(totals.balance)}
                    </p>
                </div>
            </div>

            <TabsContent value="all" className="relative flex flex-col gap-4 overflow-auto">
                <div className="border border-black/6 dark:border-white/6 rounded-xl overflow-hidden">
                    <DndContext
                        id={sortableId}
                        collisionDetection={closestCenter}
                        modifiers={[restrictToVerticalAxis]}
                        onDragEnd={handleDragEnd}
                        sensors={sensors}
                    >
                        <Table className="w-full">
                            <TableHeader className="bg-black/3 dark:bg-white/3 sticky top-0 z-10">
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => (
                                            <TableHead 
                                                key={header.id} 
                                                colSpan={header.colSpan}
                                                style={{ width: header.getSize() }}
                                            >
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                                {header.column.getCanResize() && (
                                                    <TableResizeHandle
                                                        onMouseDown={header.getResizeHandler()}
                                                        onTouchStart={header.getResizeHandler()}
                                                        onDoubleClick={() => header.column.resetSize()}
                                                        isResizing={header.column.getIsResizing()}
                                                    />
                                                )}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody>
                                {table.getRowModel().rows?.length ? (
                                    <SortableContext
                                        items={dataIds}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {table.getRowModel().rows.map((row) => (
                                            <DraggableRow key={row.id} row={row} />
                                        ))}
                                    </SortableContext>
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
                    </DndContext>
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
            </TabsContent>
        </Tabs>
    )
}
