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

import { Skeleton } from "@/components/ui/skeleton"
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { ErrorState } from "@/components/error-state"
import { useLanguage } from "@/components/language-provider"
import { PRISM } from "@/lib/PRISM"
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

const PALETTES: Record<StatKey, { accent: string; iconBg: string; iconBgHover: string }> = {
    income:   { accent: "#16a34a", iconBg: "rgba(22,163,74,0.08)",  iconBgHover: "rgba(22,163,74,0.14)"  },
    expenses: { accent: "#dc2626", iconBg: "rgba(220,38,38,0.08)",  iconBgHover: "rgba(220,38,38,0.14)"  },
    savings:  { accent: "#2563eb", iconBg: "rgba(37,99,235,0.08)",  iconBgHover: "rgba(37,99,235,0.14)"  },
    balance:  { accent: "#8b5cf6", iconBg: "rgba(139,92,246,0.08)", iconBgHover: "rgba(139,92,246,0.14)" },
}

const ICONS: Record<StatKey, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
    income:   ArrowUpRight,
    expenses: ArrowDownRight,
    savings:  PiggyBank,
    balance:  Landmark,
}

const SECTION_CARD_SURFACE_CLASS = cn(
    "group relative overflow-hidden rounded-2xl p-5 transition-all duration-200",
    PRISM.cardSurface,
    PRISM.cardHover,
)

interface SectionCardsProps {
    data?: FinanceData | null
    isLoading?: boolean
    variant?: "default" | "dashboard"
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

export function SectionCards({ data: externalData, isLoading: externalLoading, variant = "default" }: SectionCardsProps = {}) {
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
        { key: "income",   label: t.data_type_labels?.income   || "Income"   },
        { key: "expenses", label: t.data_type_labels?.expenses || "Expenses" },
        { key: "savings",  label: t.data_type_labels?.savings  || "Savings"  },
        { key: "balance",  label: t.data_type_labels?.balance  || "Balance"  },
    ], [t.data_type_labels])

    const isDashboard = variant === "dashboard"

    const gridClassName = isDashboard
        ? "grid h-full auto-rows-fr grid-cols-2 gap-0 md:grid-cols-4"
        : "grid grid-cols-1 @[380px]/main:grid-cols-2 @[900px]/main:grid-cols-4 gap-4"

    const cardClassName = cn(
        isDashboard
            ? "group relative flex h-full min-h-24 flex-col justify-between overflow-hidden rounded-none bg-transparent p-3 transition-colors duration-150 hover:bg-black/[0.025] dark:hover:bg-white/[0.04]"
            : SECTION_CARD_SURFACE_CLASS,
    )

    if (errorInfo) return <ErrorState type={errorInfo.type} details={errorInfo.details} />

    // — Loading skeletons —
    if (!stats || externalLoading) {
        return (
            <div className={gridClassName}>
                {[0, 1, 2, 3].map(i => (
                    <div key={i} className="relative">
                        {isDashboard && i < 3 && (
                            <span
                                aria-hidden
                                className={cn(
                                    PRISM.separatorVertical,
                                    "pointer-events-none absolute -right-px top-3 bottom-3 z-10",
                                    i === 1 && "hidden md:block",
                                )}
                            />
                        )}
                        <div className={cardClassName}>
                            <div className={cn("flex items-center gap-2.5 mb-4", isDashboard && "mb-2")}>
                                <Skeleton className="size-8 rounded-lg" />
                                <Skeleton className="h-4 w-16" />
                            </div>
                            <Skeleton className="h-7 w-28" />
                            <Skeleton className="h-3 w-24 mt-2" />
                            <div className={cn("mt-4 flex items-center justify-between", isDashboard && "mt-3")}>
                                <Skeleton className="h-5 w-20 rounded-md" />
                                <Skeleton className="h-6 w-12" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className={gridClassName}>
            {cards.map(({ key, label }, index) => {
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
                    ? `${PRISM.destructiveText} bg-red-500/10 dark:bg-red-500/15`
                    : "text-neutral-400 bg-muted/60"

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
                            <div className="relative h-full">
                                {isDashboard && index < 3 && (
                                    <span
                                        aria-hidden
                                        className={cn(
                                            PRISM.separatorVertical,
                                            "pointer-events-none absolute -right-px top-3 bottom-3 z-10",
                                            index === 1 && "hidden md:block",
                                        )}
                                    />
                                )}
                                <div className={cardClassName}>
                                    <div className={cn("flex items-center gap-2.5 mb-4", isDashboard && "mb-3")}>
                                        <div
                                            className={cn("flex size-8 items-center justify-center rounded-lg transition-colors duration-200", isDashboard && "size-7 rounded-lg")}
                                            style={{ backgroundColor: palette.iconBg, color: palette.accent }}
                                        >
                                            <Icon className={cn("size-4", isDashboard && "size-3.5")} style={{ strokeWidth: 2 }} />
                                        </div>
                                        <span className="truncate text-[12px] font-medium text-neutral-400">
                                            {label}
                                        </span>
                                    </div>

                                    <div>
                                        <p className={cn("truncate text-2xl font-bold leading-none tracking-tight text-foreground tabular-nums", isDashboard && "text-[1.25rem]")}>
                                            {formattedValue}
                                        </p>
                                        {diffLabel && (
                                            <p className={cn("text-[11px] mt-1.5 tabular-nums text-neutral-400/60", isDashboard && "mt-1")}>
                                                {diffLabel} {isPt ? "vs mês anterior" : "vs last month"}
                                            </p>
                                        )}
                                    </div>

                                    <div className={cn("mt-4 flex items-center justify-between gap-3", isDashboard && "mt-2")}>
                                        <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums", toneClasses)}>
                                            <TrendIcon className="size-3" />
                                            {changeLabel}
                                        </span>
                                        <Sparkline trend={stat.trend} color={palette.accent} />
                                    </div>
                                </div>
                            </div>
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
