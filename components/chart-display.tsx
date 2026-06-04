//
//  chart-display.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Implements the Chart display React component for Argent, encapsulating reusable
//  interface structure, state handling, and presentation logic for feature screens.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Settings, X, Calendar, Maximize2 } from "lucide-react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { OverflowScroll } from "@/components/ui/overflow-scroll"
import { useChartContext } from "@/components/chart-context"
import { useCurrency } from "@/components/currency-provider"
import {
    DATE_FORMAT_OPTIONS,
    DISPLAY_MODE_ICONS,
    getCategoryOptions,
    getConfigColor,
    getFilteredCustomRangeData,
    getFilteredPeriodData,
    getOffsetDate,
    HOVER_DELAY,
} from "@/lib/chart"
import type { ChartInstance, DailyData } from "@/lib/chart"
import { AreaChartComponent, BarChartComponent, PieChartComponent } from "@/components/ui/chart"
import { UDS } from "@/lib/UDS"
import { EmptyState } from "@/components/empty-state"
import { cn } from "@/lib/utils"

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
    compact?: boolean
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
    onExpand,
    compact = false,
}: ChartDisplayProps) {
    const { chartConfig, labels, locale, currency } = useChartContext()
    const { convertAmount } = useCurrency()
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

    const convertedPeriodData = React.useMemo(() => {
        return periodData.map((item) => {
            const converted = { ...item } as DailyData
            for (const [key, value] of Object.entries(item)) {
                if (key !== "date" && typeof value === "number") {
                    converted[key as keyof DailyData] = convertAmount(value) as never
                }
            }
            return converted
        })
    }, [periodData, convertAmount])

    const chartKeys = React.useMemo(() => 
        showTotal ? [metricType] : (selectedCategories.length > 0 ? selectedCategories : [metricType]), 
        [showTotal, selectedCategories, metricType]
    )

    const pieData = React.useMemo(() => {
        if (showTotal) {
            const total = convertedPeriodData.reduce((acc, c) => acc + (c[metricType] as number), 0)
            return [{ name: metricType, value: total, fill: `var(--color-${metricType})` }]
        }
        const categories = selectedCategories.length > 0 ? selectedCategories : [...categoryOptions]
        return categories.map(cat => ({
            name: cat,
            value: convertedPeriodData.reduce((acc, c) => acc + (c[cat] as number || 0), 0),
            fill: `var(--color-${cat})`
        })).filter(d => d.value > 0)
    }, [convertedPeriodData, metricType, showTotal, selectedCategories, categoryOptions])

    const hasVisibleData = React.useMemo(() => {
        if (displayMode === "pie") {
            return pieData.some((item) => Math.abs(item.value) > 0)
        }

        return convertedPeriodData.some((item) =>
            chartKeys.some((key) => Math.abs(Number(item[key as keyof DailyData]) || 0) > 0)
        )
    }, [chartKeys, convertedPeriodData, displayMode, pieData])

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
    const expandLabel = labels.expand ?? "Expand"

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
    
    return (
        <div 
            data-chart-display
            className={cn(
                compact
                    ? "group relative flex h-full min-h-0 flex-1 min-w-0 select-none flex-col"
                    : [
                        UDS.cardSurface,
                        "relative flex-1 min-w-0 p-4 select-none",
                        (isSelected || isHovered) ? "sq-border-strong" : UDS.cardHover,
                    ],
            )}
            style={{ WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none' }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {/* Compact dashboard charts keep the old expanded view without exposing full edit controls. */}
            {compact && (
                <div
                    className={cn(
                        "pointer-events-none absolute right-2 top-2 z-10 opacity-0",
                        "group-hover:pointer-events-auto group-hover:opacity-100",
                        "group-focus-within:pointer-events-auto group-focus-within:opacity-100",
                        showBubbles && "pointer-events-auto opacity-100",
                    )}
                >
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                type="button"
                                variant="glass"
                                size="icon-sm"
                                onClick={handleExpand}
                                className="size-7 text-foreground-secondary hover:text-foreground"
                                aria-label={expandLabel}
                            >
                                <Maximize2 className="size-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left"><p>{expandLabel}</p></TooltipContent>
                    </Tooltip>
                </div>
            )}

            {/* Controls bubble - horizontal: top center, stacked: right border vertical */}
            {!compact && (isHorizontal ? (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 z-10 ${showBubbles ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <div className={`${UDS.floatingPillSurface} flex items-center gap-0.5 px-1.5 py-1`}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" onClick={handleMoveLeft} disabled={index === 0} className={cn("p-1.5 sq-full transition-colors disabled:cursor-not-allowed disabled:opacity-30", UDS.itemHover)}><ChevronLeft className="w-3.5 h-3.5" /></Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" disabled={index === 0}><p>{labels.move_left ?? "Move left"}</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" onClick={handleExpand} className={cn("p-1.5 sq-full transition-colors", UDS.itemHover)}><Maximize2 className="w-3.5 h-3.5" /></Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom"><p>{labels.expand ?? "Expand"}</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" onClick={handleSettings} className={cn("p-1.5 sq-full transition-colors", UDS.itemHover)}><Settings className="w-3.5 h-3.5" /></Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom"><p>{labels.customize ?? "Customize"}</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" onClick={handleDelete} disabled={totalCharts <= 1} className={`p-1.5 sq-full ${UDS.destructiveHover} transition-colors disabled:opacity-30 disabled:cursor-not-allowed`}><X className="w-3.5 h-3.5" /></Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" disabled={totalCharts <= 1}><p>{labels.remove ?? "Remove"}</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" onClick={handleMoveRight} disabled={index === totalCharts - 1} className={cn("p-1.5 sq-full transition-colors disabled:cursor-not-allowed disabled:opacity-30", UDS.itemHover)}><ChevronRight className="w-3.5 h-3.5" /></Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" disabled={index === totalCharts - 1}><p>{labels.move_right ?? "Move right"}</p></TooltipContent>
                        </Tooltip>
                    </div>
                </div>
            ) : (
                <div className={`absolute -right-3 top-1/2 -translate-y-1/2 z-10 ${showBubbles ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <div className={`${UDS.floatingPillSurface} flex flex-col items-center gap-0.5 px-1 py-1.5`}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" onClick={handleMoveLeft} disabled={index === 0} className={cn("p-1.5 sq-full transition-colors disabled:cursor-not-allowed disabled:opacity-30", UDS.itemHover)}><ChevronUp className="w-3.5 h-3.5" /></Button>
                            </TooltipTrigger>
                            <TooltipContent side="left" disabled={index === 0}><p>{labels.move_up ?? "Move up"}</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" onClick={handleExpand} className={cn("p-1.5 sq-full transition-colors", UDS.itemHover)}><Maximize2 className="w-3.5 h-3.5" /></Button>
                            </TooltipTrigger>
                            <TooltipContent side="left"><p>{labels.expand ?? "Expand"}</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" onClick={handleSettings} className={cn("p-1.5 sq-full transition-colors", UDS.itemHover)}><Settings className="w-3.5 h-3.5" /></Button>
                            </TooltipTrigger>
                            <TooltipContent side="left"><p>{labels.customize ?? "Customize"}</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" onClick={handleDelete} disabled={totalCharts <= 1} className={`p-1.5 sq-full ${UDS.destructiveHover} transition-colors disabled:opacity-30 disabled:cursor-not-allowed`}><X className="w-3.5 h-3.5" /></Button>
                            </TooltipTrigger>
                            <TooltipContent side="left" disabled={totalCharts <= 1}><p>{labels.remove ?? "Remove"}</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" onClick={handleMoveRight} disabled={index === totalCharts - 1} className={cn("p-1.5 sq-full transition-colors disabled:cursor-not-allowed disabled:opacity-30", UDS.itemHover)}><ChevronDown className="w-3.5 h-3.5" /></Button>
                            </TooltipTrigger>
                            <TooltipContent side="left" disabled={index === totalCharts - 1}><p>{labels.move_down ?? "Move down"}</p></TooltipContent>
                        </Tooltip>
                    </div>
                </div>
            ))}


            {/* Info strip - subtle text display, appears on hover/select */}
            {!compact && (
            <div className={`absolute bottom-0 left-0 right-0 z-10 pointer-events-none ${showBubbles ? 'opacity-100' : 'opacity-0'}`}>
                <OverflowScroll className={`py-1.5 ${isHorizontal ? 'px-4' : 'px-3'}`} speed={25} pauseDuration={2500} center>
                    <span className="flex items-center gap-3 text-[10px] text-neutral-400/70">
                        <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 sq-full shrink-0" style={{ backgroundColor: metricColor }} />
                            <span>{chartConfig[metricType]?.label}</span>
                        </span>
                        <span className="text-neutral-400/30">·</span>
                        <span className="flex items-center gap-1">
                            {React.createElement(DISPLAY_MODE_ICONS[displayMode], { className: "w-2.5 h-2.5 shrink-0" })}
                            <span>{chartTypeLabel}</span>
                        </span>
                        <span className="text-neutral-400/30">·</span>
                        <span className="flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5 shrink-0" />
                            <span>{periodLabel}</span>
                        </span>
                    </span>
                </OverflowScroll>
            </div>
            )}


            {/* Header row with metric info */}
            {!compact && (
            <div className={`flex items-center justify-between ${isHorizontal ? 'mb-3' : 'mb-2'}`}>
                <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-400/80">
                    <span className="w-2 h-2 sq-full" style={{ backgroundColor: metricColor }} />
                    <span>{chartConfig[metricType]?.label}</span>
                    <span className="text-neutral-400/40">•</span>
                    {selectedCategories.length > 1 ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="flex items-center gap-1.5 cursor-help">
                                    <span className="flex items-center -space-x-0.5">
                                        {selectedCategories.slice(0, 5).map(cat => (
                                            <span
                                                key={cat}
                                                className="w-2 h-2 sq-full ring-1 ring-background"
                                                style={{ backgroundColor: getConfigColor(chartConfig, cat) }}
                                            />
                                        ))}
                                        {selectedCategories.length > 5 && (
                                            <span className="w-2 h-2 sq-full uds-bg-subtle ring-1 ring-background text-[6px]">+</span>
                                        )}
                                    </span>
                                    <span className="underline decoration-dotted underline-offset-2">{filterLabel}</span>
                                </span>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-[200px] p-2">
                                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                                    {selectedCategories.map(cat => (
                                        <span key={cat} className="flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 sq-full shrink-0" style={{ backgroundColor: getConfigColor(chartConfig, cat) }} />
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
            )}


            <div className={`w-full overflow-hidden ${compact ? 'min-h-0 flex-1 [&_[data-slot=chart]]:aspect-auto! [&_[data-slot=chart]]:h-full [&_[data-slot=chart]]:min-h-0' : isHorizontal ? 'h-[220px]' : 'h-[180px]'}`}>
                {isLoading ? (
                    <div className="flex justify-center items-center h-full text-neutral-400 text-sm">{loadingText}</div>
                ) : !hasVisibleData ? (
                    <EmptyState
                        variant="no-data"
                        placement={compact ? "card" : "section"}
                        title={labels.no_data ?? undefined}
                        description=""
                        className="h-full min-h-0 py-0"
                    />
                ) : (
                    <>
                        {displayMode === "area" && <AreaChartComponent data={convertedPeriodData} config={chartConfig} chartKeys={chartKeys} periodType={periodType} locale={locale} currencyCode={currency} />}
                        {displayMode === "bar" && <BarChartComponent data={convertedPeriodData} config={chartConfig} chartKeys={chartKeys} periodType={periodType} locale={locale} currencyCode={currency} />}
                        {displayMode === "pie" && <PieChartComponent pieData={pieData} config={chartConfig} hoverIndex={hoverIndex} setHoverIndex={setHoverIndex} categoryKey={metricType} setCategoryKey={() => {}} locale={locale} currencyCode={currency} />}
                    </>
                )}
            </div>
        </div>
    )
})
