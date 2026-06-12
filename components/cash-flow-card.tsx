//
//  cash-flow-card.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Implements the Cash flow card React component for Argent, encapsulating reusable
//  interface structure, state handling, and presentation logic for feature screens.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { EmptyState } from "@/components/empty-state"
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { TrendingUp, AlertTriangle, ClipboardCopy, RefreshCw } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { useCurrency } from "@/components/currency-provider"
import { getTranslations } from "@/lib/translation-utils"
import { UDS } from "@/lib/UDS"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface CashFlowProjection {
    date: string
    projected: number
    income: number
    expenses: number
    net: number
}

interface CashFlowData {
    currentBalance: number
    avgIncome: number
    avgExpenses: number
    recurringCosts: number
    monthlyNet: number
    projectedBalanceEndOfYear: number
    projections: CashFlowProjection[]
}

interface CashFlowCardProps {
    accountIds?: string[]
    compact?: boolean
}

export function CashFlowCard({ accountIds, compact = false }: CashFlowCardProps) {
    const { t } = useLanguage()
    const { formatCurrency } = useCurrency()
    const [data, setData] = React.useState<CashFlowData | null>(null)
    const [isLoading, setIsLoading] = React.useState(true)
    const shellClassName = compact
        ? "flex h-full min-h-[280px] flex-col overflow-hidden bg-transparent"
        : cn("overflow-hidden sq-big", UDS.cardSurface)

    const buildUrl = React.useCallback(() => {
        const params = new URLSearchParams({ months: compact ? "4" : "6" })
        if (accountIds && accountIds.length > 0) {
            params.set("accountIds", accountIds.join(","))
        }
        return `/api/cashflow?${params}`
    }, [accountIds, compact])

    React.useEffect(() => {
        let cancelled = false
        async function fetchCashFlow() {
            setIsLoading(true)
            try {
                const res = await fetch(buildUrl())
                if (res.ok && !cancelled) {
                    setData(await res.json())
                }
            } catch (err) {
                console.error("Failed to fetch cash flow:", err)
            } finally {
                if (!cancelled) setIsLoading(false)
            }
        }
        fetchCashFlow()
        return () => { cancelled = true }
    }, [buildUrl])

    if (isLoading) {
        return (
            <div className={shellClassName}>
                <div className={cn(compact ? "p-4 pb-3" : "p-5 pb-4")}>
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2.5">
                            <Skeleton className="size-8 sq-lg" />
                            <div className="space-y-1.5">
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="h-3 w-52" />
                            </div>
                        </div>
                        <div className="text-right space-y-1.5">
                            <Skeleton className="h-3 w-20 ml-auto" />
                            <Skeleton className="h-7 w-28" />
                        </div>
                    </div>
                </div>
                <div className={cn(compact ? "min-h-0 flex-1 space-y-3.5 overflow-auto px-4 pb-4" : "px-5 pb-5 space-y-5")}>
                    <div className="grid grid-cols-2 gap-4 @[640px]/main:grid-cols-4">
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} className="space-y-1.5">
                                <Skeleton className="h-3 w-16" />
                                <Skeleton className="h-5 w-24" />
                            </div>
                        ))}
                    </div>
                    <div className="space-y-2">
                        {[0, 1, 2, 3, 4].map(i => (
                            <div key={i} className="flex items-center gap-3">
                                <Skeleton className="h-3 w-16" />
                                <Skeleton className="flex-1 h-7 sq-lg" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    const copy = getTranslations(t, "cash_flow_card")
    const locale = t.config?.locale || "en-US"

    if (!data) {
        return (
            <div className={shellClassName}>
                <EmptyState
                    variant="no-data"
                    placement={compact ? "card" : "section"}
                    title={copy.empty_title || "Nothing to show here yet"}
                    description={copy.empty_description || "The forecast appears once there is enough financial history."}
                    className="h-full min-h-[220px]"
                />
            </div>
        )
    }

    const projectionRows = compact ? data.projections.slice(0, 4) : data.projections

    const isPositiveNet = data.monthlyNet >= 0
    const fmt = (n: number) => formatCurrency(n)

    const handleCopySummary = () => {
        const summary = [
            `${copy.avg_income || "Avg. Income"}: ${fmt(data.avgIncome)}`,
            `${copy.avg_expenses || "Avg. Expenses"}: ${fmt(data.avgExpenses)}`,
            `${copy.recurring || "Recurring"}: ${fmt(data.recurringCosts)}`,
            `${copy.monthly_net || "Monthly Net"}: ${isPositiveNet ? "+" : ""}${fmt(data.monthlyNet)}`,
        ].join("\n")
        navigator.clipboard.writeText(summary)
        toast.success(copy.summary_copied || "Summary copied")
    }

    const handleRefresh = () => {
        setIsLoading(true)
        setData(null)
        fetch(buildUrl())
            .then(res => res.ok ? res.json() : null)
            .then(json => { if (json) setData(json) })
            .catch(() => {})
            .finally(() => setIsLoading(false))
    }

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <div className={shellClassName}>
            <div className={cn(compact ? "p-4 pb-3" : "p-5 pb-4")}>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center justify-center size-8 sq-lg bg-primary/8 text-primary">
                            <TrendingUp className="size-4" />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold leading-tight">
                                {copy.title || "Cash Flow Forecast"}
                            </h3>
                            <p className="text-xs text-neutral-400">
                                {(copy.projection_description || "{months}-month projection based on history").replace("{months}", String(compact ? 4 : 6))}
                            </p>
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-xs font-semibold tracking-wide text-neutral-400 mb-0.5">
                            {copy.current_balance || "Current Balance"}
                        </p>
                        <p className={cn("font-bold tracking-tight tabular-nums", compact ? "text-xl" : "text-2xl")}>{fmt(data.currentBalance)}</p>
                    </div>
                </div>
            </div>
            <div className={cn(compact ? "min-h-0 flex-1 space-y-3.5 overflow-auto px-4 pb-4" : "px-5 pb-5 space-y-5")}>
                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-4 @[640px]/main:grid-cols-4">
                    <div className="space-y-1">
                        <p className="text-xs font-semibold tracking-wide text-neutral-400">
                            {copy.avg_income || "Avg. Income"}
                        </p>
                        <p className={cn("font-bold tabular-nums text-emerald-600 dark:text-emerald-400", compact ? "text-base" : "text-lg")}>{fmt(data.avgIncome)}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-semibold tracking-wide text-neutral-400">
                            {copy.avg_expenses || "Avg. Expenses"}
                        </p>
                        <p className={cn("font-bold tabular-nums text-red-600 dark:text-red-400", compact ? "text-base" : "text-lg")}>{fmt(data.avgExpenses)}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-semibold tracking-wide text-neutral-400">
                            {copy.recurring || "Recurring"}
                        </p>
                        <p className={cn("font-bold tabular-nums", compact ? "text-base" : "text-lg")}>{fmt(data.recurringCosts)}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-semibold tracking-wide text-neutral-400">
                            {copy.monthly_net || "Monthly Net"}
                        </p>
                        <p className={cn(
                            "font-bold tabular-nums",
                            compact ? "text-base" : "text-lg",
                            isPositiveNet ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
                        )}>
                            {isPositiveNet ? "+" : ""}{fmt(data.monthlyNet)}
                        </p>
                    </div>
                </div>

                {/* Warning if negative */}
                {!isPositiveNet && !compact && (
                    <Alert variant="destructive" className="sq-normal border-destructive/20 bg-destructive/5">
                        <AlertTriangle className="size-4" />
                        <AlertDescription>
                            {copy.negative_warning || "Warning: Your expenses exceed your income. Consider reviewing your budget."}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Projection Timeline */}
                <div>
                    <h4 className={cn("text-sm font-semibold", compact ? "mb-2" : "mb-3")}>
                        {copy.projected_balance || "Projected Balance"}
                    </h4>
                    {(() => {
                        const maxBalance = Math.max(
                            Math.abs(data.currentBalance),
                            ...data.projections.map((pp) => Math.abs(pp.projected))
                        )

                        const currentBarWidth = maxBalance > 0 ? (Math.abs(data.currentBalance) / maxBalance) * 100 : 0
                        const currentNegative = data.currentBalance < 0

                        return (
                            <div className="space-y-2">
                                {/* Current balance baseline row */}
                                <div className="flex items-center gap-3 group/bar">
                                    <span className="text-xs font-semibold text-foreground w-16 shrink-0">
                                        {copy.now || "Now"}
                                    </span>
                                    <div className={cn("flex-1 sq-lg overflow-hidden", UDS.subtleFill, compact ? "h-6" : "h-7")}>
                                        <div
                                            className={`h-full sq-lg transition-all duration-500 ${currentNegative ? "bg-destructive/60" : "bg-primary/60"}`}
                                            style={{ width: `${Math.min(100, currentBarWidth)}%` }}
                                        />
                                    </div>
                                    <span className={`text-xs font-bold w-24 text-right tabular-nums ${currentNegative ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                                        {fmt(data.currentBalance)}
                                    </span>
                                </div>

                                {/* Projected months */}
                                {projectionRows.map((p) => {
                                    const date = new Date(p.date)
                                    const monthName = date.toLocaleDateString(locale, { month: "short", year: "numeric" })
                                    const isNegative = p.projected < 0
                                    const barWidth = maxBalance > 0 ? (Math.abs(p.projected) / maxBalance) * 100 : 0

                                    return (
                                        <div key={p.date} className="flex items-center gap-3 group/bar">
                                            <span className="text-xs font-medium text-neutral-400 w-16 shrink-0">{monthName}</span>
                                            <div className={cn("flex-1 sq-lg overflow-hidden", UDS.subtleFill, compact ? "h-6" : "h-7")}>
                                                <div
                                                    className={`h-full sq-lg transition-all duration-500 ${isNegative ? "bg-destructive/40 group-hover/bar:bg-destructive/60" : "bg-primary/40 group-hover/bar:bg-primary/60"}`}
                                                    style={{ width: `${Math.min(100, barWidth)}%` }}
                                                />
                                            </div>
                                            <span className={`text-xs font-semibold w-24 text-right tabular-nums ${isNegative ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                                                {fmt(p.projected)}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        )
                    })()}
                </div>
            </div>
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent>

                <ContextMenuItem onClick={handleCopySummary}>
                    <ClipboardCopy />
                    {copy.copy_summary || "Copy summary"}
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={handleRefresh}>
                    <RefreshCw />
                    {copy.refresh_forecast || "Refresh forecast"}
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    )
}
