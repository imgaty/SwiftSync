//
//  chart.tsx
//  Argent
//
//  Created by Hilario Ferreira on 08 December 2025 at 19:38.
//  Description: Defines the reusable Chart UI primitive for Argent, centralizing styling, composition
//  behavior, and accessibility-facing structure for consistent interfaces.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import * as RechartsPrimitive from "recharts"
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    Sector,
    XAxis,
    YAxis,
} from "recharts"

import { cn } from "@/lib/utils"
import { UDS } from "@/lib/UDS"
import { useIsMobile } from "@/hooks/use-mobile"
import { Button } from "@/components/ui/button"

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: "", dark: ".dark" } as const

export type ChartConfig = {
    [k in string]: {
        label?: React.ReactNode
        icon?: React.ComponentType
        
    } & (
        | { color?: string; theme?: never }
        | { color?: never; theme: Record<keyof typeof THEMES, string> }
    )
}

type ChartContextProps = {
    config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
    const context = React.useContext(ChartContext)

    if (!context) {
        throw new Error("useChart must be used within a <ChartContainer />")
    }

    return context
}

function ChartContainer({
    id,
    className,
    children,
    config,
    ...props
}: React.ComponentProps<"div"> & {
    config: ChartConfig
    children: React.ComponentProps<
        typeof RechartsPrimitive.ResponsiveContainer
    >["children"]
}) {
    const uniqueId = React.useId()
    const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`

    return (
        <ChartContext.Provider value={{ config }}>
            <div
                data-slot="chart"
                data-chart={chartId}
                className={cn(
                    "select-none min-w-0 min-h-px [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border flex aspect-video justify-center text-xs [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden [&_svg]:outline-none [&_svg]:border-none **:outline-none",
                    className
                )}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                {...props}
            >
                <ChartStyle id={chartId} config={config} />
                <RechartsPrimitive.ResponsiveContainer
                    width="100%"
                    height="100%"
                    minWidth={1}
                    minHeight={1}
                    initialDimension={{ width: 1, height: 1 }}
                >
                    {children}
                </RechartsPrimitive.ResponsiveContainer>
            </div>
        </ChartContext.Provider>
    )
}

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
    const styleString = React.useMemo(() => {
        const colorConfig = Object.entries(config).filter(
            ([, config]) => config.theme || config.color
        )

        if (!colorConfig.length) {
            return null
        }

        return Object.entries(THEMES)
            .map(
                ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
    .map(([key, itemConfig]) => {
        const color =
            itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ||
            itemConfig.color
        return color ? `  --color-${key}: ${color};` : null
    })
    .join("\n")}
}
`
            )
            .join("\n")
    }, [id, config])

    if (!styleString) {
        return null
    }

    return (
        <style
            dangerouslySetInnerHTML={{
                __html: styleString,
            }}
        />
    )
}

const ChartTooltip = RechartsPrimitive.Tooltip

