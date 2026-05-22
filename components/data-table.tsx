"use client"

import * as React from "react"
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

import { CSS } from "@dnd-kit/utilities"
import {
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    CircleCheck,
    EllipsisVertical,
    GripVertical,
    Columns,
    Loader,
    Plus,
    TrendingUp,
    ArrowUpToLine,
    Pencil,
    Copy,
    Clock,
    Delete
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
    Row,
    SortingState,
    useReactTable,
    VisibilityState,
} from "@tanstack/react-table"

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { toast } from "sonner"
import { z } from "zod"

import { useIsMobile } from "@/hooks/use-mobile"
import { useLanguage } from "@/components/language-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"

import { Checkbox } from "@/components/ui/checkbox"
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer"

import {
    Dropdown,
    DropdownCheckboxItem,
    DropdownContent,
    DropdownItem,
    DropdownSeparator,
    DropdownTrigger,
} from "@/components/ui/dropdown"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import { Separator } from "@/components/ui/separator"
import { SmartTooltip } from "@/components/ui/tooltip"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"



export const schema = z.object({
    id: z.number(),
    header: z.string(),
    type: z.string(),
    status: z.string(),
    target: z.string(),
    limit: z.string(),
    reviewer: z.string(),
})



// Create a separate component for the drag handle
function DragHandle({ id }: { id: number }) {
  const { attributes, listeners } = useSortable({
    id,
  })

  return (
    <Button
      {...attributes}
      {...listeners}
      variant = "ghost"
      size = "icon"
      className = "text-neutral-400 size-7 hover:bg-transparent cursor-grab active:cursor-grabbing"
    >
      <GripVertical className = "text-neutral-400 size-3" />
    </Button>
  )
}

