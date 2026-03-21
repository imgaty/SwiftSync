"use client"

import * as React from "react"
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    closestCenter,
    useSensor,
    useSensors,
    PointerSensor,
    useDroppable,
} from "@dnd-kit/core"
import {
    SortableContext,
    useSortable,
    arrayMove,
    rectSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
    Plus,
    X,
    GripVertical,
    AreaChart as AreaIcon,
    ChartColumn as BarIcon,
    PieChart as PieIcon,
    List as ListIcon,
    TrendingUp,
    Wallet,
    CreditCard,
    PiggyBank,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { useLanguage } from "@/components/language-provider"
import { cn } from "@/lib/utils"

// ==============================================================================
// TYPES & REGISTRY
// ==============================================================================

export type ChartWidgetType = 
    | "area-billed"
    | "area-predicted"
    | "area-taxes"
    | "bar-billed"
    | "bar-predicted"
    | "bar-taxes"
    | "pie-overview"
    | "stat-predicted"
    | "stat-billed"
    | "stat-taxes"
    | "stat-others"

export interface ChartWidget {
    id: string
    type: ChartWidgetType
    size: "small" | "medium" | "large"
}

interface WidgetDefinition {
    type: ChartWidgetType
    labelKey: string
    descriptionKey: string
    icon: React.ReactNode
    defaultSize: "small" | "medium" | "large"
    category: "chart" | "stat"
}

const WIDGET_REGISTRY: WidgetDefinition[] = [
    // Chart widgets
    { type: "area-billed", labelKey: "area_billed", descriptionKey: "area_billed_desc", icon: <AreaIcon className="w-5 h-5" />, defaultSize: "large", category: "chart" },
    { type: "area-predicted", labelKey: "area_predicted", descriptionKey: "area_predicted_desc", icon: <AreaIcon className="w-5 h-5" />, defaultSize: "large", category: "chart" },
    { type: "area-taxes", labelKey: "area_taxes", descriptionKey: "area_taxes_desc", icon: <AreaIcon className="w-5 h-5" />, defaultSize: "large", category: "chart" },
    { type: "bar-billed", labelKey: "bar_billed", descriptionKey: "bar_billed_desc", icon: <BarIcon className="w-5 h-5" />, defaultSize: "large", category: "chart" },
    { type: "bar-predicted", labelKey: "bar_predicted", descriptionKey: "bar_predicted_desc", icon: <BarIcon className="w-5 h-5" />, defaultSize: "large", category: "chart" },
    { type: "bar-taxes", labelKey: "bar_taxes", descriptionKey: "bar_taxes_desc", icon: <BarIcon className="w-5 h-5" />, defaultSize: "large", category: "chart" },
    { type: "pie-overview", labelKey: "pie_overview", descriptionKey: "pie_overview_desc", icon: <PieIcon className="w-5 h-5" />, defaultSize: "medium", category: "chart" },
    // Stat widgets
    { type: "stat-predicted", labelKey: "stat_predicted", descriptionKey: "stat_predicted_desc", icon: <TrendingUp className="w-5 h-5" />, defaultSize: "small", category: "stat" },
    { type: "stat-billed", labelKey: "stat_billed", descriptionKey: "stat_billed_desc", icon: <Wallet className="w-5 h-5" />, defaultSize: "small", category: "stat" },
    { type: "stat-taxes", labelKey: "stat_taxes", descriptionKey: "stat_taxes_desc", icon: <CreditCard className="w-5 h-5" />, defaultSize: "small", category: "stat" },
    { type: "stat-others", labelKey: "stat_others", descriptionKey: "stat_others_desc", icon: <PiggyBank className="w-5 h-5" />, defaultSize: "small", category: "stat" },
]

// ==============================================================================
// WIDGET DRAWER ITEM (Draggable from drawer)
// ==============================================================================

function DraggableWidgetItem({ definition }: { definition: WidgetDefinition }) {
    const { t } = useLanguage()
    const w = (t.widgets || {}) as Record<string, string>
    
    const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
        id: `drawer-${definition.type}`,
        data: {
            type: "drawer-item",
            widgetType: definition.type,
            defaultSize: definition.defaultSize,
        },
    })

    const style = {
        transform: CSS.Transform.toString(transform),
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent cursor-grab active:cursor-grabbing transition-colors"
        >
            <div className="p-2 rounded-md bg-primary/10 text-primary">
                {definition.icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                    {w[definition.labelKey] || definition.labelKey}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                    {w[definition.descriptionKey] || definition.descriptionKey}
                </p>
            </div>
        </div>
    )
}

