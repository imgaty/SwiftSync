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
import Link from "next/link"
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
import { Skeleton } from "@/components/ui/skeleton"
import { SmartTooltip } from "@/components/ui/tooltip"
import { useLanguage } from "@/components/language-provider"
import { useCurrency } from "@/components/currency-provider"
import { UDS } from "@/lib/UDS"
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
type CardTone = keyof typeof UDS.statCardTone
type TrendTone = "positive" | "negative" | "neutral"

const DASHBOARD_STAT_TONE_STYLES: Record<CardTone, {
    card: string
    glow: string
    icon: string
    meta: string
    spot: string
    value: string
}> = {
    positive: {
        ...UDS.statCardTone.positive,
        spot: "bg-[radial-gradient(ellipse_at_82%_16%,rgba(16,185,129,0.20),transparent_62%)] dark:bg-[radial-gradient(ellipse_at_82%_16%,rgba(52,211,153,0.18),transparent_62%)]",
    },
    negative: {
        ...UDS.statCardTone.negative,
        spot: "bg-[radial-gradient(ellipse_at_82%_16%,rgba(239,68,68,0.18),transparent_62%)] dark:bg-[radial-gradient(ellipse_at_82%_16%,rgba(248,113,113,0.16),transparent_62%)]",
    },
    accent: {
        ...UDS.statCardTone.accent,
        spot: "bg-[radial-gradient(ellipse_at_82%_16%,rgba(139,92,246,0.20),transparent_62%)] dark:bg-[radial-gradient(ellipse_at_82%_16%,rgba(167,139,250,0.18),transparent_62%)]",
    },
    info: {
        ...UDS.statCardTone.info,
        spot: "bg-[radial-gradient(ellipse_at_82%_16%,rgba(37,99,235,0.18),transparent_62%)] dark:bg-[radial-gradient(ellipse_at_82%_16%,rgba(96,165,250,0.16),transparent_62%)]",
    },
    warning: {
        ...UDS.statCardTone.warning,
        spot: "bg-[radial-gradient(ellipse_at_82%_16%,rgba(245,158,11,0.18),transparent_62%)] dark:bg-[radial-gradient(ellipse_at_82%_16%,rgba(251,191,36,0.16),transparent_62%)]",
    },
    neutral: {
        ...UDS.statCardTone.neutral,
        spot: "bg-[radial-gradient(ellipse_at_82%_16%,rgba(115,115,115,0.12),transparent_62%)] dark:bg-[radial-gradient(ellipse_at_82%_16%,rgba(212,212,212,0.08),transparent_62%)]",
    },
}

const PALETTES: Record<StatKey, { accent: string }> = {
    income:   { accent: "#16a34a" },
    expenses: { accent: "#dc2626" },
    savings:  { accent: "#2563eb" },
    balance:  { accent: "#8b5cf6" },
}