function getColumns(dt: Record<string, string>): ColumnDef<z.infer<typeof schema>>[] {
  return [
    {
        id: "drag",
        header: ()  => null,
        cell: ({ row })  => <DragHandle id = {row.original.id} />,
    },
    {
        id: "select",
        header: ({ table })  => (
            <div className = "flex items-center justify-center">
                <Checkbox
                    checked = {
                        table.getIsAllPageRowsSelected() ||
                        (table.getIsSomePageRowsSelected() && "indeterminate")
                    }
                    onCheckedChange = {(value)  => table.toggleAllPageRowsSelected(!!value)}
                    aria-label = {dt.select_all || "Select all"}
                />
            </div>
        ),

        cell: ({ row })  => (
            <div className = "flex items-center justify-center">
                <Checkbox
                    checked = {row.getIsSelected()}
                    onCheckedChange = {(value)  => row.toggleSelected(!!value)}
                    aria-label = {dt.select_row || "Select row"}
                />
            </div>
        ),

        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "service",
        header: dt.service || "Service",

        cell: ({ row })  => {
            return <TableCellViewer item = {row.original} />
        },

        enableHiding: false,
    },
    {
        accessorKey: "status",
        header: dt.status || "Status",

        cell: ({ row })  => (
            <Badge variant = "outline" className = "px-1.5 | text-neutral-400">
                {row.original.status == "Done" ? (
                    <CircleCheck className = "fill-green-500 dark:fill-green-400 text-white" />
                ) : (
                    <Loader />
                )}
                {row.original.status}
            </Badge>
        ),
    },
    {
        accessorKey: "nextInstant",

        header: ()  => <div className = "w-full | text-right">{dt.next_due || "Next due"}</div>,
        cell: ({ row })  => (
            <form
                onSubmit = {(e)  => {
                    e.preventDefault()
                    
                    toast.promise(new Promise((resolve)  => setTimeout(resolve, 1000)), {
                        loading: `${dt.saving || "Saving"} ${row.original.header}`,
                        success: dt.saved || "Saved",
                        error: dt.error || "Error",
                    })
                }}

                className = "flex justify-end"
            >
                <Label htmlFor = {`${row.original.id}-target`} className = "sr-only">
                    {dt.next_due || "Next due"}
                </Label>

                <Input
                    label={dt.target || "Target"}
                    id = {`${row.original.id}-target`}
                    className = "w-16 h-8 | bg-transparent focus-visible:bg-background hover:bg-input/30 dark:bg-transparent dark:focus-visible:bg-input/30 dark:hover:bg-input/30 | border-transparent focus-visible:border | text-right shadow-none"
                    defaultValue = {row.original.target}
                />
            </form>
        ),
    },
    {
        accessorKey: "value",

        header: ()  => <div className = "w-full text-right">{dt.value || "Value"}</div>,
        cell: ({ row })  => (
            <form
                onSubmit = {(e)  => {
                    e.preventDefault()

                    toast.promise(new Promise((resolve)  => setTimeout(resolve, 1000)), {
                        loading: `${dt.saving || "Saving"} ${row.original.header}`,
                        success: dt.saved || "Saved",
                        error: dt.error || "Error",
                    })
                }}

                className = "flex justify-end"
            >
                <Label htmlFor = {`${row.original.id}-limit`} className = "sr-only">
                    {dt.value || "Value"}
                </Label>

                <Input
                    label={dt.value || "Value"}
                    id = {`${row.original.id}-limit`}
                    className = "w-16 h-8 | bg-transparent focus-visible:bg-background hover:bg-input/30 dark:bg-transparent dark:focus-visible:bg-input/30 dark:hover:bg-input/30 | border-transparent focus-visible:border | text-right shadow-none"
                    defaultValue = {row.original.limit}
                />
            </form>
        ),
    },
    {
        accessorKey: "accumulative",

        header: ()  => <div className = "w-full text-right">{dt.cumulative || "Cumulative"}</div>,
        cell: ({ row })  => (
            <form
                onSubmit = {(e)  => {
                    e.preventDefault()

                    toast.promise(new Promise((resolve)  => setTimeout(resolve, 1000)), {
                        loading: `${dt.saving || "Saving"} ${row.original.header}`,
                        success: dt.saved || "Saved",
                        error: dt.error || "Error",
                    })
                }}

                className = "flex justify-end"
            >
                <Label htmlFor = {`${row.original.id}-limit`} className = "sr-only">
                    {dt.cumulative || "Cumulative"}
                </Label>

                <Input
                    label={dt.cumulative || "Cumulative"}
                    id = {`${row.original.id}-limit`}
                    className = "w-16 h-8 | bg-transparent focus-visible:bg-background hover:bg-input/30 dark:bg-transparent dark:focus-visible:bg-input/30 dark:hover:bg-input/30 | border-transparent focus-visible:border | text-right shadow-none"
                    defaultValue = {row.original.limit}
                />
            </form>
        ),
    },
    {
        accessorKey: "vat",
        header: dt.vat || "VAT",

        cell: ({ row })  => (
            <div className = "w-32">
                <Badge variant = "outline" className = "text-neutral-400 px-1.5">
                    {row.original.type}
                </Badge>
            </div>
        ),
    },
    /*
    {
        accessorKey: "representative",
        header: "Gestor",

        cell: ({ row })  => {
        const isAssigned = row.original.reviewer ! = "Atribuir gestor"

        if (isAssigned) {
            return row.original.reviewer
        }

        return (
            <>
            <Label htmlFor = {`${row.original.id}-reviewer`} className = "sr-only">
                Gestor
            </Label>

            <Select>
                <SelectTrigger
                    id = {`${row.original.id}-reviewer`}
                    className = "w-38 **:data-[slot = select-value]:block **:data-[slot = select-value]:truncate"
                    size = "sm"
                >
                    <SelectValue placeholder = "Atribuir gestor" />
                </SelectTrigger>

                <SelectContent align = "end">
                    <SelectItem value = "Eddie Lake">Eddie Lake</SelectItem>
                    <SelectItem value = "Jamik Tashpulatov">Jamik Tashpulatov</SelectItem>
                </SelectContent>
            </Select>
            </>
        )
        },
    },
    */
    {
        id: "actions",
        
        cell: ()  => (
            <Dropdown>
                <SmartTooltip text="More Actions" group="table-actions">
                    <DropdownTrigger asChild>
                        <Button
                            variant = "ghost"
                            className = "data-[state = open]:bg-black/5 dark:bg-white/5 text-neutral-400 flex size-8"
                            size = "icon"
                        >
                            <EllipsisVertical />
                            <span className = "sr-only">{dt.expand || "Expand"}</span>
                        </Button>
                    </DropdownTrigger>
                </SmartTooltip>

                <DropdownContent align = "end" className = "w-32">
                    <DropdownItem>
                        <ArrowUpToLine /> {dt.pin || "Pin"}
                    </DropdownItem>

                    <DropdownSeparator />

                    <DropdownItem>
                        <Pencil /> {dt.edit || "Edit"}
                    </DropdownItem>
                    <DropdownItem>
                        <Copy /> {dt.duplicate || "Duplicate"}
                    </DropdownItem>

                    <DropdownSeparator />

                    <DropdownItem variant = "destructive"><Clock />{dt.timeout || "Timeout"}</DropdownItem>
                    <DropdownItem variant = "destructive"><Delete />{dt.delete || "Delete"}</DropdownItem>
                </DropdownContent>
            </Dropdown>
        ),
    },
  ]
}