// ==============================================================================
// SORTABLE WIDGET (In the grid)
// ==============================================================================

function SortableWidget({ 
    widget, 
    onRemove,
    children,
}: { 
    widget: ChartWidget
    onRemove: (id: string) => void
    children: React.ReactNode
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: widget.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    const sizeClasses = {
        small: "col-span-1",
        medium: "col-span-1",
        large: "col-span-2",
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                sizeClasses[widget.size],
                "relative group",
                isDragging && "z-50 opacity-80"
            )}
        >
            <div className="h-full rounded-lg border bg-card/50">
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 cursor-grab active:cursor-grabbing"
                        {...attributes}
                        {...listeners}
                    >
                        <GripVertical className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => onRemove(widget.id)}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
                {children}
            </div>
        </div>
    )
}

// ==============================================================================
// DROP ZONE
// ==============================================================================

function DropZone({ isOver }: { isOver: boolean }) {
    const { t } = useLanguage()
    const w = (t.widgets || {}) as Record<string, string>
    
    return (
        <div
            className={cn(
                "col-span-full min-h-[200px] rounded-lg border-2 border-dashed flex items-center justify-center transition-colors",
                isOver ? "border-primary bg-primary/5" : "border-muted-foreground/25"
            )}
        >
            <div className="text-center text-muted-foreground">
                <Plus className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">{w.drop_here || "Drop widgets here"}</p>
            </div>
        </div>
    )
}

// ==============================================================================
// WIDGET CONTENT RENDERER
// ==============================================================================

interface WidgetContentProps {
    widget: ChartWidget
    data: any[]
    chartConfig: any
    locale: string
}

function WidgetContent({ widget, data, chartConfig, locale }: WidgetContentProps) {
    const { t } = useLanguage()
    
    // Dynamic import chart components to avoid circular dependencies
    const {
        AreaChartComponent,
        BarChartComponent,
        PieChartComponent,
    } = require("@/components/ui/chart")

    const chartKeys = React.useMemo(() => {
        if (widget.type.includes("billed")) return ["billed", "received"]
        if (widget.type.includes("predicted")) return ["predicted"]
        if (widget.type.includes("taxes")) return ["taxes"]
        return ["billed"]
    }, [widget.type])

    const pieData = React.useMemo(() => {
        const totals = data.reduce((acc, c) => ({
            billed: acc.billed + (c.billed || 0),
            received: acc.received + (c.received || 0),
            predicted: acc.predicted + (c.predicted || 0),
            taxes: acc.taxes + (c.taxes || 0),
            others: acc.others + (c.others || 0),
        }), { billed: 0, received: 0, predicted: 0, taxes: 0, others: 0 })

        return Object.entries(totals).map(([key, value]) => ({
            name: key,
            value,
            fill: `var(--color-${key})`
        }))
    }, [data])

    // Stat widgets
    if (widget.type.startsWith("stat-")) {
        const statKey = widget.type.replace("stat-", "") as string
        const total = data.reduce((acc, item) => acc + (item[statKey] || 0), 0)
        const label = chartConfig[statKey]?.label || statKey
        const color = chartConfig[statKey]?.color || "#888"

        return (
            <div className="p-4">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                        <span className="text-sm text-muted-foreground">{label}</span>
                    </div>
                    <span className="text-2xl font-bold">
                        {total.toLocaleString(locale, { style: 'currency', currency: 'EUR' })}
                    </span>
                </div>
            </div>
        )
    }

    // Chart widgets
    const chartType = widget.type.split("-")[0]

    return (
        <div className="p-4">
            <div className="h-[220px]">
                {chartType === "area" && (
                    <AreaChartComponent
                        data={data}
                        config={chartConfig}
                        chartKeys={chartKeys}
                        periodType="month"
                        locale={locale}
                    />
                )}
                {chartType === "bar" && (
                    <BarChartComponent
                        data={data}
                        config={chartConfig}
                        chartKeys={chartKeys}
                        periodType="month"
                        locale={locale}
                    />
                )}
                {chartType === "pie" && (
                    <PieChartComponent
                        pieData={pieData}
                        config={chartConfig}
                        hoverIndex={null}
                        setHoverIndex={() => {}}
                        categoryKey="billed"
                        setCategoryKey={() => {}}
                    />
                )}
            </div>
        </div>
    )
}

