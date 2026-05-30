//
//  section-cards.tsx
//  Argent
//
//  Created by Hilario Ferreira on 08 December 2025 at 19:38.
//  Description: Implements the Section cards React component for Argent, encapsulating reusable
//  interface structure, state handling, and presentation logic for feature screens.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import {
    ArrowDownRight,
    ArrowUpRight,
    ClipboardCopy,
    Eye,
    Landmark,
    Minus,
    PiggyBank,
    TrendingDown,
    TrendingUp,
} from "lucide-react"

import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
    DashboardMetricCard,
    DashboardMetricCardSkeleton,
} from "@/components/dashboard/dashboard-primitives"
import { ErrorState } from "@/components/error-state"
import { useLanguage } from "@/components/language-provider"
import { useCurrency } from "@/components/currency-provider"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { FinanceData } from "@/lib/types"


// ==============================================================================
// CONFIG & TYPES
// ==============================================================================

interface StatData {
    value: number
    diff: number
    percent: number
    trend: "up" | "down" | "neutral"
}

type StatKey = "income" | "expenses" | "savings" | "balance"
type CardTone = "positive" | "negative" | "neutral"

const PALETTES: Record<StatKey, { accent: string }> = {
    income:   { accent: "#16a34a" },
    expenses: { accent: "#dc2626" },
    savings:  { accent: "#2563eb" },
    balance:  { accent: "#8b5cf6" },
}

const ICONS: Record<StatKey, React.ComponentType<{ className?: string }>> = {
    income:   ArrowUpRight,
    expenses: ArrowDownRight,
    savings:  PiggyBank,
    balance:  Landmark,
}

interface SectionCardsProps {
    data?: FinanceData | null
    isLoading?: boolean
    variant?: "default" | "dashboard"
    className?: string
}


// ==============================================================================
// SPARKLINE — Tiny decorative bar chart
// ==============================================================================

function Sparkline({ trend, color }: { trend: "up" | "down" | "neutral"; color: string }) {
    const bars = React.useMemo(() => {
        if (trend === "up")      return [0.3, 0.45, 0.35, 0.55, 0.5, 0.7, 0.85]
        if (trend === "down")    return [0.85, 0.7, 0.6, 0.55, 0.45, 0.35, 0.3]
        return                          [0.5, 0.55, 0.48, 0.52, 0.5, 0.53, 0.49]
    }, [trend])

    return (
        <div className="flex items-end gap-[3px] h-7">
            {bars.map((h, i) => (
                <div
                    key={i}
                    className="w-1 rounded-full transition-all duration-500"
                    style={{
                        height: `${h * 100}%`,
                        backgroundColor: color,
                        opacity: 0.2 + (i / bars.length) * 0.55,
                    }}
                />
            ))}
        </div>
    )
}


// ==============================================================================
// STAT COMPUTATION
// ==============================================================================

function computeStats(data: FinanceData): Record<StatKey, StatData> {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear

    const current = { income: 0, expenses: 0 }
    const prev = { income: 0, expenses: 0 }

    for (const tx of data.transactions) {
        const date = new Date(tx.date)
        if (isNaN(date.getTime())) continue

        const month = date.getMonth()
        const year = date.getFullYear()

        if (year === currentYear && month === currentMonth) {
            if (tx.type === "in") current.income += tx.amount
            else current.expenses += tx.amount
        } else if (year === prevYear && month === prevMonth) {
            if (tx.type === "in") prev.income += tx.amount
            else prev.expenses += tx.amount
        }
    }

    const currentSavings = current.income - current.expenses
    const prevSavings = prev.income - prev.expenses
    const totalBalance = data.accounts.reduce((sum: number, acc: { balance: number }) => sum + acc.balance, 0)
    const prevBalance = totalBalance - currentSavings

    const calc = (cur: number, prv: number): StatData => {
        const diff = cur - prv
        const percent = prv === 0 ? (cur === 0 ? 0 : 100) : (diff / prv) * 100
        return { value: cur, diff, percent: Math.abs(percent), trend: diff === 0 ? "neutral" : diff > 0 ? "up" : "down" }
    }

    return {
        income: calc(current.income, prev.income),
        expenses: calc(current.expenses, prev.expenses),
        savings: calc(currentSavings, prevSavings),
        balance: {
            value: totalBalance,
            diff: currentSavings,
            percent: prevBalance === 0 ? 0 : Math.abs((currentSavings / prevBalance) * 100),
            trend: currentSavings === 0 ? "neutral" : currentSavings > 0 ? "up" : "down",
        },
    }
}


// ==============================================================================
// MAIN COMPONENT
// ==============================================================================