function DraggableRow({ row }: { row: Row<z.infer<typeof schema>> }) {
    const { transform, transition, setNodeRef, isDragging } = useSortable({
        id: row.original.id,
    })

    return (
        <TableRow
            data-state = {row.getIsSelected() && "selected"}
            data-dragging = {isDragging}
            ref = {setNodeRef}
            className = "relative z-0 data-[dragging = true]:z-10 data-[dragging = true]:opacity-80 data-[dragging=true]:shadow-lg animate-fade-in"
            style = {{
                transform: CSS.Transform.toString(transform),
                transition: transition,
            }}
        >
        {row.getVisibleCells().map((cell)  => (
            <TableCell key = {cell.id} className="transition-colors duration-150">
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </TableCell>
        ))}
        </TableRow>
    )
}



/* Table */
export function DataTable({ data: initialData }: { data: z.infer<typeof schema>[] }) {
    const { t } = useLanguage()
    const dt = (t as any).data_table || {} as Record<string, any>
    const [data, setData] = React.useState(()  => initialData)
    const [rowSelection, setRowSelection] = React.useState({})
    const [columnVisibility, setColumnVisibility]  = 
    React.useState<VisibilityState>({})
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
        []
    )
    const [sorting, setSorting] = React.useState<SortingState>([])

    /* pageSize: Number of rows showing in the table in one page */
    const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10})
    const sortableId = React.useId()
    const sensors = useSensors(
        useSensor(MouseSensor, {}),
        useSensor(TouchSensor, {}),
        useSensor(KeyboardSensor, {})
    )

    const columns = React.useMemo(() => getColumns(dt), [dt])

    const dataIds = React.useMemo<UniqueIdentifier[]>(
        ()  => data?.map(({ id })  => id) || [],
        [data]
    )

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

        getRowId: (row)  => row.id.toString(),
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

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event

        if (active && over && active.id ! == over.id) {
            setData((data)  => {
                const oldIndex = dataIds.indexOf(active.id)
                const newIndex = dataIds.indexOf(over.id)

                return arrayMove(data, oldIndex, newIndex)
            })
        }
    }



    return (
        <Tabs defaultValue = "outline" className = "flex-col justify-start gap-4 | w-full">
            <div className = "flex items-center justify-between px-4 lg:px-4">
                <Label htmlFor = "view-selector" className = "sr-only">
                    {dt.view || "View"}
                </Label>

                <Select defaultValue = "outline">
                    <SelectTrigger id = "view-selector" className = "flex w-fit @4xl/main:hidden" size = "sm">
                        <SelectValue placeholder = {dt.views || "Views"} />
                    </SelectTrigger>

                    <SelectContent>
                        <SelectItem value = "outline">{dt.services || "Services"}</SelectItem>
                    <SelectItem value = "Opcao2">{dt.option_2 || "Option 2"}</SelectItem>
                    <SelectItem value = "Opcao3">{dt.option_3 || "Option 3"}</SelectItem>
                    <SelectItem value = "Opcao4">{dt.option_4 || "Option 4"}</SelectItem>
                </SelectContent>
            </Select>

            <TabsList className = "**:data-[slot = badge]:bg-black/5 dark:bg-white/5-foreground/30 hidden **:data-[slot = badge]:size-5 **:data-[slot = badge]:rounded-full **:data-[slot = badge]:px-1 @4xl/main:flex">
                <TabsTrigger value = "outline">{dt.services || "Services"}</TabsTrigger>
                <TabsTrigger value = "Opcao2">{dt.option_2 || "Option 2"}</TabsTrigger>
                <TabsTrigger value = "Opcao3">
                    {dt.option_3 || "Option 3"}
                    <Badge variant = "default">2</Badge>
                </TabsTrigger>
                <TabsTrigger value = "Opcao4">{dt.option_4 || "Option 4"}</TabsTrigger>
            </TabsList>

            <div className = "flex items-center gap-2">
                <Dropdown>
                    <SmartTooltip text="Columns" group="table-toolbar">
                        <DropdownTrigger asChild>
                            <Button variant = "glass" size = "sm">
                                <Columns />
                                <span className = "hidden lg:inline">{dt.edit_columns || "Edit columns"}</span>
                                <span className = "lg:hidden">{dt.columns || "Columns"}</span>
                                <ChevronDown />
                            </Button>
                        </DropdownTrigger>
                    </SmartTooltip>
                        
                        <DropdownContent align = "end" className = "w-56">
                            {table
                                .getAllColumns()

                                .filter(
                                (column)  =>
                                    typeof column.accessorFn ! == "undefined" &&
                                    column.getCanHide()
                                )

                                .map((column)  => {
                                    return (
                                        <DropdownCheckboxItem
                                            key = {column.id}
                                            className = "capitalize"
                                            checked = {column.getIsVisible()}
                                            onCheckedChange = {(value)  =>
                                                column.toggleVisibility(!!value)
                                            }
                                        >
                                            {column.id}
                                        </DropdownCheckboxItem>
                                    )
                                })
                            }
                        </DropdownContent>
                    </Dropdown>

                    <SmartTooltip text="Add Item" group="table-toolbar">
                        <Button variant = "glass" size = "sm">
                            <Plus />
                            <span className = "hidden lg:inline">{dt.add || "Add"}</span>
                        </Button>
                    </SmartTooltip>
                </div>
            </div>

            <TabsContent value = "outline" className = "relative flex flex-col gap-4 | px-4 lg:px-4 | overflow-auto">
                <div className = "border rounded-lg | overflow-hidden">
                    <DndContext
                        id = {sortableId}
                        collisionDetection = {closestCenter}
                        modifiers = {[restrictToVerticalAxis]}
                        onDragEnd = {handleDragEnd}
                        sensors = {sensors}
                    >
                        <Table>
                            <TableHeader className = "bg-black/5 dark:bg-white/5 sticky top-0 z-10">
                                {table.getHeaderGroups().map((headerGroup)  => (
                                    
                                    <TableRow key = {headerGroup.id}>
                                        {headerGroup.headers.map((header)  => {
                                            return (
                                                <TableHead key = {header.id} colSpan = {header.colSpan}>
                                                    {header.isPlaceholder
                                                        ? null
                                                        : flexRender(
                                                            header.column.columnDef.header,
                                                            header.getContext()
                                                        )
                                                    }
                                                </TableHead>
                                            )
                                        })}
                                    </TableRow>

                                ))}
                            </TableHeader>

                            <TableBody className = "**:data-[slot = table-cell]:first:w-8">
                                {table.getRowModel().rows?.length ? (
                                    <SortableContext
                                        items = {dataIds}
                                        strategy = {verticalListSortingStrategy}
                                    >
                                        {table.getRowModel().rows.map((row)  => (
                                            <DraggableRow key = {row.id} row = {row} />
                                        ))}
                                    </SortableContext>

                                ) : (
                                    <TableRow>
                                        <TableCell colSpan = {columns.length} className = "h-24 | text-center">
                                            {dt.no_results || "No results."}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </DndContext>
                </div>
            </TabsContent>

            <TabsContent value = "option2" className = "flex flex-col | px-4 lg:px-4">
                <div className = "flex-1 | aspect-video w-full | border border-dashed rounded-lg"></div>
            </TabsContent>

            <TabsContent value = "option3" className = "flex flex-col | px-4 lg:px-4">
                <div className = "flex-1 | aspect-video w-full | border border-dashed rounded-lg"></div>
            </TabsContent>

            <TabsContent value = "option4" className = "flex flex-col | px-4 lg:px-4">
                <div className = "flex-1 | aspect-video w-full | border border-dashed rounded-lg"></div>
            </TabsContent>
            </Tabs>
    )
}



const defaultMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

function getChartData(months: string[]) {
    return [
        { month: months[0] || defaultMonths[0],   desktop: 186,   mobile: 80 },
        { month: months[1] || defaultMonths[1],   desktop: 305,   mobile: 200 },
        { month: months[2] || defaultMonths[2],   desktop: 237,   mobile: 120 },
        { month: months[3] || defaultMonths[3],   desktop: 73,    mobile: 190 },
        { month: months[4] || defaultMonths[4],   desktop: 209,   mobile: 130 },
        { month: months[5] || defaultMonths[5],   desktop: 214,   mobile: 140 },
        { month: months[6] || defaultMonths[6],   desktop: 214,   mobile: 140 },
        { month: months[7] || defaultMonths[7],   desktop: 214,   mobile: 140 },
        { month: months[8] || defaultMonths[8],   desktop: 214,   mobile: 140 },
        { month: months[9] || defaultMonths[9],   desktop: 214,   mobile: 140 },
        { month: months[10] || defaultMonths[10],  desktop: 214,   mobile: 140 },
        { month: months[11] || defaultMonths[11],  desktop: 214,   mobile: 140 },
    ]
}

/* Table Row Inspect Sidepanel Chart Popup */
const chartConfig = {
    desktop: {
        label: "Desktop",
        color: "hsl(var(--primary))",
    },
    mobile: {
        label: "Mobile",
        color: "hsl(var(--chart-2))",
    },
} satisfies ChartConfig



/* Table Cell Inspect Sidepanel */
function TableCellViewer({ item }: { item: z.infer<typeof schema> }) {
    const isMobile = useIsMobile()
    const { t } = useLanguage()
    const dt = (t as any).data_table || {} as Record<string, any>
    const months = Array.isArray(dt.months) ? dt.months : defaultMonths
    const chartData = React.useMemo(() => getChartData(months), [months])

    return (
        <Drawer direction = {isMobile ? "bottom" : "right"}>
            <DrawerTrigger asChild>
                <Button variant = "ghost" className = "w-fit | px-0 | text-black dark:text-white text-left">
                    {item.header}
                </Button>
            </DrawerTrigger>

            <DrawerContent>
                <DrawerHeader className = "gap-1">
                    <DrawerTitle>
                        {item.header}
                    </DrawerTitle>
                    <DrawerDescription>
                        {dt.description || "Description"}
                    </DrawerDescription>
                </DrawerHeader>

                <div className = "flex flex-col gap-4 px-4 | text-sm | overflow-x-hidden overflow-y-auto">
                    {!isMobile && (
                        <>
                        <ChartContainer config = {chartConfig}>
                            <AreaChart accessibilityLayer data = {chartData} margin = {{left: 0, right: 10}}>
                                <defs>
                                    <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--color-mobile)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="var(--color-mobile)" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--color-desktop)" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="var(--color-desktop)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>

                                <CartesianGrid vertical = {false} />
                                
                                <XAxis
                                    dataKey = "month"
                                    tickLine = {false}
                                    axisLine = {false}
                                    tickMargin = {10}
                                    tickFormatter = {(value)  => value.slice(0, 3)}
                                    hide
                                />

                                <ChartTooltip
                                    cursor = {false}
                                    content = {<ChartTooltipContent indicator = "dot" />}
                                />

                                <Area
                                    dataKey = "mobile"
                                    type = "natural"
                                    fill = "url(#fillMobile)"
                                    stroke = "var(--color-mobile)"
                                    strokeWidth = {2}
                                    stackId = "a"
                                />

                                <Area
                                    dataKey = "desktop"
                                    type = "natural"
                                    fill = "url(#fillDesktop)"
                                    stroke = "var(--color-desktop)"
                                    strokeWidth = {2}
                                    stackId = "a"
                                />
                            </AreaChart>
                        </ChartContainer>

                        <Separator />

                        <div className = "grid gap-2">
                            <div className = "flex gap-2 | font-medium leading-none">
                                <span>{(dt.trending_up || "+{amount} this month").replace("{amount}", "406.25€")}</span>{" "}
                                <TrendingUp className = "size-4" />
                            </div>

                            <div className = "text-neutral-400">
                                <span>
                                    {dt.chart_description || "Showing total visitors for the last 6 months. This is just some random text to test the layout. It spans multiple lines and should wrap around."}
                                </span>
                            </div>
                        </div>

                        <Separator />
                        </>
                    )}

                    <form className = "flex flex-col gap-4">
                        <Input id = "service" label={dt.service || "Service"} defaultValue = {item.header} />

                        <div className = "grid grid-cols-2 gap-4">
                            <Input id = "target" label={dt.next_due || "Next due"} defaultValue = {item.target} />

                            <Input id = "limit" label={dt.value || "Value"} defaultValue = {item.limit} />
                        </div>

                        <div className = "grid grid-cols-2 gap-4">
                            <div className = "flex flex-col gap-3">
                                <Label htmlFor = "status">{dt.status_label || "Status"}</Label>

                                <Select defaultValue = {item.status}>
                                    <SelectTrigger id = "status" className = "w-full">
                                        <SelectValue placeholder = {dt.select_status || "Select a status"} />
                                    </SelectTrigger>

                                    <SelectContent>
                                        <SelectItem value = "Paid">{dt.paid || "Paid"}</SelectItem>
                                        <SelectItem value = "To be paid">{dt.to_be_paid || "To be paid"}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className = "flex flex-col gap-3">
                                <Label htmlFor = "IVA">{dt.vat_label || "VAT"}</Label>

                                <Select defaultValue = {item.type}>
                                    <SelectTrigger id = "type" className = "w-full">
                                        <SelectValue placeholder = {dt.select_vat || "Select a VAT percentage"} />
                                    </SelectTrigger>

                                    <SelectContent>
                                        <SelectItem value = "IVA3">3%</SelectItem>
                                        <SelectItem value = "IVA10">10%</SelectItem>
                                        <SelectItem value = "IVA15">15%</SelectItem>
                                        <SelectItem value = "IVA23">23%</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        
                        {/* Add a representative section */}
                        {/*
                        <div className = "flex flex-col gap-3">
                            <Label htmlFor = "reviewer">Gestor</Label>

                            <Select defaultValue = {item.reviewer}>
                                <SelectTrigger id = "reviewer" className = "w-full">
                                    <SelectValue placeholder = "Selecione um gestor" />
                                </SelectTrigger>

                                <SelectContent>
                                    <SelectItem value = "Eddie Lake">Eddie Lake</SelectItem>
                                    <SelectItem value = "Jamik Tashpulatov">Jamik Tashpulatov</SelectItem>
                                    <SelectItem value = "Emily Whalen">Emily Whalen</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        */}
                    </form>
                </div>

                <DrawerFooter>
                    <Button>{dt.submit || "Submit"}</Button>

                    <DrawerClose asChild>
                        <Button variant = "glass">{dt.done || "Done"}</Button>
                    </DrawerClose>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    )
}
