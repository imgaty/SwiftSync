"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface GrowthData {
    date: string
    signups: number
    total: number
}

interface UserGrowthChartProps {
    data: GrowthData[]
}

const chartConfig = {
    total: {
        label: "Total users",
        color: "hsl(var(--primary))",
    },
    signups: {
        label: "New signups",
        color: "hsl(var(--chart-2))",
    },
} satisfies ChartConfig

export function UserGrowthChart({ data }: UserGrowthChartProps) {
    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                No data available
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
                    className="text-muted-foreground"
                    interval="preserveStartEnd"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                />
                <YAxis
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
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