function ChartTooltipContent({
    active,
    payload,
    className,
    indicator = "dot",
    hideLabel = false,
    hideIndicator = false,
    label,
    labelFormatter,
    labelClassName,
    formatter,
    color,
    nameKey,
    labelKey,
}: React.ComponentProps<"div"> &
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    RechartsPrimitive.TooltipProps<any, any> & {
        hideLabel?: boolean
        hideIndicator?: boolean
        indicator?: "line" | "dot" | "dashed"
        nameKey?: string
        labelKey?: string
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        payload?: any[]
        label?: React.ReactNode | string
        labelFormatter?: (
            label: React.ReactNode | string,
            payload: Record<string, unknown>[]
        ) => React.ReactNode
        labelClassName?: string
        formatter?: (
            value: unknown,
            name: unknown,
            item: unknown,
            index: number,
            payload: unknown
        ) => React.ReactNode
        color?: string
    }) {
    const { config } = useChart()

    const tooltipLabel = React.useMemo(() => {
        if (hideLabel || !payload?.length) {
            return null
        }

        const [item] = payload
        const key = `${labelKey || item?.dataKey || item?.name || "value"}`
        const itemConfig = getPayloadConfigFromPayload(config, item, key)
        const value =
            !labelKey && typeof label === "string"
                ? config[label as keyof typeof config]?.label || label
                : itemConfig?.label

        if (labelFormatter) {
            return (
                <div className={cn(UDS.label, "auto-scroll", labelClassName)}>
                    {labelFormatter(label, payload)}
                </div>
            )
        }

        if (!value) {
            return null
        }

        return <div className={cn(UDS.label, "auto-scroll", labelClassName)}>{value}</div>
    }, [
        label,
        labelFormatter,
        payload,
        hideLabel,
        labelClassName,
        config,
        labelKey,
    ])

    if (!active || !payload?.length) {
        return null
    }

    const nestLabel = payload.length === 1 && indicator !== "dot"

    return (
        <div
            className={cn(
                UDS.transientSurface,
                "z-[9999] grid w-[220px] items-start gap-0",
                className
            )}
        >
            {!nestLabel && tooltipLabel ? tooltipLabel : null}
            <div className="grid gap-0.5">
                {payload
                    .filter((item) => item.type !== "none")
                    .map((item, index) => {
                        const key = `${nameKey || item.name || item.dataKey || "value"}`
                        const itemConfig = getPayloadConfigFromPayload(
                            config,
                            item,
                            key
                        )
                        const indicatorColor =
                            color || item.payload.fill || item.color

                        return (
                            <div
                                key={item.dataKey}
                                className={cn(
                                    "flex w-full items-center gap-2 sq-lg px-2 py-2 text-[13px]",
                                )}
                            >
                                {formatter &&
                                item?.value !== undefined &&
                                item.name ? (
                                    formatter(
                                        item.value,
                                        item.name,
                                        item,
                                        index,
                                        item.payload
                                    )
                                ) : (
                                    <>
                                        {itemConfig?.icon ? (
                                            <span className="size-4 shrink-0 [&_svg]:size-full"><itemConfig.icon /></span>
                                        ) : (
                                            !hideIndicator && (
                                                <div
                                                    className={cn(
                                                        "shrink-0 sq-sm border-(--color-border) bg-(--color-bg)",
                                                        {
                                                            "size-2.5":
                                                                indicator ===
                                                                "dot",
                                                            "h-3 w-1":
                                                                indicator ===
                                                                "line",
                                                            "h-3 w-0 border-[1.5px] border-dashed bg-transparent":
                                                                indicator ===
                                                                "dashed",
                                                        }
                                                    )}
                                                    style={
                                                        {
                                                            "--color-bg": indicatorColor,
                                                            "--color-border": indicatorColor,
                                                        } as React.CSSProperties
                                                    }
                                                />
                                            )
                                        )}
                                        <span className="auto-scroll flex-1 min-w-0 text-black dark:text-white">
                                            {nestLabel && tooltipLabel ? (
                                                <span className={UDS.muted}>{tooltipLabel} · </span>
                                            ) : null}
                                            {itemConfig?.label || item.name}
                                        </span>
                                        {item.value !== undefined && item.value !== null && (
                                            <span className="shrink-0 text-[13px] text-black dark:text-white font-mono font-semibold tabular-nums tracking-tight">
                                                {typeof item.value === 'number' 
                                                    ? item.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                                    : item.value}
                                            </span>
                                        )}
                                    </>
                                )}
                            </div>
                        )
                    })}
            </div>
        </div>
    )
}

const ChartLegend = RechartsPrimitive.Legend

function ChartLegendContent({
    className,
    hideIcon = false,
    payload,
    verticalAlign = "bottom",
    nameKey,
}: React.ComponentProps<"div"> &
    Pick<RechartsPrimitive.LegendProps, "verticalAlign"> & {
        hideIcon?: boolean
        nameKey?: string
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        payload?: any[]
    }) {
    const { config } = useChart()

    if (!payload?.length) {
        return null
    }

    return (
        <div
            className={cn(
                "flex items-center justify-center gap-4",
                verticalAlign === "top" ? "pb-3" : "pt-3",
                className
            )}
        >
            {payload
                .filter((item) => item.type !== "none")
                .map((item) => {
                    const key = `${nameKey || item.dataKey || "value"}`
                    const itemConfig = getPayloadConfigFromPayload(
                        config,
                        item,
                        key
                    )

                    return (
                        <div
                            key={item.value}
                            className={cn(
                                "[&>svg]:text-neutral-400 flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3"
                            )}
                        >
                            {itemConfig?.icon && !hideIcon ? (
                                <itemConfig.icon />
                            ) : (
                                <div
                                    className="h-2 w-2 shrink-0 sq-2"
                                    style={{
                                        backgroundColor: item.color,
                                    }}
                                />
                            )}
                            {itemConfig?.label}
                        </div>
                    )
                })}
        </div>
    )
}

// Helper to extract item config from a payload.
function getPayloadConfigFromPayload(
    config: ChartConfig,
    payload: unknown,
    key: string
) {
    if (typeof payload !== "object" || payload === null) {
        return undefined
    }

    const payloadPayload =
        "payload" in payload &&
        typeof payload.payload === "object" &&
        payload.payload !== null
            ? payload.payload
            : undefined

    let configLabelKey: string = key

    if (
        key in payload &&
        typeof payload[key as keyof typeof payload] === "string"
    ) {
        configLabelKey = payload[key as keyof typeof payload] as string
    } else if (
        payloadPayload &&
        key in payloadPayload &&
        typeof payloadPayload[key as keyof typeof payloadPayload] === "string"
    ) {
        configLabelKey = payloadPayload[
            key as keyof typeof payloadPayload
        ] as string
    }

    return configLabelKey in config
        ? config[configLabelKey]
        : config[key as keyof typeof config]
}

