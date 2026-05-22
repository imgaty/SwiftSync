"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useLanguage } from "@/components/language-provider"

interface GrowthData {
    date: string
    signups: number
    total: number
}

interface UserGrowthChartProps {
    data: GrowthData[]
}

function getChartConfig(ac: Record<string, string>): ChartConfig {
    return {
        total: {
            label: ac.total_users || "Total users",
            color: "hsl(var(--primary))",
        },
        signups: {
            label: ac.new_signups || "New signups",
            color: "hsl(var(--chart-2))",
        },
    }
}

export function UserGrowthChart({ data }: UserGrowthChartProps) {
    const { t } = useLanguage()
    const a = (t as any).admin || {} as Record<string, any>
    const ac = a.chart || {} as Record<string, string>
    const chartConfig = getChartConfig(ac)

    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-[200px] text-sm text-neutral-400">
                {a.no_data || "No data available"}
            </div>
        )
    }

    return (
        <ChartContainer config={chartConfig} className="h-60 w-full">
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <defs>
                    <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-total)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="var(--color-total)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="signupsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-signups)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--color-signups)" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                    dataKey="date"
                    tickFormatter={(v: string) => {
                        const d = new Date(v)
                        return `${d.getDate()}/${d.getMonth() + 1}`
                    }}
                    tick={{ fontSize: 11 }}
                    className="text-neutral-400"
                    interval="preserveStartEnd"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                />
                <YAxis
                    tick={{ fontSize: 11 }}
                    className="text-neutral-400"
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    tickMargin={10}
                />
                <ChartTooltip
                    cursor={false}
                    content={
                        <ChartTooltipContent
                            indicator="dot"
                            labelFormatter={(label) =>
                                new Date(String(label)).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                })
                            }
                        />
                    }
                />
                <Area
                    type="monotone"
                    dataKey="total"
                    stroke="var(--color-total)"
                    strokeWidth={2}
                    fill="url(#totalGradient)"
                />
                <Area
                    type="monotone"
                    dataKey="signups"
                    stroke="var(--color-signups)"
                    strokeWidth={1.5}
                    fill="url(#signupsGradient)"
                />
            </AreaChart>
        </ChartContainer>
    )
}