export function SectionCards({ data: externalData, isLoading: externalLoading, variant = "default", className }: SectionCardsProps = {}) {
    const { t } = useLanguage()
    const { formatCurrency } = useCurrency()
    const [stats, setStats] = React.useState<Record<StatKey, StatData> | null>(null)
    const [errorInfo] = React.useState<{ type: "EMPTY_DATA" | "UNKNOWN"; details?: string } | null>(null)

    React.useEffect(() => {
        if (externalLoading) return
        if (!externalData) {
            setStats({
                income:   { value: 0, diff: 0, percent: 0, trend: "neutral" },
                expenses: { value: 0, diff: 0, percent: 0, trend: "neutral" },
                savings:  { value: 0, diff: 0, percent: 0, trend: "neutral" },
                balance:  { value: 0, diff: 0, percent: 0, trend: "neutral" },
            })
            return
        }
        setStats(computeStats(externalData))
    }, [externalData, externalLoading])

    const cards: { key: StatKey; label: string }[] = React.useMemo(() => [
        { key: "balance",  label: t.data_type_labels?.balance  || "Balance"  },
        { key: "income",   label: t.data_type_labels?.income   || "Income"   },
        { key: "expenses", label: t.data_type_labels?.expenses || "Expenses" },
        { key: "savings",  label: t.data_type_labels?.savings  || "Savings"  },
    ], [t.data_type_labels])

    const isDashboard = variant === "dashboard"

    const gridClassName = isDashboard
        ? "grid grid-cols-2 gap-4 @[1320px]/overview:grid-cols-4"
        : "grid grid-cols-1 @[380px]/main:grid-cols-2 @[900px]/main:grid-cols-4 gap-4"

    const cardClassName = cn("h-full min-h-[112px]", isDashboard && "min-h-[124px]")

    if (errorInfo) return <ErrorState type={errorInfo.type} details={errorInfo.details} />

    // — Loading skeletons —
    if (!stats || externalLoading) {
        return (
            <div className={cn(gridClassName, className)}>
                {[0, 1, 2, 3].map(i => (
                    <div key={i} className="relative h-full">
                        <DashboardMetricCardSkeleton className={cardClassName} />
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className={cn(gridClassName, className)}>
            {cards.map(({ key, label }) => {
                const stat = stats[key]
                const palette = PALETTES[key]
                const Icon = ICONS[key]

                const tone: CardTone =
                    stat.trend === "neutral" ? "neutral"
                    : key === "expenses" ? (stat.trend === "down" ? "positive" : "negative")
                    : (stat.trend === "up" ? "positive" : "negative")

                const TrendIcon = stat.trend === "up" ? TrendingUp : stat.trend === "down" ? TrendingDown : Minus

                const changeLabel = stat.trend === "neutral"
                    ? ((t.config?.locale || "en-US").startsWith("pt") ? "Sem alterações" : "No change")
                    : `${stat.trend === "up" ? "+" : "-"}${stat.percent.toFixed(1)}%`

                const diffLabel = stat.trend !== "neutral"
                    ? `${stat.diff >= 0 ? "+" : ""}${formatCurrency(stat.diff)}`
                    : null

                const toneClasses = tone === "positive"
                    ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/15"
                    : tone === "negative"
                    ? "text-red-600 dark:text-red-400 bg-red-500/10 dark:bg-red-500/15"
                    : "text-neutral-400 bg-muted/60"

                const dashboardToneClasses = tone === "positive"
                    ? "text-emerald-400"
                    : tone === "negative"
                    ? "text-red-400"
                    : "text-muted-foreground"

                const formattedValue = formatCurrency(stat.value)
                const isPt = (t.config?.locale || "en-US").startsWith("pt")

                const handleCopyValue = () => {
                    navigator.clipboard.writeText(formattedValue)
                    toast.success(isPt ? "Valor copiado" : "Value copied")
                }

                const handleCopyChange = () => {
                    if (diffLabel) {
                        navigator.clipboard.writeText(`${diffLabel} (${changeLabel})`)
                        toast.success(isPt ? "Alteração copiada" : "Change copied")
                    }
                }

                return (
                    <ContextMenu key={key}>
                        <ContextMenuTrigger asChild>
                            <DashboardMetricCard
                                icon={Icon}
                                label={label}
                                value={formattedValue}
                                detail={diffLabel ? `${diffLabel} ${isPt ? "vs mês anterior" : "vs last month"}` : undefined}
                                tone={tone}
                                valueClassName={cn("text-foreground", isDashboard ? "text-[1.05rem] sm:text-[1.12rem] 2xl:text-[1.2rem]" : "text-2xl")}
                                className={cardClassName}
                                action={isDashboard ? (
                                    <span className={cn(
                                        "inline-flex items-center gap-1 font-semibold tabular-nums",
                                        "text-[12px]",
                                        dashboardToneClasses,
                                    )}>
                                        <TrendIcon className="size-3" />
                                        {changeLabel}
                                    </span>
                                ) : <Sparkline trend={stat.trend} color={palette.accent} />}
                                footer={!isDashboard && (
                                    <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums", toneClasses)}>
                                        <TrendIcon className="size-3" />
                                        {changeLabel}
                                    </span>
                                )}
                            />
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                            <ContextMenuItem onClick={handleCopyValue}>
                                <ClipboardCopy />
                                {isPt ? "Copiar valor" : "Copy value"}
                            </ContextMenuItem>
                            {diffLabel && (
                                <ContextMenuItem onClick={handleCopyChange}>
                                    <ClipboardCopy />
                                    {isPt ? "Copiar alteração" : "Copy change"}
                                </ContextMenuItem>
                            )}
                            <ContextMenuSeparator />
                            <ContextMenuItem asChild>
                                <a href={key === "balance" ? "/Accounts" : "/Transactions"}>
                                    <Eye />
                                    {isPt ? "Ver detalhes" : "View details"}
                                </a>
                            </ContextMenuItem>
                        </ContextMenuContent>
                    </ContextMenu>
                )
            })}
        </div>
    )
}