const PieChartContext = React.createContext<{
    hoverIndex: number | null
    setHoverIndex: (index: number | null) => void
    categoryKey: string
    setCategoryKey: (key: string) => void
} | null>(null)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AnimatedSector(props: any) {
    const { index, payload, cx, cy, innerRadius, outerRadius: baseOuterRadius, startAngle, endAngle, fill } =
        props
    const context = React.useContext(PieChartContext)

    const hoverIndex = context?.hoverIndex ?? null
    const setHoverIndex = context?.setHoverIndex ?? (() => {})
    const categoryKey = context?.categoryKey ?? ""
    const setCategoryKey = context?.setCategoryKey ?? (() => {})

    const sliceKey = payload.name
    const selectedSet =
        categoryKey === "billed"
            ? new Set(["billed", "received"])
            : new Set([categoryKey])

    const isSelected = selectedSet.has(sliceKey)
    const isHovered = index === hoverIndex

    // Use relative scaling based on the actual outer radius from the Pie component
    const scale = isSelected || isHovered ? 1.08 : 1
    const targetRadius = baseOuterRadius * scale
    const [animatedRadius, setAnimatedRadius] = React.useState(targetRadius)
    const requestRef = React.useRef<number>(0)
    const animateRef = React.useRef<() => void>(() => {})

    const animate = React.useCallback(() => {
        setAnimatedRadius((prev) => {
            const diff = targetRadius - prev
            if (Math.abs(diff) < 0.5) {
                return targetRadius
            }
            requestRef.current = requestAnimationFrame(animateRef.current)
            return prev + diff * 0.2
        })
    }, [targetRadius])

    React.useEffect(() => {
        animateRef.current = animate
    }, [animate])

    React.useEffect(() => {
        requestRef.current = requestAnimationFrame(animate)
        return () => cancelAnimationFrame(requestRef.current)
    }, [animate])

    if (!context) return null

    return (
        <g>
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius}
                outerRadius={animatedRadius}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
                style={{
                    opacity: isSelected || isHovered ? 1 : 0.7,
                    transition: "opacity 0.3s ease",
                    cursor: "pointer",
                    outline: "none",
                }}
                onMouseEnter={() => setHoverIndex(index)}
                onMouseLeave={() => setHoverIndex(null)}
                onClick={() => {
                    if (sliceKey === "billed" || sliceKey === "received") {
                        setCategoryKey("billed")
                    } else {
                        setCategoryKey(sliceKey)
                    }
                }}
            />
        </g>
    )
}

const GRADIENT_KEYS = [
    'billed', 'received', 'predicted', 'taxes', 'others',
    // Income/Expenses totals
    'income', 'expenses',
    // Income categories
    'salary', 'freelance', 'investment',
    // Expense categories  
    'food', 'transport', 'housing', 'utilities', 'subscriptions', 
    'entertainment', 'shopping', 'health', 'insurance', 'services', 'other'
]

