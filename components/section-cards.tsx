"use client"

import * as React from "react"
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"

import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts"

import { Badge } from "@/components/ui/badge"

import {
    Card,
    CardAction,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

import { Skeleton } from "@/components/ui/skeleton"

import { ErrorState, AppErrors } from "@/components/error-state"

import { useLanguage } from "@/components/language-provider"
import rawData from "@/public/data.json"

// ==============================================================================
// 1. CONFIG & TYPES
// ==============================================================================

const DATA_FILE = 'data.json'

interface DailyData {
    date?: string
    date_pt: string
    billed: number
    received: number
    predicted: number
    taxes: number
    others: number
    [key: string]: any
}

interface StatData {
    value: number
    diff: number
    percent: number
    trend: 'up' | 'down'
    receivedValue?: number
    chartData?: { date: string; value: number; received?: number }[]
}

const CHART_COLORS = {
    billed: "#81C6FF",
    received: "#0085FF",
    predicted: "#FF4040",
    taxes: "#FFB669",
    others: "#FFDEA0",
}

// ==============================================================================
// 2. MAIN COMPONENT
// ==============================================================================

export function SectionCards() {
    const { t: Lang } = useLanguage()
    const [stats, setStats] = React.useState<Record<string, StatData> | null>(null)
    const [isLoading, setIsLoading] = React.useState(true)
    const [errorInfo, setErrorInfo] = React.useState<{ type: keyof typeof AppErrors, details?: string } | null>(null)

    React.useEffect(() => {
        async function load() {
            setErrorInfo(null)
            try {
                // Direct import used instead of fetch
                const data: DailyData[] = rawData as DailyData[];

                if (!data || data.length === 0) {
                    setErrorInfo({ type: 'EMPTY_DATA' })
                    return
                }

                const now = new Date() // Current date
                const currentMonth = now.getMonth()
                const currentYear = now.getFullYear()

                // Previous month calculation
                const prevDate = new Date(currentYear, currentMonth - 1, 1)
                const prevMonth = prevDate.getMonth()
                const prevYear = prevDate.getFullYear()

                const currentTotals = { predicted: 0, billed: 0, received: 0, taxes: 0, others: 0 }
                const prevTotals = { predicted: 0, billed: 0, received: 0, taxes: 0, others: 0 }

                // Accumulators for chart data (only for current month)
                const chartAccumulators: Record<string, { date: string, value: number, received?: number }[]> = {
                    predicted: [],
                    billed: [],
                    taxes: [],
                    others: []
                }

                data.forEach(item => {
                    let dateStr = item.date || ""

                    // Rearranges the date from PT format to YYYY-MM-DD for better javaScript handling
                    if (item.date_pt) {
                        const [day, month, year] = item.date_pt.split('-')
                        dateStr = `${year}-${month}-${day}`
                    }

                    const newDate = new Date(dateStr)
                    if (isNaN(newDate.getTime())) return // Skip invalid dates

                    const isCurrent = newDate.getMonth() === currentMonth && newDate.getFullYear() === currentYear
                    const isPrev = newDate.getMonth() === prevMonth && newDate.getFullYear() === prevYear

                    if (isCurrent || isPrev) {
                        const target = isCurrent ? currentTotals : prevTotals

                        const p = (Number(item.predicted) || 0)
                        const b = (Number(item.billed) || 0)
                        const r = (Number(item.received) || 0)
                        const t = (Number(item.taxes) || 0)
                        const o = (Number(item.others) || 0)

                        target.predicted += p
                        target.billed += b
                        target.received += r
                        target.taxes += t
                        target.others += o

                        if (isCurrent) {
                            chartAccumulators.predicted.push({ date: dateStr, value: p })
                            chartAccumulators.billed.push({ date: dateStr, value: b, received: r })
                            chartAccumulators.taxes.push({ date: dateStr, value: t })
                            chartAccumulators.others.push({ date: dateStr, value: o })
                        }
                    }
                })

                // Sort chart data by date
                Object.values(chartAccumulators).forEach(arr => arr.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()))

                // Calculates difference and trend
                const getStats = (key: keyof typeof currentTotals): StatData => {
                    const current = currentTotals[key]
                    const prev = prevTotals[key]
                    const diff = current - prev
                    const percent = prev === 0 ? (current === 0 ? 0 : 100) : ((diff / prev) * 100)

                    return {
                        value: current,
                        diff,
                        percent: Math.abs(percent),
                        trend: diff >= 0 ? 'up' : 'down',
                        chartData: chartAccumulators[key],
                        receivedValue: key === 'billed' ? currentTotals.received : undefined
                    }
                }

                setStats({
                    predicted: getStats('predicted'),
                    billed: getStats('billed'),
                    taxes: getStats('taxes'),
                    others: getStats('others'),
                })

            } catch (e) {
                console.error(e)
                setErrorInfo({
                    type: 'UNKNOWN',
                    details: `${DATA_FILE}: ${e instanceof Error ? e.message : String(e)}`
                })
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [])

    const formatCurrency = (value: number) => {
        return value.toLocaleString(Lang.config.locale || 'pt-PT', { style: 'currency', currency: 'EUR' })
    }

    const cards = [
        { key: 'predicted', label: Lang.data_type_labels.predicted },
        { key: 'billed', label: Lang.data_type_labels.billed },
        { key: 'taxes', label: Lang.data_type_labels.taxes },
        { key: 'others', label: Lang.data_type_labels.others },
    ]

    if (errorInfo) return (
        <ErrorState type={errorInfo.type} details={errorInfo.details} fileName={DATA_FILE} />
    )

    return (
        <div className="flex flex-wrap gap-6 | *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card">
            {cards.map((card) => {
                const stat = stats ? stats[card.key] : null
                const mainColor = CHART_COLORS[card.key as keyof typeof CHART_COLORS] || "currentColor"

                return (
                    <Card key={card.key} className="@container/card flex-1 gap-4 | min-w-full md:min-w-[45%] xl:min-w-[20%] | p-6 relative overflow-hidden">
                        {/* Fading Chart Background */}
                        {stat?.chartData && stat.chartData.length > 0 && (
                            <div className="absolute inset-x-0 bottom-0 h-14" style={{ maskImage: "linear-gradient(to right, transparent, black 40%)" }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={stat.chartData}>
                                        <defs>
                                            <linearGradient id={`gradient-${card.key}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor={mainColor} stopOpacity={0.5} />
                                                <stop offset="100%" stopColor={mainColor} stopOpacity={0} />
                                            </linearGradient>
                                            {card.key === 'billed' && (
                                                <linearGradient id="gradient-received" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor={CHART_COLORS.received} stopOpacity={0.5} />
                                                    <stop offset="100%" stopColor={CHART_COLORS.received} stopOpacity={0} />
                                                </linearGradient>
                                            )}
                                        </defs>
                                        <Tooltip
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const date = new Date(payload[0].payload.date);
                                                    return (
                                                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                                                            <div className="mb-1 text-[10px] uppercase text-muted-foreground font-semibold">
                                                                {date.toLocaleDateString(Lang.config.locale || 'pt-PT', { day: 'numeric', month: 'short' })}
                                                            </div>
                                                            <div className="flex flex-col gap-1">
                                                                {payload.map((entry: any, index: number) => (
                                                                    <div key={index} className="flex items-center gap-2">
                                                                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.stroke }} />
                                                                        <span className="text-xs font-bold">
                                                                            {formatCurrency(entry.value)}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )
                                                }
                                                return null;
                                            }}
                                            cursor={{ stroke: mainColor, strokeWidth: 1, strokeDasharray: "4 4", opacity: 0.5 }}
                                        />

                                        {/* Standard Chart Area */}
                                        <Area
                                            type="monotone"
                                            dataKey="value"
                                            stroke={mainColor}
                                            fill={`url(#gradient-${card.key})`}
                                            strokeWidth={2}
                                            isAnimationActive={true}
                                        />

                                        {/* Conditional Second Area for Billed (Received) */}
                                        {card.key === 'billed' && (
                                            <Area
                                                type="monotone"
                                                dataKey="received"
                                                stroke={CHART_COLORS.received}
                                                fill="url(#gradient-received)"
                                                strokeWidth={2}
                                                isAnimationActive={true}
                                            />
                                        )}
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        <CardHeader className="flex-row justify-between items-center relative z-10 pointer-events-none">
                            <CardDescription className="flex items-center gap-2">
                                <div className="size-2 rounded-[2px]" style={{ backgroundColor: mainColor }} />
                                {isLoading ? (
                                    <Skeleton className="h-5 w-16" />
                                ) : (
                                    card.label
                                )}
                            </CardDescription>

                            <CardAction>
                                {isLoading ? (
                                    <Skeleton className="h-5 w-16" />
                                ) : (
                                    <Badge variant="outline">
                                        {stat?.trend === 'up' ? <IconTrendingUp /> : <IconTrendingDown />}
                                        {stat?.trend === 'down' && '-'}
                                        {stat?.percent.toFixed(1)}%
                                    </Badge>
                                )}
                            </CardAction>
                        </CardHeader>

                        <CardTitle className="text-3xl font-bold relative z-10 pointer-events-none">
                            {isLoading ? (
                                <Skeleton className="h-8 w-32" />
                            ) : (
                                card.key === 'billed' ? (
                                    <div className="flex items-baseline gap-2">
                                        <span>{stat ? formatCurrency(stat.value) : "0.00€"}</span>
                                        <span className="text-xl text-muted-foreground font-medium">{stat?.receivedValue !== undefined ? formatCurrency(stat.receivedValue) : ""}</span>
                                    </div>
                                ) : (
                                    stat ? formatCurrency(stat.value) : "0.00€"
                                )
                            )}
                        </CardTitle>

                        <CardFooter className="relative z-10 pointer-events-none">
                            {isLoading ? (
                                <Skeleton className="h-4 w-40" />
                            ) : (
                                <div className="flex gap-2 | text-sm">
                                    {stat && (stat.diff >= 0 ? '+' : '')}{stat ? formatCurrency(stat.diff) : "0.00€"} {Lang.time_range.month.toLowerCase()}
                                    {stat?.trend === 'up' ? <IconTrendingUp className="size-4" /> : <IconTrendingDown className="size-4" />}
                                </div>
                            )}
                        </CardFooter>
                    </Card>
                )
            })}
        </div>
    )
}
