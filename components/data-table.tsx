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
    getPaginationRowModel,
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
    DropdownShell,
    DropdownItem,
    DropdownSeparator,
    DropdownTrigger,
} from "@/components/ui/app-dropdown"

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
      className = "text-neutral-500 dark:text-neutral-400 size-7 hover:bg-transparent cursor-grab active:cursor-grabbing"
    >
      <GripVertical className = "text-neutral-500 dark:text-neutral-400 size-3" />
    </Button>
  )
}

const columns: ColumnDef<z.infer<typeof schema>>[] = [
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
                    aria-label = "Selecionar todos"
                />
            </div>
        ),

        cell: ({ row })  => (
            <div className = "flex items-center justify-center">
                <Checkbox
                    checked = {row.getIsSelected()}
                    onCheckedChange = {(value)  => row.toggleSelected(!!value)}
                    aria-label = "Selecionar linha"
                />
            </div>
        ),

        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "service",
        header: "Serviço",

        cell: ({ row })  => {
            return <TableCellViewer item = {row.original} />
        },

        enableHiding: false,
    },
    {
        accessorKey: "status",
        header: "Estado",

        cell: ({ row })  => (
            <Badge variant = "outline" className = "px-1.5 | text-neutral-500 dark:text-neutral-400">
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

        header: ()  => <div className = "w-full | text-right">Próximo instante</div>,
        cell: ({ row })  => (
            <form
                onSubmit = {(e)  => {
                    e.preventDefault()
                    
                    toast.promise(new Promise((resolve)  => setTimeout(resolve, 1000)), {
                        loading: `Guardando ${row.original.header}`,
                        success: "Guardado",
                        error: "Erro",
                    })
                }}

                className = "flex justify-end"
            >
                <Label htmlFor = {`${row.original.id}-target`} className = "sr-only">
                    Próximo instante
                </Label>

                <Input
                    label="Target"
                    id = {`${row.original.id}-target`}
                    className = "w-16 h-8 | bg-transparent focus-visible:bg-background hover:bg-input/30 dark:bg-transparent dark:focus-visible:bg-input/30 dark:hover:bg-input/30 | border-transparent focus-visible:border | text-right shadow-none"
                    defaultValue = {row.original.target}
                />
            </form>
        ),
    },
    {
        accessorKey: "value",

        header: ()  => <div className = "w-full text-right">Valor</div>,
        cell: ({ row })  => (
            <form
                onSubmit = {(e)  => {
                    e.preventDefault()

                    toast.promise(new Promise((resolve)  => setTimeout(resolve, 1000)), {
                        loading: `Saving ${row.original.header}`,
                        success: "Done",
                        error: "Error",
                    })
                }}

                className = "flex justify-end"
            >
                <Label htmlFor = {`${row.original.id}-limit`} className = "sr-only">
                    Valor
                </Label>

                <Input
                    label="Valor"
                    id = {`${row.original.id}-limit`}
                    className = "w-16 h-8 | bg-transparent focus-visible:bg-background hover:bg-input/30 dark:bg-transparent dark:focus-visible:bg-input/30 dark:hover:bg-input/30 | border-transparent focus-visible:border | text-right shadow-none"
                    defaultValue = {row.original.limit}
                />
            </form>
        ),
    },
    {
        accessorKey: "accumulative",

        header: ()  => <div className = "w-full text-right">Acumulante</div>,
        cell: ({ row })  => (
            <form
                onSubmit = {(e)  => {
                    e.preventDefault()

                    toast.promise(new Promise((resolve)  => setTimeout(resolve, 1000)), {
                        loading: `Saving ${row.original.header}`,
                        success: "Done",
                        error: "Error",
                    })
                }}

                className = "flex justify-end"
            >
                <Label htmlFor = {`${row.original.id}-limit`} className = "sr-only">
                    Acumulante
                </Label>

                <Input
                    label="Acumulante"
                    id = {`${row.original.id}-limit`}
                    className = "w-16 h-8 | bg-transparent focus-visible:bg-background hover:bg-input/30 dark:bg-transparent dark:focus-visible:bg-input/30 dark:hover:bg-input/30 | border-transparent focus-visible:border | text-right shadow-none"
                    defaultValue = {row.original.limit}
                />
            </form>
        ),
    },
    {
        accessorKey: "vat",
        header: "IVA",

        cell: ({ row })  => (
            <div className = "w-32">
                <Badge variant = "outline" className = "text-neutral-500 dark:text-neutral-400 px-1.5">
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
                            className = "data-[state = open]:bg-black/5 dark:bg-white/5 text-neutral-500 dark:text-neutral-400 flex size-8"
                            size = "icon"
                        >
                            <EllipsisVertical />
                            <span className = "sr-only">Expandir</span>
                        </Button>
                    </DropdownTrigger>
                </SmartTooltip>

                <DropdownShell align = "end" className = "w-32">
                    <DropdownItem>
                        <ArrowUpToLine /> Afixar
                    </DropdownItem>

                    <DropdownSeparator />

                    <DropdownItem>
                        <Pencil /> Editar
                    </DropdownItem>
                    <DropdownItem>
                        <Copy /> Duplicar
                    </DropdownItem>

                    <DropdownSeparator />

                    <DropdownItem variant = "destructive"><Clock />Timeout</DropdownItem>
                    <DropdownItem variant = "destructive"><Delete />Eliminar</DropdownItem>
                </DropdownShell>
            </Dropdown>
        ),
    },
]

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
        getPaginationRowModel: getPaginationRowModel(),
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
                    Ver
                </Label>

                <Select defaultValue = "outline">
                    <SelectTrigger id = "view-selector" className = "flex w-fit @4xl/main:hidden" size = "sm">
                        <SelectValue placeholder = "Vistas" />
                    </SelectTrigger>

                    <SelectContent>
                        <SelectItem value = "outline">Serviços</SelectItem>
                    <SelectItem value = "Opcao2">Opção 2</SelectItem>
                    <SelectItem value = "Opcao3">Opção 3</SelectItem>
                    <SelectItem value = "Opcao4">Opção 4</SelectItem>
                </SelectContent>
            </Select>

            <TabsList className = "**:data-[slot = badge]:bg-black/5 dark:bg-white/5-foreground/30 hidden **:data-[slot = badge]:size-5 **:data-[slot = badge]:rounded-full **:data-[slot = badge]:px-1 @4xl/main:flex">
                <TabsTrigger value = "outline">Serviços</TabsTrigger>
                <TabsTrigger value = "Opcao2">Opção 2</TabsTrigger>
                <TabsTrigger value = "Opcao3">
                    Opção 3
                    <Badge variant = "default">2</Badge>
                </TabsTrigger>
                <TabsTrigger value = "Opcao4">Opção 4</TabsTrigger>
            </TabsList>

            <div className = "flex items-center gap-2">
                <Dropdown>
                    <SmartTooltip text="Columns" group="table-toolbar">
                        <DropdownTrigger asChild>
                            <Button variant = "outline" size = "sm">
                                <Columns />
                                <span className = "hidden lg:inline">Editar colunas</span>
                                <span className = "lg:hidden">Colunas</span>
                                <ChevronDown />
                            </Button>
                        </DropdownTrigger>
                    </SmartTooltip>
                        
                        <DropdownShell align = "end" className = "w-56">
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
                        </DropdownShell>
                    </Dropdown>

                    <SmartTooltip text="Add Item" group="table-toolbar">
                        <Button variant = "outline" size = "sm">
                            <Plus />
                            <span className = "hidden lg:inline">Adicionar</span>
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
                                            Sem resultados.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </DndContext>
                </div>

                <div className = "flex items-center justify-between | px-4">
                    <div className = "hidden lg:flex flex-1 | text-neutral-500 dark:text-neutral-400 text-sm">
                        <span>
                            {table.getFilteredSelectedRowModel().rows.length} de{" "}
                            {table.getFilteredRowModel().rows.length} linha(s) selecionada(s).
                        </span>
                    </div>

                    <div className = "flex items-center gap-8 | w-full lg:w-fit">
                        <div className = "hidden items-center gap-2 lg:flex">
                            <Label htmlFor = "rows-per-page" className = "text-sm font-medium">
                                Linhas em exibição
                            </Label>
                            
                            <Select
                                value = {`${table.getState().pagination.pageSize}`}
                                onValueChange = {(value)  => {
                                table.setPageSize(Number(value))
                                }}
                            >
                                <SelectTrigger id = "rows-per-page" size = "sm" className = "w-20">
                                    <SelectValue placeholder = {table.getState().pagination.pageSize}/>
                                </SelectTrigger>

                                <SelectContent side = "top">
                                    {[10, 20, 30, 40, 50].map((pageSize)  => (
                                        <SelectItem key = {pageSize} value = {`${pageSize}`}>
                                            {pageSize}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className = "flex items-center justify-center | w-fit | text-sm font-medium">
                            <span>
                                Página {table.getState().pagination.pageIndex + 1} de{" "}
                                {table.getPageCount()}
                            </span>
                        </div>

                        <div className = "flex items-center gap-2 | ml-auto lg:ml-0">
                            <SmartTooltip text="First Page" group="table-pagination">
                                <Button
                                    variant = "outline"
                                    className = "hidden lg:flex | h-8 w-8 | p-0"
                                    onClick = {()  => table.setPageIndex(0)}
                                    disabled = {!table.getCanPreviousPage()}
                                >
                                    <span className = "sr-only">Primeira página</span>
                                    <ChevronsLeft />
                                </Button>
                            </SmartTooltip>

                            <SmartTooltip text="Previous Page" group="table-pagination">
                                <Button
                                    variant = "outline"
                                    className = "size-8"
                                    size = "icon"
                                    onClick = {()  => table.previousPage()}
                                    disabled = {!table.getCanPreviousPage()}
                                >
                                    <span className = "sr-only">Página anterior</span>
                                    <ChevronLeft />
                                </Button>
                            </SmartTooltip>

                            <SmartTooltip text="Next Page" group="table-pagination">
                                <Button
                                    variant = "outline"
                                    className = "size-8"
                                    size = "icon"
                                    onClick = {()  => table.nextPage()}
                                    disabled = {!table.getCanNextPage()}
                                >
                                    <span className = "sr-only">Próxima página</span>
                                    <ChevronRight />
                                </Button>
                            </SmartTooltip>
                            
                            <SmartTooltip text="Last Page" group="table-pagination">
                                <Button
                                    variant = "outline"
                                    className = "hidden lg:flex | size-8"
                                    size = "icon"
                                    onClick = {()  => table.setPageIndex(table.getPageCount() - 1)}
                                    disabled = {!table.getCanNextPage()}
                                >
                                    <span className = "sr-only">Última página</span>
                                    <ChevronsRight />
                                </Button>
                            </SmartTooltip>
                        </div>
                    </div>
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



const chartData = [
    { month: "Janeiro",     desktop: 186,   mobile: 80 },
    { month: "Fevereiro",   desktop: 305,   mobile: 200 },
    { month: "Março",       desktop: 237,   mobile: 120 },
    { month: "Abril",       desktop: 73,    mobile: 190 },
    { month: "Maio",        desktop: 209,   mobile: 130 },
    { month: "Junho",       desktop: 214,   mobile: 140 },
    { month: "Julho",       desktop: 214,   mobile: 140 },
    { month: "Agosto",      desktop: 214,   mobile: 140 },
    { month: "Setembro",    desktop: 214,   mobile: 140 },
    { month: "Outubro",     desktop: 214,   mobile: 140 },
    { month: "Novembro",    desktop: 214,   mobile: 140 },
    { month: "Dezembro",    desktop: 214,   mobile: 140 },
]

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

    return (
        <Drawer direction = {isMobile ? "bottom" : "right"}>
            <DrawerTrigger asChild>
                <Button variant = "link" className = "w-fit | px-0 | text-black dark:text-white text-left">
                    {item.header}
                </Button>
            </DrawerTrigger>

            <DrawerContent>
                <DrawerHeader className = "gap-1">
                    <DrawerTitle>
                        {item.header}
                    </DrawerTitle>
                    <DrawerDescription>
                        Descrição
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
                                <span>+406.25€ este mês</span>{" "}
                                <TrendingUp className = "size-4" />
                            </div>

                            <div className = "text-neutral-500 dark:text-neutral-400">
                                <span>
                                    Showing total visitors for the last 6 months. This is just
                                    some random text to test the layout. It spans multiple lines
                                    and should wrap around.
                                </span>
                            </div>
                        </div>

                        <Separator />
                        </>
                    )}

                    <form className = "flex flex-col gap-4">
                        <Input id = "service" label="Serviço" defaultValue = {item.header} />

                        <div className = "grid grid-cols-2 gap-4">
                            <Input id = "target" label="Próximo instante" defaultValue = {item.target} />

                            <Input id = "limit" label="Valor" defaultValue = {item.limit} />
                        </div>

                        <div className = "grid grid-cols-2 gap-4">
                            <div className = "flex flex-col gap-3">
                                <Label htmlFor = "status">Estado</Label>

                                <Select defaultValue = {item.status}>
                                    <SelectTrigger id = "status" className = "w-full">
                                        <SelectValue placeholder = "Selecione um estado" />
                                    </SelectTrigger>

                                    <SelectContent>
                                        <SelectItem value = "Paid">Pago</SelectItem>
                                        <SelectItem value = "To be paid">Por pagar</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className = "flex flex-col gap-3">
                                <Label htmlFor = "IVA">IVA</Label>

                                <Select defaultValue = {item.type}>
                                    <SelectTrigger id = "type" className = "w-full">
                                        <SelectValue placeholder = "Selecione uma percentagem de IVA" />
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
                    <Button>Submeter</Button>

                    <DrawerClose asChild>
                        <Button variant = "outline">Feito</Button>
                    </DrawerClose>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    )
}
