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
                    "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border flex aspect-video justify-center text-xs [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
                    className
                )}
                {...props}
            >
                <ChartStyle id={chartId} config={config} />
                <RechartsPrimitive.ResponsiveContainer>
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
                <div className={cn("font-medium", labelClassName)}>
                    {labelFormatter(label, payload)}
                </div>
            )
        }

        if (!value) {
            return null
        }

        return <div className={cn("font-medium", labelClassName)}>{value}</div>
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
                "border-border/50 bg-background grid min-w-32 items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl",
                className
            )}
        >
            {!nestLabel ? tooltipLabel : null}
            <div className="grid gap-1.5">
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
                                    "[&>svg]:text-muted-foreground flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5",
                                    indicator === "dot" && "items-center"
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
                                            <itemConfig.icon />
                                        ) : (
                                            !hideIndicator && (
                                                <div
                                                    className={cn(
                                                        "shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)",
                                                        {
                                                            "h-2.5 w-2.5":
                                                                indicator ===
                                                                "dot",
                                                            "w-1":
                                                                indicator ===
                                                                "line",
                                                            "w-0 border-[1.5px] border-dashed bg-transparent":
                                                                indicator ===
                                                                "dashed",
                                                            "my-0.5":
                                                                nestLabel &&
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
                                        <div
                                            className={cn(
                                                "flex flex-1 justify-between leading-none",
                                                nestLabel
                                                    ? "items-end"
                                                    : "items-center"
                                            )}
                                        >
                                            <div className="grid gap-1.5">
                                                {nestLabel
                                                    ? tooltipLabel
                                                    : null}
                                                <span className="text-muted-foreground">
                                                    {itemConfig?.label ||
                                                        item.name}
                                                </span>
                                            </div>
                                            {item.value && (
                                                <span className="text-foreground font-mono font-medium tabular-nums">
                                                    {item.value.toLocaleString()}
                                                </span>
                                            )}
                                        </div>
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
                                "[&>svg]:text-muted-foreground flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3"
                            )}
                        >
                            {itemConfig?.icon && !hideIcon ? (
                                <itemConfig.icon />
                            ) : (
                                <div
                                    className="h-2 w-2 shrink-0 rounded-[2px]"
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
    const { index, payload, cx, cy, innerRadius, startAngle, endAngle, fill } =
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

    const targetRadius = isSelected || isHovered ? 110 : 100
    const [outerRadius, setOuterRadius] = React.useState(targetRadius)
    const requestRef = React.useRef<number>(0)
    const animateRef = React.useRef<() => void>(() => {})

    const animate = React.useCallback(() => {
        setOuterRadius((prev) => {
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
                outerRadius={outerRadius}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
                style={{
                    filter: isSelected || isHovered ? "none" : "grayscale(100%)",
                    opacity: isSelected || isHovered ? 1 : 0.5,
                    transition: "filter 0.3s ease, opacity 0.3s ease",
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

const GRADIENT_KEYS = ['billed', 'received', 'predicted', 'taxes', 'others']

const ChartGradients = () => (
    <defs>
        {GRADIENT_KEYS.map(key => (
            <linearGradient key={key} id={`fill${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={`var(--color-${key})`} stopOpacity={0.4} />
                <stop offset="95%" stopColor={`var(--color-${key})`} stopOpacity={0.1} />
            </linearGradient>
        ))}
    </defs>
)

const getXAxisFormatter = (periodType: string, locale: string) => (value: any) => {
    const date = new Date(value)
    if (periodType === "all") return date.getFullYear().toString()
    if (periodType === "year") return date.toLocaleDateString(locale, { month: "short" })
    return date.toLocaleDateString(locale, { month: "short", day: "numeric" })
}

const getYAxisFormatter = (locale: string) => (value: any) => {
    return Number(value).toLocaleString(locale, {
        style: "currency",
        currency: "EUR",
        notation: locale === 'en-US' ? 'compact' : 'standard',
    })
}

function AreaChartComponent({
    data,
    config,
    chartKeys,
    periodType,
    locale = "pt-PT",
    animationBegin = 0,
    animationDuration = 800,
}: {
    data: Record<string, unknown>[]
    config: ChartConfig
    chartKeys: string[]
    periodType: string
    locale?: string
    animationBegin?: number
    animationDuration?: number
}) {
    return (
        <ChartContainer config={config} className="w-full h-full">
            <AreaChart data={data}>
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

                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                />

                <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    tickFormatter={getYAxisFormatter(locale)}
                />

                {chartKeys.map((key) => (
                    <Area
                        key={key}
                        dataKey={key}
                        type="natural"
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
    animationBegin = 0,
    animationDuration = 800,
}: {
    data: Record<string, unknown>[]
    config: ChartConfig
    chartKeys: string[]
    periodType: string
    locale?: string
    animationBegin?: number
    animationDuration?: number
}) {
    return (
        <ChartContainer config={config} className="w-full h-full">
            <BarChart data={data} barGap={2}>
                <CartesianGrid vertical={false} />

                <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    minTickGap={32}
                    tickFormatter={getXAxisFormatter(periodType, locale)}
                />

                <ChartTooltip
                    cursor={true}
                    content={<ChartTooltipContent indicator="dot" />}
                />

                <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    tickFormatter={getYAxisFormatter(locale)}
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

function PieChartComponent({
    pieData,
    config,
    hoverIndex,
    setHoverIndex,
    categoryKey,
    setCategoryKey,
    animationBegin = 0,
    animationDuration = 800,
}: {
    pieData: Record<string, unknown>[]
    config: ChartConfig
    hoverIndex: number | null
    setHoverIndex: (index: number | null) => void
    categoryKey: string
    setCategoryKey: (key: string) => void
    animationBegin?: number
    animationDuration?: number
}) {
    const pieChartContextValue = React.useMemo(
        () => ({
            hoverIndex,
            setHoverIndex,
            categoryKey,
            setCategoryKey,
        }),
        [hoverIndex, categoryKey, setHoverIndex, setCategoryKey]
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderShape = React.useCallback((props: any) => {
        return <AnimatedSector {...props} />
    }, [])

    return (
        <ChartContainer config={config} className="w-full h-full">
            <PieChartContext.Provider value={pieChartContextValue}>
                <PieChart className="mx-auto aspect-square max-h-[250px] [&_.recharts-pie-label-text]:fill-foreground">
                    <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                    />
                    <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={5}
                        animationBegin={animationBegin}
                        animationDuration={animationDuration}
                        shape={renderShape}
                    >
                        {pieData.map((entry, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.fill as string} />
                        ))}
                    </Pie>
                </PieChart>
            </PieChartContext.Provider>
        </ChartContainer>
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
                <thead className="sticky top-0 bg-card text-muted-foreground">
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
                                    {getYAxisFormatter(locale)(item[key])}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