const DASHBOARD_STAT_CARD_TONES: Record<StatKey, CardTone> = {
    balance: "accent",
    income: "positive",
    expenses: "negative",
    savings: "info",
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
                    className="w-1 sq-full transition-all duration-500"
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

function DashboardStatCardSkeleton() {
    return (
        <div
            className={cn(
                UDS.cardSurface,
                "relative flex h-full min-h-[132px] flex-col justify-between overflow-hidden p-4",
            )}
        >
            <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                    <Skeleton className="size-5 shrink-0 sq-md" />
                    <Skeleton className="h-4 w-24 max-w-full" />
                </div>
                <Skeleton className="size-4 shrink-0 sq-md" />
            </div>
            <div className="flex min-w-0 items-end justify-between gap-4">
                <Skeleton className="h-4 w-28 max-w-full" />
                <Skeleton className="h-8 w-20 shrink-0" />
            </div>
        </div>
    )
}

function DashboardStatCard({
    changeLabel,
    detail,
    href,
    icon: Icon,
    label,
    tone,
    value,
    statKey,
}: {
    changeLabel: string
    detail: string
    href: string
    icon: React.ComponentType<{ className?: string }>
    label: string
    tone: CardTone
    value: string
    statKey: StatKey
}) {
    const toneStyles = DASHBOARD_STAT_TONE_STYLES[tone]
    const tooltipLabel = `${label}: ${changeLabel} - ${detail}`

    return (
        <SmartTooltip text={tooltipLabel} group="dashboard-stat-cards" forceSide="bottom">
            <Link
                href={href}
                aria-label={`${label}: ${value}, ${changeLabel} - ${detail}`}
                className={cn(
                    UDS.cardSurface,
                    "group relative flex h-full min-h-[132px] min-w-0 flex-col justify-between overflow-hidden p-4",
                    "text-foreground outline-none",
                    "focus-visible:ring-2 focus-visible:ring-focus/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    toneStyles.card,
                )}
                data-dashboard-stat-card={statKey}
                data-dashboard-stat-tone={tone}
            >
                <span aria-hidden className={cn("pointer-events-none absolute inset-0", toneStyles.spot)} />
                <span aria-hidden className={cn("pointer-events-none absolute inset-0 opacity-80", toneStyles.glow)} />
                <span className="relative flex min-w-0 items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2.5">
                        <Icon className={cn("size-4 shrink-0 stroke-[1.9]", toneStyles.icon)} />
                        <span className="truncate text-[15px] font-medium leading-5 text-foreground-secondary sm:text-[16px]">
                            {label}
                        </span>
                    </span>
                    <ArrowUpRight className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
                </span>

                <span className="relative flex min-w-0 items-end justify-between gap-2">
                    <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium leading-5 text-muted-foreground">
                            {detail}
                        </span>
                        <span className={cn("mt-1 block truncate text-[11px] font-semibold leading-4 tabular-nums", toneStyles.meta)}>
                            {changeLabel}
                        </span>
                    </span>
                    <span className={cn("shrink-0 text-right text-[1.6rem] font-semibold leading-none tracking-normal tabular-nums sm:text-[1.7rem]", toneStyles.value)}>
                        {value}
                    </span>
                </span>
            </Link>
        </SmartTooltip>
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
        ? "grid grid-cols-2 gap-4 @[1120px]/overview:grid-cols-4"
        : "grid grid-cols-1 @[380px]/main:grid-cols-2 @[900px]/main:grid-cols-4 gap-4"

    const cardClassName = cn(
        "h-full min-h-[112px]",
        isDashboard && "min-h-[118px] gap-3 p-3.5",
    )

    if (errorInfo) return <ErrorState type={errorInfo.type} details={errorInfo.details} />

    // — Loading skeletons —
    if (!stats || externalLoading) {
        return (
            <div className={cn(gridClassName, className)}>
                {[0, 1, 2, 3].map(i => (
                    <div key={i} className="relative h-full">
                        {isDashboard ? (
                            <DashboardStatCardSkeleton />
                        ) : (
                            <DashboardMetricCardSkeleton className={cardClassName} />
                        )}
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

                const tone: TrendTone =
                    stat.trend === "neutral" ? "neutral"
                    : key === "expenses" ? (stat.trend === "down" ? "positive" : "negative")
                    : (stat.trend === "up" ? "positive" : "negative")
                const dashboardTone = DASHBOARD_STAT_CARD_TONES[key]

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
                    : cn("text-neutral-400", UDS.pillSurface)

                const formattedValue = formatCurrency(stat.value)
                const isPt = (t.config?.locale || "en-US").startsWith("pt")
                const dashboardDetail = key === "balance"
                    ? (isPt ? "Atual" : "Current")
                    : (isPt ? "Este mês" : "this month")
                const href = key === "balance" ? "/Accounts" : "/Transactions"

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
	                            {isDashboard ? (
                                <DashboardStatCard
                                    changeLabel={changeLabel}
                                    detail={dashboardDetail}
                                    href={href}
                                    icon={Icon}
                                    label={label}
                                    tone={dashboardTone}
                                    value={formattedValue}
                                    statKey={key}
                                />
	                            ) : (
	                                <DashboardMetricCard
                                    icon={Icon}
                                    label={label}
                                    value={formattedValue}
                                    detail={diffLabel ? `${diffLabel} ${isPt ? "vs mês anterior" : "vs last month"}` : undefined}
                                    tone={tone}
                                    valueClassName="text-2xl"
                                    className={cardClassName}
                                    action={<Sparkline trend={stat.trend} color={palette.accent} />}
                                    footer={(
                                        <span className={cn("inline-flex items-center gap-1 sq-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums", toneClasses)}>
                                            <TrendIcon className="size-3" />
                                            {changeLabel}
                                        </span>
                                    )}
                                />
                            )}
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
                                <a href={href}>
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
