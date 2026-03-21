"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Settings, X, Calendar, Maximize2 } from "lucide-react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { OverflowScroll } from "@/components/ui/overflow-scroll"
import { useChartContext } from "@/components/chart-context"
import { DISPLAY_MODE_ICONS, HOVER_DELAY, DATE_FORMAT_OPTIONS } from "@/lib/chart-constants"
import { 
    getOffsetDate, 
    getFilteredPeriodData, 
    getFilteredCustomRangeData, 
    getCategoryOptions,
    getConfigColor 
} from "@/lib/chart-utils"
import type { ChartInstance, DailyData } from "@/lib/chart-types"
import { AreaChartComponent, BarChartComponent, PieChartComponent } from "@/components/ui/chart"

// ==============================================================================
// CHART DISPLAY COMPONENT
// ==============================================================================

interface ChartDisplayProps {
    instance: ChartInstance
    index: number
    totalCharts: number
    chartData: DailyData[]
    isLoading: boolean
    loadingText: string
    isHorizontal: boolean
    isSelected: boolean
    onSelect: () => void
    onDelete: () => void
    onMoveLeft: () => void
    onMoveRight: () => void
    onOpenSettings: () => void
    onExpand: () => void
}

export const ChartDisplay = React.memo(function ChartDisplay({ 
    instance, 
    index, 
    totalCharts, 
    chartData, 
    isLoading, 
    loadingText, 
    isHorizontal,
    isSelected,
    onSelect,
    onDelete, 
    onMoveLeft, 
    onMoveRight, 
    onOpenSettings,
    onExpand
}: ChartDisplayProps) {
    const { chartConfig, labels, locale } = useChartContext()
    const [hoverIndex, setHoverIndex] = React.useState<number | null>(null)
    const [isHovered, setIsHovered] = React.useState(false)
    const hoverTimerRef = React.useRef<NodeJS.Timeout | null>(null)
    
    const { metricType, displayMode, selectedCategories, showTotal, periodType, timeOffset, customDateRange } = instance
    const categoryOptions = getCategoryOptions(metricType)

    const offsetDate = React.useMemo(() => getOffsetDate(periodType, timeOffset), [periodType, timeOffset])
    
    // Use custom date range if set, otherwise use standard period filtering
    const periodData = React.useMemo(() => {
        if (customDateRange?.startDate && customDateRange?.endDate) {
            return getFilteredCustomRangeData(chartData, customDateRange.startDate, customDateRange.endDate)
        }
        return getFilteredPeriodData(chartData, periodType, offsetDate)
    }, [chartData, periodType, offsetDate, customDateRange])

    const chartKeys = React.useMemo(() => 
        showTotal ? [metricType] : (selectedCategories.length > 0 ? selectedCategories : [metricType]), 
        [showTotal, selectedCategories, metricType]
    )

    const pieData = React.useMemo(() => {
        if (showTotal) {
            const total = periodData.reduce((acc, c) => acc + (c[metricType] as number), 0)
            return [{ name: metricType, value: total, fill: `var(--color-${metricType})` }]
        }
        const categories = selectedCategories.length > 0 ? selectedCategories : [...categoryOptions]
        return categories.map(cat => ({
            name: cat,
            value: periodData.reduce((acc, c) => acc + (c[cat] as number || 0), 0),
            fill: `var(--color-${cat})`
        })).filter(d => d.value > 0)
    }, [periodData, metricType, showTotal, selectedCategories, categoryOptions])

    const lastTouchTimeRef = React.useRef(0)
    
    // Shared: handle selection (click or tap)
    const handleInteraction = React.useCallback((e: React.MouseEvent | React.TouchEvent) => {
        // Don't select if clicking on a button (control buttons)
        const target = e.target as HTMLElement
        if (target.closest('button')) return
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
        onSelect()
    }, [onSelect])

    // Desktop: hover to show/hide bubbles
    const handleMouseEnter = React.useCallback(() => { 
        if (Date.now() - lastTouchTimeRef.current < 500) return
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
        hoverTimerRef.current = setTimeout(() => setIsHovered(true), HOVER_DELAY) 
    }, [])
    
    const handleMouseLeave = React.useCallback(() => { 
        if (Date.now() - lastTouchTimeRef.current < 500) return
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
        setIsHovered(false)
    }, [])
    
    // Desktop: click to select
    const handleClick = React.useCallback((e: React.MouseEvent) => handleInteraction(e), [handleInteraction])
    
    // Mobile: tap to select
    const handleTouchStart = React.useCallback(() => { lastTouchTimeRef.current = Date.now() }, [])
    const handleTouchEnd = React.useCallback((e: React.TouchEvent) => {
        lastTouchTimeRef.current = Date.now()
        e.preventDefault()
        handleInteraction(e)
    }, [handleInteraction])

    React.useEffect(() => () => { 
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current) 
    }, [])

    const filterLabel = React.useMemo(() => {
        if (showTotal || selectedCategories.length === 0) return labels.total ?? "Total"
        if (selectedCategories.length === 1) return chartConfig[selectedCategories[0] as keyof typeof chartConfig]?.label ?? selectedCategories[0]
        return `${selectedCategories.length} ${labels.categories ?? "categories"}`
    }, [showTotal, selectedCategories, labels, chartConfig])

    const metricColor = getConfigColor(chartConfig, metricType)

    const handleMoveLeft = React.useCallback((e: React.MouseEvent) => { e.stopPropagation(); onMoveLeft() }, [onMoveLeft])
    const handleMoveRight = React.useCallback((e: React.MouseEvent) => { e.stopPropagation(); onMoveRight() }, [onMoveRight])
    const handleSettings = React.useCallback((e: React.MouseEvent) => { e.stopPropagation(); onOpenSettings() }, [onOpenSettings])
    const handleDelete = React.useCallback((e: React.MouseEvent) => { e.stopPropagation(); onDelete() }, [onDelete])
    const handleExpand = React.useCallback((e: React.MouseEvent) => { e.stopPropagation(); onExpand() }, [onExpand])

    const periodLabel = React.useMemo(() => {
        // Show custom date range label if set
        if (customDateRange?.startDate && customDateRange?.endDate) {
            const start = new Date(customDateRange.startDate)
            const end = new Date(customDateRange.endDate)
            return `${start.toLocaleDateString(locale, DATE_FORMAT_OPTIONS.SHORT)} - ${end.toLocaleDateString(locale, DATE_FORMAT_OPTIONS.SHORT)}`
        }
        
        if (periodType === 'all') return labels.all_time ?? 'All time'
        const formatMap = { 
            today: DATE_FORMAT_OPTIONS.SHORT, 
            month: DATE_FORMAT_OPTIONS.MONTH_YEAR, 
            year: DATE_FORMAT_OPTIONS.YEAR_ONLY 
        }
        return offsetDate.toLocaleDateString(locale, formatMap[periodType as keyof typeof formatMap])
    }, [periodType, offsetDate, locale, labels.all_time, customDateRange])

    const chartTypeLabel = React.useMemo(() => {
        const typeLabels: Record<string, string> = {
            area: labels.area ?? 'Area',
            bar: labels.bar ?? 'Bar', 
            pie: labels.pie ?? 'Pie'
        }
        return typeLabels[displayMode]
    }, [displayMode, labels])

    // Show bubbles when hovering OR selected
    const showBubbles = isHovered || isSelected
    
    // Border: selected = soft accent, hovered = subtle highlight, neither = default
    const borderClass = isSelected 
        ? 'border-2 border-primary/40 shadow-sm' 
        : isHovered 
            ? 'border-primary/25 shadow-sm' 
            : 'border-border hover:border-border/80 shadow-sm'

    return (
        <div 
            data-chart-display
            className={`relative flex-1 min-w-0 rounded-xl p-4 select-none transition-all duration-200 border bg-card ${borderClass}`}
            style={{ WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none' }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {/* Controls bubble - horizontal: top center, stacked: right border vertical */}
            {isHorizontal ? (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 z-10 transition-all duration-200 ease-out ${showBubbles ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
                    <div className="flex items-center gap-0.5 bg-background/95 backdrop-blur-sm border border-black/10 dark:border-white/10 rounded-full px-1.5 py-1 shadow-lg">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button onClick={handleMoveLeft} disabled={index === 0} className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft className="w-3.5 h-3.5" /></button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" disabled={index === 0}><p>{labels.move_left ?? "Move left"}</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button onClick={handleExpand} className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5/80 transition-colors"><Maximize2 className="w-3.5 h-3.5" /></button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom"><p>{labels.expand ?? "Expand"}</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button onClick={handleSettings} className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5/80 transition-colors"><Settings className="w-3.5 h-3.5" /></button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom"><p>{labels.customize ?? "Customize"}</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button onClick={handleDelete} disabled={totalCharts <= 1} className="p-1.5 rounded-full hover:bg-red-500/10 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"><X className="w-3.5 h-3.5" /></button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" disabled={totalCharts <= 1}><p>{labels.remove ?? "Remove"}</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button onClick={handleMoveRight} disabled={index === totalCharts - 1} className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight className="w-3.5 h-3.5" /></button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" disabled={index === totalCharts - 1}><p>{labels.move_right ?? "Move right"}</p></TooltipContent>
                        </Tooltip>
                    </div>
                </div>
            ) : (
                <div className={`absolute -right-3 top-1/2 -translate-y-1/2 z-10 transition-all duration-200 ease-out ${showBubbles ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2 pointer-events-none'}`}>
                    <div className="flex flex-col items-center gap-0.5 bg-background/95 backdrop-blur-sm border border-black/10 dark:border-white/10 rounded-full px-1 py-1.5 shadow-lg">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button onClick={handleMoveLeft} disabled={index === 0} className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"><ChevronUp className="w-3.5 h-3.5" /></button>
                            </TooltipTrigger>
                            <TooltipContent side="left" disabled={index === 0}><p>{labels.move_up ?? "Move up"}</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button onClick={handleExpand} className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5/80 transition-colors"><Maximize2 className="w-3.5 h-3.5" /></button>
                            </TooltipTrigger>
                            <TooltipContent side="left"><p>{labels.expand ?? "Expand"}</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button onClick={handleSettings} className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5/80 transition-colors"><Settings className="w-3.5 h-3.5" /></button>
                            </TooltipTrigger>
                            <TooltipContent side="left"><p>{labels.customize ?? "Customize"}</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button onClick={handleDelete} disabled={totalCharts <= 1} className="p-1.5 rounded-full hover:bg-red-500/10 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"><X className="w-3.5 h-3.5" /></button>
                            </TooltipTrigger>
                            <TooltipContent side="left" disabled={totalCharts <= 1}><p>{labels.remove ?? "Remove"}</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button onClick={handleMoveRight} disabled={index === totalCharts - 1} className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"><ChevronDown className="w-3.5 h-3.5" /></button>
                            </TooltipTrigger>
                            <TooltipContent side="left" disabled={index === totalCharts - 1}><p>{labels.move_down ?? "Move down"}</p></TooltipContent>
                        </Tooltip>
                    </div>
                </div>
            )}

            {/* Info strip - subtle text display, appears on hover/select */}
            <div className={`absolute bottom-0 left-0 right-0 z-10 pointer-events-none transition-all duration-200 ease-out ${showBubbles ? 'opacity-100' : 'opacity-0'}`}>
                <OverflowScroll className={`py-1.5 ${isHorizontal ? 'px-4' : 'px-3'}`} speed={25} pauseDuration={2500} center>
                    <span className="flex items-center gap-3 text-[10px] text-neutral-500 dark:text-neutral-400/70">
                        <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: metricColor }} />
                            <span>{chartConfig[metricType]?.label}</span>
                        </span>
                        <span className="text-neutral-500 dark:text-neutral-400/30">·</span>
                        <span className="flex items-center gap-1">
                            {React.createElement(DISPLAY_MODE_ICONS[displayMode], { className: "w-2.5 h-2.5 shrink-0" })}
                            <span>{chartTypeLabel}</span>
                        </span>
                        <span className="text-neutral-500 dark:text-neutral-400/30">·</span>
                        <span className="flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5 shrink-0" />
                            <span>{periodLabel}</span>
                        </span>
                    </span>
                </OverflowScroll>
            </div>

            {/* Header row with metric info */}
            <div className={`flex items-center justify-between ${isHorizontal ? 'mb-3' : 'mb-2'}`}>
                <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400/80">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: metricColor }} />
                    <span>{chartConfig[metricType]?.label}</span>
                    <span className="text-neutral-500 dark:text-neutral-400/40">•</span>
                    {selectedCategories.length > 1 ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="flex items-center gap-1.5 cursor-help">
                                    <span className="flex items-center -space-x-0.5">
                                        {selectedCategories.slice(0, 5).map(cat => (
                                            <span 
                                                key={cat} 
                                                className="w-2 h-2 rounded-full ring-1 ring-background" 
                                                style={{ backgroundColor: getConfigColor(chartConfig, cat) }} 
                                            />
                                        ))}
                                        {selectedCategories.length > 5 && (
                                            <span className="w-2 h-2 rounded-full bg-black/5 dark:bg-white/5-foreground/30 ring-1 ring-background text-[6px]">+</span>
                                        )}
                                    </span>
                                    <span className="underline decoration-dotted underline-offset-2">{filterLabel}</span>
                                </span>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-[200px] p-2">
                                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                                    {selectedCategories.map(cat => (
                                        <span key={cat} className="flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: getConfigColor(chartConfig, cat) }} />
                                            <span className="auto-scroll">{chartConfig[cat as keyof typeof chartConfig]?.label ?? cat}</span>
                                        </span>
                                    ))}
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    ) : (
                        <span>{filterLabel}</span>
                    )}
                </div>
            </div>

            <div className={`w-full overflow-visible ${isHorizontal ? 'h-[220px]' : 'h-[180px]'}`}>
                {isLoading ? (
                    <div className="flex justify-center items-center h-full text-neutral-500 dark:text-neutral-400 text-sm">{loadingText}</div>
                ) : (
                    <>
                        {displayMode === "area" && <AreaChartComponent data={periodData} config={chartConfig} chartKeys={chartKeys} periodType={periodType} locale={locale} />}
                        {displayMode === "bar" && <BarChartComponent data={periodData} config={chartConfig} chartKeys={chartKeys} periodType={periodType} locale={locale} />}
                        {displayMode === "pie" && <PieChartComponent pieData={pieData} config={chartConfig} hoverIndex={hoverIndex} setHoverIndex={setHoverIndex} categoryKey={metricType} setCategoryKey={() => {}} locale={locale} />}
                    </>
                )}
            </div>
        </div>
    )
})