// ==============================================================================
// MAIN COMPONENT
// ==============================================================================

interface ModularChartAreaProps {
    initialWidgets?: ChartWidget[]
}

export function ModularChartArea({ initialWidgets = [] }: ModularChartAreaProps) {
    const { t } = useLanguage()
    const w = (t.widgets || {}) as Record<string, string>
    
    const [widgets, setWidgets] = React.useState<ChartWidget[]>(initialWidgets)
    const [activeId, setActiveId] = React.useState<string | null>(null)
    const [drawerOpen, setDrawerOpen] = React.useState(false)
    const [data, setData] = React.useState<any[]>([])
    const [isLoading, setIsLoading] = React.useState(true)

    // Load chart data
    React.useEffect(() => {
        async function loadData() {
            try {
                const res = await fetch("/data.json")
                const rawData = await res.json()
                
                const processed = rawData.map((item: any) => {
                    let standardDate = item.date
                    if (item.date_pt) {
                        const [day, month, year] = item.date_pt.split('-')
                        standardDate = `${year}-${month}-${day}`
                    }
                    return {
                        ...item,
                        date: standardDate,
                        billed: Number(item.billed),
                        received: Number(item.received),
                        predicted: Number(item.predicted),
                        taxes: Number(item.taxes),
                        others: Number(item.others),
                    }
                })
                
                // Filter to current month for widgets
                const now = new Date()
                const currentMonth = now.toISOString().slice(0, 7)
                const monthData = processed.filter((item: any) => {
                    const itemMonth = item.date.slice(0, 7)
                    return itemMonth === currentMonth
                })
                
                setData(monthData.length > 0 ? monthData : processed.slice(-30))
            } catch (e) {
                console.error("Failed to load data:", e)
            } finally {
                setIsLoading(false)
            }
        }
        loadData()
    }, [])

    const chartConfig = React.useMemo(() => ({
        visitors: { label: t.data_type_labels?.total || "Total" },
        billed: { label: t.data_type_labels?.billed || "Billed", color: "#81C6FF" },
        received: { label: t.data_type_labels?.received || "Received", color: "#0085FF" },
        predicted: { label: t.data_type_labels?.predicted || "Predicted", color: "#FF4040" },
        taxes: { label: t.data_type_labels?.taxes || "Taxes", color: "#FFB669" },
        others: { label: t.data_type_labels?.others || "Others", color: "#FFDEA0" }
    }), [t])

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    )

    const { setNodeRef: setDropRef, isOver } = useDroppable({
        id: "chart-area-drop",
    })

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string)
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        setActiveId(null)

        if (!over) return

        // Check if dragging from drawer
        const activeData = active.data.current
        if (activeData?.type === "drawer-item") {
            // Add new widget
            const newWidget: ChartWidget = {
                id: `widget-${Date.now()}`,
                type: activeData.widgetType,
                size: activeData.defaultSize,
            }
            setWidgets(prev => [...prev, newWidget])
            setDrawerOpen(false)
            return
        }

        // Reorder existing widgets
        if (active.id !== over.id) {
            setWidgets((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id)
                const newIndex = items.findIndex((i) => i.id === over.id)
                
                if (oldIndex === -1 || newIndex === -1) return items
                return arrayMove(items, oldIndex, newIndex)
            })
        }
    }

    const removeWidget = (id: string) => {
        setWidgets(prev => prev.filter(w => w.id !== id))
    }

    const locale = t.config?.locale || "pt-PT"

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <Card className="@container/chart-area">
                <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-lg font-semibold">{w.chart_area_title || "Charts"}</CardTitle>
                    
                    <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} direction="right">
                        <DrawerTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                                <Plus className="w-4 h-4" />
                                {w.add_widget || "Add Widget"}
                            </Button>
                        </DrawerTrigger>
                        <DrawerContent className="h-full">
                            <DrawerHeader>
                                <DrawerTitle>{w.widget_library || "Widget Library"}</DrawerTitle>
                                <DrawerDescription>
                                    {w.widget_library_desc || "Drag widgets to add them to your dashboard"}
                                </DrawerDescription>
                            </DrawerHeader>
                            
                            <div className="px-4 pb-4 space-y-6 overflow-y-auto flex-1">
                                {/* Charts */}
                                <div>
                                    <h3 className="text-sm font-medium mb-3 text-muted-foreground">
                                        {w.category_charts || "Charts"}
                                    </h3>
                                    <div className="space-y-2">
                                        <SortableContext items={WIDGET_REGISTRY.filter(w => w.category === "chart").map(w => `drawer-${w.type}`)}>
                                            {WIDGET_REGISTRY.filter(w => w.category === "chart").map((def) => (
                                                <DraggableWidgetItem key={def.type} definition={def} />
                                            ))}
                                        </SortableContext>
                                    </div>
                                </div>
                                
                                {/* Stats */}
                                <div>
                                    <h3 className="text-sm font-medium mb-3 text-muted-foreground">
                                        {w.category_stats || "Statistics"}
                                    </h3>
                                    <div className="space-y-2">
                                        <SortableContext items={WIDGET_REGISTRY.filter(w => w.category === "stat").map(w => `drawer-${w.type}`)}>
                                            {WIDGET_REGISTRY.filter(w => w.category === "stat").map((def) => (
                                                <DraggableWidgetItem key={def.type} definition={def} />
                                            ))}
                                        </SortableContext>
                                    </div>
                                </div>
                            </div>
                            
                            <DrawerFooter>
                                <DrawerClose asChild>
                                    <Button variant="outline">{w.close || "Close"}</Button>
                                </DrawerClose>
                            </DrawerFooter>
                        </DrawerContent>
                    </Drawer>
                </CardHeader>

                <CardContent>
                    {/* Widget Grid - 2 columns for side by side */}
                    <div
                        ref={setDropRef}
                        className="grid grid-cols-1 @[600px]/chart-area:grid-cols-2 gap-4 min-h-[250px]"
                    >
                        <SortableContext items={widgets.map(w => w.id)} strategy={rectSortingStrategy}>
                            {widgets.length === 0 ? (
                                <DropZone isOver={isOver} />
                            ) : (
                                <>
                                    {widgets.map((widget) => (
                                        <SortableWidget
                                            key={widget.id}
                                            widget={widget}
                                            onRemove={removeWidget}
                                        >
                                            {isLoading ? (
                                                <div className="p-4">
                                                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                                                        {t.loading || "Loading..."}
                                                    </div>
                                                </div>
                                            ) : (
                                                <WidgetContent
                                                    widget={widget}
                                                    data={data}
                                                    chartConfig={chartConfig}
                                                    locale={locale}
                                                />
                                            )}
                                        </SortableWidget>
                                    ))}
                                    {isOver && (
                                        <div className="col-span-1 min-h-[200px] rounded-lg border-2 border-dashed border-primary bg-primary/5" />
                                    )}
                                </>
                            )}
                        </SortableContext>
                    </div>
                </CardContent>
            </Card>

            <DragOverlay>
                {activeId && activeId.startsWith("drawer-") && (
                    <div className="w-64 p-3 rounded-lg border bg-card shadow-lg">
                        <div className="flex items-center gap-3">
                            {WIDGET_REGISTRY.find(w => `drawer-${w.type}` === activeId)?.icon}
                            <span className="font-medium text-sm">
                                {w[WIDGET_REGISTRY.find(w => `drawer-${w.type}` === activeId)?.labelKey || ""] || "Widget"}
                            </span>
                        </div>
                    </div>
                )}
            </DragOverlay>
        </DndContext>
    )
}