const ChartGradients = () => (
    <defs>
        {GRADIENT_KEYS.map(key => (
            <linearGradient key={key} id={`fill${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={`var(--color-${key})`} stopOpacity={0.2} />
                <stop offset="95%" stopColor={`var(--color-${key})`} stopOpacity={0} />
            </linearGradient>
        ))}
    </defs>
)

const getXAxisFormatter = (periodType: string, locale: string) => (value: string) => {
    const date = new Date(value)
    if (periodType === "all") return date.getFullYear().toString()
    if (periodType === "year") return date.toLocaleDateString(locale, { month: "short" })
    return date.toLocaleDateString(locale, { month: "short", day: "numeric" })
}

const getYAxisFormatter = (locale: string, currencyCode: string = "EUR") => (value: number) => {
    return Number(value).toLocaleString(locale, {
        style: "currency",
        currency: currencyCode,
        notation: locale === 'en-US' ? 'compact' : 'standard',
    })
}

// Calculate dynamic Y-axis width based on maximum value
const getYAxisWidth = (data: Record<string, unknown>[], chartKeys: string[], locale: string, currencyCode: string = "EUR"): number => {
    if (!data.length) return 65
    
    let maxValue = 0
    for (const item of data) {
        for (const key of chartKeys) {
            const val = Number(item[key]) || 0
            if (val > maxValue) maxValue = val
        }
    }
    
    // Format the max value to get actual string length
    const formatted = maxValue.toLocaleString(locale, {
        style: "currency",
        currency: currencyCode,
        notation: locale === 'en-US' ? 'compact' : 'standard',
    })
    
    // Base width + additional width per character (approximately 7px per char)
    const baseWidth = 20
    const charWidth = 7.5
    const calculatedWidth = baseWidth + (formatted.length * charWidth)
    
    // Clamp between 50 and 120px
    return Math.max(50, Math.min(120, calculatedWidth))
}

// Helper to add ordinal suffix for English dates
const getOrdinalSuffix = (day: number, locale: string) => {
    if (!locale.toLowerCase().startsWith('en')) return ''
    if (day > 3 && day < 21) return 'th'
    switch (day % 10) {
        case 1: return 'st'
        case 2: return 'nd'
        case 3: return 'rd'
        default: return 'th'
    }
}

// Helper to capitalize first letter
const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1)

// Format date for chart tooltip label based on period type and locale
const getTooltipLabelFormatter = (periodType: string, locale: string) => (label: React.ReactNode | string) => {
    if (typeof label !== 'string') return label
    const date = new Date(label)
    if (isNaN(date.getTime())) return label
    
    if (periodType === "all") {
        return date.getFullYear().toString()
    }
    if (periodType === "year") {
        const month = capitalize(date.toLocaleDateString(locale, { month: 'long' }))
        const year = date.getFullYear()
        return `${month} ${year}`
    }
    // For today/month view - show full date with ordinal for English
    const day = date.getDate()
    const suffix = getOrdinalSuffix(day, locale)
    const month = capitalize(date.toLocaleDateString(locale, { month: 'long' }))
    const year = date.getFullYear()
    
    if (locale.toLowerCase().startsWith('en')) {
        return `${month} ${day}${suffix}, ${year}`
    }
    // For other locales, use "Day de Month de Year" format
    return `${day} de ${month} de ${year}`
}

function AreaChartComponent({
    data,
    config,
    chartKeys,
    periodType,
    locale = "pt-PT",
    currencyCode = "EUR",
    animationBegin = 0,
    animationDuration = 800,
    isSelected = false,
}: {
    data: Record<string, unknown>[]
    config: ChartConfig
    chartKeys: string[]
    periodType: string
    locale?: string
    currencyCode?: string
    animationBegin?: number
    animationDuration?: number
    isSelected?: boolean
}) {
    const isMobile = useIsMobile()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [activePayload, setActivePayload] = React.useState<any[] | null>(null)
    const tooltipLabelFormatter = React.useMemo(() => getTooltipLabelFormatter(periodType, locale), [periodType, locale])
    const yAxisWidth = React.useMemo(() => getYAxisWidth(data, chartKeys, locale, currencyCode), [data, chartKeys, locale, currencyCode])
    
    return (
        <ChartContainer config={config} className="w-full h-full relative overflow-hidden">
            {isMobile && activePayload && activePayload.length > 0 && (
                <div 
                    className={cn(
                        UDS.cardSurface,
                        "absolute right-0 top-0 bottom-0 w-[120px] sq-none border-y-0 border-r-0 p-2 flex flex-col gap-2 z-50 transition-all duration-300 ease-in-out",
                        isSelected ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full pointer-events-none"
                    )}
                >
                    <div className="text-xs font-medium text-neutral-400 border-b pb-1 mb-1">
                        {tooltipLabelFormatter(activePayload[0].payload.date)}
                    </div>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {activePayload.map((item: any) => (
                        <div key={item.name} className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 sq-full" style={{ backgroundColor: item.color }} />
                                {config[item.name]?.label ?? item.name}
                            </span>
                            <span className="text-xs font-medium tabular-nums">
                                {getYAxisFormatter(locale, currencyCode)(item.value)}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            <AreaChart 
                data={data}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onMouseMove={(e: any) => {
                    if (e?.activePayload) setActivePayload(e.activePayload)
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onTouchMove={(e: any) => {
                    if (e?.activePayload) setActivePayload(e.activePayload)
                }}
            >
                <ChartGradients />
                <CartesianGrid vertical={false} />

                <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    minTickGap={32}
                    tickFormatter={getXAxisFormatter(periodType, locale)}
                />

                {!isMobile && (
                    <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="dot" labelFormatter={tooltipLabelFormatter} />}
                        wrapperStyle={{ zIndex: 9999 }}
                    />
                )}
                {isMobile && (
                     <ChartTooltip
                        cursor={true}
                        content={() => null}
                        wrapperStyle={{ display: 'none' }}
                    />
                )}

                <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    tickFormatter={getYAxisFormatter(locale, currencyCode)}
                    width={yAxisWidth}
                />

                {chartKeys.map((key) => (
                    <Area
                        key={key}
                        dataKey={key}
                        type="monotone"
                        fill={`url(#fill${key})`}
                        stroke={`var(--color-${key})`}
                        strokeWidth={2}
                        animationBegin={animationBegin}
                        animationDuration={animationDuration}
                    />
                ))}
            </AreaChart>
        </ChartContainer>
    )
}

function BarChartComponent({
    data,
    config,
    chartKeys,
    periodType,
    locale = "pt-PT",
    currencyCode = "EUR",
    animationBegin = 0,
    animationDuration = 800,
    isSelected = false,
}: {
    data: Record<string, unknown>[]
    config: ChartConfig
    chartKeys: string[]
    periodType: string
    locale?: string
    currencyCode?: string
    animationBegin?: number
    animationDuration?: number
    isSelected?: boolean
}) {
    const isMobile = useIsMobile()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [activePayload, setActivePayload] = React.useState<any[] | null>(null)
    const tooltipLabelFormatter = React.useMemo(() => getTooltipLabelFormatter(periodType, locale), [periodType, locale])
    const yAxisWidth = React.useMemo(() => getYAxisWidth(data, chartKeys, locale, currencyCode), [data, chartKeys, locale, currencyCode])
    
    return (
        <ChartContainer config={config} className="w-full h-full relative overflow-hidden">
            {isMobile && activePayload && activePayload.length > 0 && (
                <div 
                    className={cn(
                        UDS.cardSurface,
                        "absolute right-0 top-0 bottom-0 w-[120px] sq-none border-y-0 border-r-0 p-2 flex flex-col gap-2 z-50 transition-all duration-300 ease-in-out",
                        isSelected ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full pointer-events-none"
                    )}
                >
                    <div className="text-xs font-medium text-neutral-400 border-b pb-1 mb-1">
                        {tooltipLabelFormatter(activePayload[0].payload.date)}
                    </div>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {activePayload.map((item: any) => (
                        <div key={item.name} className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 sq-full" style={{ backgroundColor: item.color }} />
                                {config[item.name]?.label ?? item.name}
                            </span>
                            <span className="text-xs font-medium tabular-nums">
                                {getYAxisFormatter(locale, currencyCode)(item.value)}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            <BarChart 
                data={data} 
                barGap={2}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onMouseMove={(e: any) => {
                    if (e?.activePayload) setActivePayload(e.activePayload)
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onTouchMove={(e: any) => {
                    if (e?.activePayload) setActivePayload(e.activePayload)
                }}
            >
                <CartesianGrid vertical={false} />

                <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    minTickGap={32}
                    tickFormatter={getXAxisFormatter(periodType, locale)}
                />

                {!isMobile && (
                    <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="dot" labelFormatter={tooltipLabelFormatter} />}
                        wrapperStyle={{ zIndex: 9999 }}
                    />
                )}
                {isMobile && (
                     <ChartTooltip
                        cursor={true}
                        content={() => null}
                        wrapperStyle={{ display: 'none' }}
                    />
                )}

                <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    tickFormatter={getYAxisFormatter(locale, currencyCode)}
                    width={yAxisWidth}
                />

                {chartKeys.map((key) => (
                    <Bar
                        key={key}
                        dataKey={key}
                        fill={`var(--color-${key})`}
                        radius={[4, 4, 0, 0]}
                        animationBegin={animationBegin}
                        animationDuration={animationDuration}
                    />
                ))}
            </BarChart>
        </ChartContainer>
    )
}

// Pie legend with smart scroll fade that hides when scrolled to bottom
function PieLegendScroll({ 
    pieData,
    config,
    total,
    setHoverIndex,
}: {
    pieData: Record<string, unknown>[]
    config: ChartConfig
    total: number
    setHoverIndex: (index: number | null) => void
    isSelected?: boolean
}) {
    const scrollRef = React.useRef<HTMLDivElement>(null)
    const [showFade, setShowFade] = React.useState(false)

    const checkScroll = React.useCallback(() => {
        const el = scrollRef.current
        if (!el) return
        // Show fade only if there's more content below
        const hasMoreContent = el.scrollHeight > el.clientHeight
        const isAtBottom = el.scrollTop >= el.scrollHeight - el.clientHeight - 2
        setShowFade(hasMoreContent && !isAtBottom)
    }, [])

    React.useEffect(() => {
        checkScroll()
        const el = scrollRef.current
        if (!el) return
        
        el.addEventListener('scroll', checkScroll)
        const resizeObserver = new ResizeObserver(checkScroll)
        resizeObserver.observe(el)
        
        return () => {
            el.removeEventListener('scroll', checkScroll)
            resizeObserver.disconnect()
        }
    }, [checkScroll, pieData])

    return (
        <div className="relative shrink-0 self-stretch flex flex-col overflow-hidden">
            <div 
                ref={scrollRef}
                className="scrollbar-subtle flex-1 min-h-0 overflow-y-auto pr-2 py-1"
            >
                <table className="text-xs">
                    <tbody>
                        {pieData.map((item, idx) => {
                            const percentage = total > 0 ? ((item.value as number) / total * 100).toFixed(0) : 0
                            return (
                                <tr 
                                    key={idx} 
                                    className={cn("cursor-pointer sq-md transition-colors", UDS.itemHover)}
                                    onMouseEnter={() => setHoverIndex(idx)}
                                    onMouseLeave={() => setHoverIndex(null)}
                                >
                                    <td className="py-0.5 pr-4 whitespace-nowrap">
                                        <span className="flex items-center gap-1.5">
                                            <span
                                                className="w-2 h-2 sq-full shrink-0"
                                                style={{ backgroundColor: item.fill as string }}
                                            />
                                            <span className="text-neutral-400">
                                                {config[item.name as string]?.label ?? String(item.name)}
                                            </span>
                                        </span>
                                    </td>
                                    <td className="py-0.5 text-right font-medium tabular-nums whitespace-nowrap">{percentage}%</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
            {/* Gradient fade at bottom when scrollable - uses mask to inherit background */}
            <div 
                className={`pointer-events-none absolute bottom-0 left-0 right-0 h-8 uds-bg-elevated transition-opacity duration-200 ${showFade ? 'opacity-100' : 'opacity-0'}`}
                style={{
                    maskImage: 'linear-gradient(to bottom, transparent, black)',
                    WebkitMaskImage: 'linear-gradient(to bottom, transparent, black)'
                }}
            />
        </div>
    )
}

// Carousel for pie legend on small screens - swipe/scroll or click dots to switch views
function PieLegendCarousel({
    pieData,
    config,
    total,
    setHoverIndex,
    chartContent,
}: {
    pieData: Record<string, unknown>[]
    config: ChartConfig
    total: number
    setHoverIndex: (index: number | null) => void
    chartContent: React.ReactNode
}) {
    const [activeView, setActiveView] = React.useState<'chart' | 'legend'>('chart')
    const containerRef = React.useRef<HTMLDivElement>(null)
    const scrollRef = React.useRef<HTMLDivElement>(null)
    const [isScrolling, setIsScrolling] = React.useState(false)
    const scrollTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
    
    // Drag state
    const [isDragging, setIsDragging] = React.useState(false)
    const [dragStartX, setDragStartX] = React.useState(0)
    const [dragDelta, setDragDelta] = React.useState(0)
    
    // Handle wheel/scroll to switch views
    const handleWheel = React.useCallback((e: React.WheelEvent) => {
        e.preventDefault()
        
        // Debounce scroll events
        if (isScrolling) return
        setIsScrolling(true)
        
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
        scrollTimeoutRef.current = setTimeout(() => setIsScrolling(false), 300)
        
        if (e.deltaY > 20 || e.deltaX > 20) {
            setActiveView('legend')
        } else if (e.deltaY < -20 || e.deltaX < -20) {
            setActiveView('chart')
        }
    }, [isScrolling])
    
    // Drag handlers
    const handlePointerDown = React.useCallback((e: React.PointerEvent) => {
        setIsDragging(true)
        setDragStartX(e.clientX)
        setDragDelta(0)
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    }, [])
    
    const handlePointerMove = React.useCallback((e: React.PointerEvent) => {
        if (!isDragging) return
        const delta = e.clientX - dragStartX
        setDragDelta(delta)
    }, [isDragging, dragStartX])
    
    const handlePointerUp = React.useCallback(() => {
        if (!isDragging) return
        setIsDragging(false)
        
        // Determine if we should switch views based on drag distance
        const threshold = 50
        if (dragDelta < -threshold && activeView === 'chart') {
            setActiveView('legend')
        } else if (dragDelta > threshold && activeView === 'legend') {
            setActiveView('chart')
        }
        setDragDelta(0)
    }, [isDragging, dragDelta, activeView])
    
    // Cleanup timeout on unmount
    React.useEffect(() => {
        return () => {
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
        }
    }, [])
    
    // Calculate transform based on active view and drag
    const getTransform = (view: 'chart' | 'legend') => {
        const baseOffset = view === 'chart' 
            ? (activeView === 'chart' ? 0 : -100)
            : (activeView === 'legend' ? 0 : 100)
        
        if (isDragging) {
            return `translateX(calc(${baseOffset}% + ${dragDelta}px))`
        }
        return `translateX(${baseOffset}%)`
    }

    return (
        <div ref={containerRef} className="w-full h-full relative overflow-hidden touch-none">
            {/* Carousel container */}
            <div 
                ref={scrollRef}
                className="w-full h-full"
                onWheel={handleWheel}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
            >
                {/* Chart view */}
                <div 
                    className={`absolute inset-0 flex items-center justify-center ${isDragging ? '' : 'transition-transform duration-300 ease-out'} ${
                        activeView !== 'chart' && !isDragging ? 'pointer-events-none' : ''
                    }`}
                    style={{ transform: getTransform('chart') }}
                >
                    {chartContent}
                </div>
                
                {/* Legend view */}
                <div 
                    className={`absolute inset-0 flex flex-col ${isDragging ? '' : 'transition-transform duration-300 ease-out'} ${
                        activeView !== 'legend' && !isDragging ? 'pointer-events-none' : ''
                    }`}
                    style={{ transform: getTransform('legend') }}
                >
                    <div className="flex-1 overflow-y-auto px-3 py-2">
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                            {pieData.map((item, idx) => {
                                const percentage = total > 0 ? ((item.value as number) / total * 100).toFixed(0) : 0
                                return (
                                    <div 
                                        key={idx}
                                        className="flex items-center justify-between text-xs py-1 cursor-pointer hover:opacity-80 transition-opacity"
                                        onMouseEnter={() => setHoverIndex(idx)}
                                        onMouseLeave={() => setHoverIndex(null)}
                                    >
                                        <span className="auto-scroll flex items-center gap-1.5">
                                            <span 
                                                className="w-2.5 h-2.5 sq-full shrink-0"
                                                style={{ backgroundColor: item.fill as string }}
                                            />
                                            <span className="auto-scroll text-neutral-400">
                                                {config[item.name as string]?.label ?? String(item.name)}
                                            </span>
                                        </span>
                                        <span className="font-medium tabular-nums ml-1 shrink-0">{percentage}%</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation dots */}
            {pieData.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
                    <Button variant="ghost"
                        onClick={() => setActiveView('chart')}
                        className={cn(
                            "h-2 w-2 sq-full transition-all duration-200",
                            activeView === 'chart'
                                ? "scale-100 bg-foreground"
                                : cn(UDS.subtleFill, "scale-90 hover:opacity-80")
                        )}
                        aria-label="Show chart"
                    />
                    <Button variant="ghost"
                        onClick={() => setActiveView('legend')}
                        className={cn(
                            "h-2 w-2 sq-full transition-all duration-200",
                            activeView === 'legend'
                                ? "scale-100 bg-foreground"
                                : cn(UDS.subtleFill, "scale-90 hover:opacity-80")
                        )}
                        aria-label="Show legend"
                    />
                </div>
            )}
        </div>
    )
}

function PieChartComponent({
    pieData,
    config,
    hoverIndex,
    setHoverIndex,
    categoryKey,
    setCategoryKey,
    animationBegin = 0,
    animationDuration = 800,
    locale = "pt-PT",
    currencyCode = "EUR",
    isSelected = false,
}: {
    pieData: Record<string, unknown>[]
    config: ChartConfig
    hoverIndex: number | null
    setHoverIndex: (index: number | null) => void
    categoryKey: string
    setCategoryKey: (key: string) => void
    animationBegin?: number
    animationDuration?: number
    locale?: string
    currencyCode?: string
    isSelected?: boolean
}) {
    const containerRef = React.useRef<HTMLDivElement>(null)
    const [containerWidth, setContainerWidth] = React.useState(300)

    // Track container size
    React.useEffect(() => {
        const el = containerRef.current
        if (!el) return

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0]
            if (entry) {
                setContainerWidth(entry.contentRect.width)
            }
        })
        
        observer.observe(el)
        return () => observer.disconnect()
    }, [])
    
    const isSmall = containerWidth < 200
    const isMedium = containerWidth >= 200 && containerWidth < 280
    
    const pieChartContextValue = React.useMemo(
        () => ({
            hoverIndex,
            setHoverIndex,
            categoryKey,
            setCategoryKey,
        }),
        [hoverIndex, categoryKey, setHoverIndex, setCategoryKey]
    )

    // Calculate total for percentage
    const total = React.useMemo(() => 
        pieData.reduce((sum, item) => sum + (item.value as number), 0), 
        [pieData]
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderShape = React.useCallback((props: any) => {
        return <AnimatedSector {...props} />
    }, [])

    // Custom label that shows total in center
    const renderCenterLabel = () => {
        return (
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                <tspan x="50%" dy="-0.4em" className="fill-foreground font-bold text-lg font-mono tabular-nums">
                    {total.toLocaleString(locale, { style: 'currency', currency: currencyCode, maximumFractionDigits: 0 })}
                </tspan>
                <tspan x="50%" dy="1.4em" className="fill-muted-foreground text-[10px]">
                    Total
                </tspan>
            </text>
        )
    }

    // Custom tooltip content for pie chart showing label, value and percentage
    const pieTooltipContent = React.useCallback(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({ active, payload }: any) => {
            if (!active || !payload?.length) return null
            const item = payload[0]
            const value = item.value as number
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0'
            const label = config[item.name as string]?.label ?? item.name
            const fill = item.payload?.fill
            
            return (
                <div className={cn(UDS.transientSurface, "z-[9999] grid min-w-[220px] max-w-[min(320px,calc(100vw-24px))] gap-0")}>
                    <div className={cn(UDS.label, "auto-scroll")}>
                        {label}
                    </div>
                    <div className="flex items-center justify-between gap-3 sq-lg px-2 py-2 text-[13px]">
                        <span className="flex min-w-0 items-center gap-2.5">
                            <span className="h-2.5 w-2.5 shrink-0 sq-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]" style={{ backgroundColor: fill }} />
                            <span className="auto-scroll text-black dark:text-white">Value</span>
                        </span>
                        <span className="text-[13px] font-mono font-semibold tabular-nums tracking-tight text-black dark:text-white">
                            {value.toLocaleString(locale, { style: 'currency', currency: currencyCode, minimumFractionDigits: 2 })}
                        </span>
                        <span className={cn(UDS.muted, "tabular-nums")}>{percentage}%</span>
                    </div>
                </div>
            )
        },
        [config, total, locale, currencyCode]
    )
    
    // Use carousel for small/medium, side legend for large
    const showCarousel = isSmall || isMedium
    const showSideLegend = !showCarousel && pieData.length > 1

    // The pie chart content to be used in carousel or standalone
    const pieChartContent = (
        <div className="w-full h-full flex items-center justify-center">
            <div className="aspect-square max-w-full h-full" style={{ maxHeight: showCarousel ? 'calc(100% - 24px)' : '100%' }}>
                <ChartContainer config={config} className="w-full h-full aspect-auto!">
                    <PieChartContext.Provider value={pieChartContextValue}>
                        <PieChart>
                            <ChartTooltip
                                cursor={false}
                                content={pieTooltipContent}
                                wrapperStyle={{ zIndex: 9999 }}
                            />
                            <Pie
                                data={pieData}
                                dataKey="value"
                                nameKey="name"
                                innerRadius="50%"
                                outerRadius="80%"
                                paddingAngle={2}
                                animationBegin={animationBegin}
                                animationDuration={animationDuration}
                                shape={renderShape}
                            >
                                {pieData.map((entry, index: number) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill as string} />
                                ))}
                            </Pie>
                            {renderCenterLabel()}
                        </PieChart>
                    </PieChartContext.Provider>
                </ChartContainer>
            </div>
        </div>
    )

    // Carousel mode for small/medium screens
    if (showCarousel && pieData.length > 1) {
        return (
            <div ref={containerRef} className="@container/pie w-full h-full p-2 relative">
                <PieLegendCarousel 
                    pieData={pieData} 
                    config={config} 
                    total={total} 
                    setHoverIndex={setHoverIndex} 
                    chartContent={pieChartContent}
                />
            </div>
        )
    }

    // Standard layout for large screens or single category
    return (
        <div ref={containerRef} className="@container/pie w-full h-full p-2 relative">
            <div className={`w-full h-full flex items-center justify-center ${showSideLegend ? 'flex-row gap-4' : ''}`}>
                {/* Pie Chart */}
                <div className={`min-h-0 flex items-center justify-center ${showSideLegend ? 'h-full aspect-square' : 'w-full h-full'}`}>
                    {pieChartContent}
                </div>
                
                {/* Side legend for large screens */}
                {showSideLegend && (
                    <PieLegendScroll pieData={pieData} config={config} total={total} setHoverIndex={setHoverIndex} isSelected={isSelected} />
                )}
            </div>
        </div>
    )
}

export {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
    ChartStyle,
    AreaChartComponent,
    BarChartComponent,
    PieChartComponent,
    ListChartComponent,
}

function ListChartComponent({
    data,
    config,
    chartKeys,
    periodType,
    locale = "pt-PT",
    dateHeader = "Data",
}: {
    data: Record<string, unknown>[]
    config: ChartConfig
    chartKeys: string[]
    periodType: string
    locale?: string
    dateHeader?: string
}) {
    return (
        <div className="h-full w-full pr-2 overflow-auto">
            <table className="w-full text-sm text-left">
                <thead className="sticky top-0 uds-bg-elevated text-neutral-400">
                    <tr>
                        <th className="pb-2 font-medium">{dateHeader}</th>
                        {chartKeys.map((key) => (
                            <th
                                key={key}
                                className="pb-2 font-medium text-right"
                            >
                                {config[key]?.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((item, index) => (
                        <tr key={index} className="border-b last:border-0">
                            <td className="py-2">
                                {periodType === "all" || periodType === "year"
                                    ? (item.date_pt as string)
                                    : locale === "pt-PT"
                                      ? (item.date_pt as string)
                                      : (item.date_en as string)}
                            </td>
                            {chartKeys.map((key) => (
                                <td
                                    key={key}
                                    className="py-2 text-right font-medium"
                                >
                                    {getYAxisFormatter(locale)(item[key] as number)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
