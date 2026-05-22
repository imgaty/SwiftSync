"use client"

import * as React from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { PRISM } from "@/lib/PRISM"
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
    const { language } = useLanguage()
    const { formatCurrency } = useCurrency()
    const [data, setData] = React.useState<CashFlowData | null>(null)
    const [isLoading, setIsLoading] = React.useState(true)

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
            <div className={cn("overflow-hidden rounded-2xl", compact && "flex h-full min-h-0 flex-col", PRISM.cardSurface)}>
                <div className={cn(compact ? "p-4 pb-3" : "p-5 pb-4")}>
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2.5">
                            <Skeleton className="size-8 rounded-lg" />
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
                    <div className={cn("grid grid-cols-2 @[640px]/main:grid-cols-4", compact ? "gap-3" : "gap-4")}>
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
                                <Skeleton className="flex-1 h-7 rounded-lg" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (!data) return null

    const projectionRows = compact ? data.projections.slice(0, 4) : data.projections

    const isPositiveNet = data.monthlyNet >= 0
    const fmt = (n: number) => formatCurrency(n)
    const isPt = language === "pt"

    const handleCopySummary = () => {
        const summary = [
            `${isPt ? "Receita média" : "Avg. Income"}: ${fmt(data.avgIncome)}`,
            `${isPt ? "Despesa média" : "Avg. Expenses"}: ${fmt(data.avgExpenses)}`,
            `${isPt ? "Recorrentes" : "Recurring"}: ${fmt(data.recurringCosts)}`,
            `${isPt ? "Líquido mensal" : "Monthly Net"}: ${isPositiveNet ? "+" : ""}${fmt(data.monthlyNet)}`,
        ].join("\n")
        navigator.clipboard.writeText(summary)
        toast.success(isPt ? "Resumo copiado" : "Summary copied")
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
                <div className={cn("overflow-hidden rounded-2xl", compact && "flex h-full min-h-0 flex-col", PRISM.cardSurface)}>
            <div className={cn(compact ? "p-4 pb-3" : "p-5 pb-4")}>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center justify-center size-8 rounded-lg bg-primary/8 text-primary">
                            <TrendingUp className="size-4" />
                        </div>
                        <div>
                            <h3 className="text-[15px] font-semibold leading-tight">
                                {isPt ? "Previsão de Cash Flow" : "Cash Flow Forecast"}
                            </h3>
                            <p className="text-[12px] text-neutral-400">
                                {isPt
                                    ? `Projeção para os próximos ${compact ? 4 : 6} meses`
                                    : `${compact ? 4 : 6}-month projection based on history`}
                            </p>
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-[11px] font-semibold tracking-wide text-neutral-400 mb-0.5">
                            {isPt ? "Saldo atual" : "Current Balance"}
                        </p>
                        <p className={cn("font-bold tracking-tight tabular-nums", compact ? "text-xl" : "text-2xl")}>{fmt(data.currentBalance)}</p>
                    </div>
                </div>
            </div>
            <div className={cn(compact ? "min-h-0 flex-1 space-y-3.5 overflow-auto px-4 pb-4" : "px-5 pb-5 space-y-5")}>
                {/* Summary Stats */}
                <div className={cn("grid grid-cols-2 @[640px]/main:grid-cols-4", compact ? "gap-3" : "gap-4")}>
                    <div className="space-y-1">
                        <p className="text-[11px] font-semibold tracking-wide text-neutral-400">
                            {isPt ? "Receita média" : "Avg. Income"}
                        </p>
                        <p className={cn("font-bold tabular-nums text-emerald-600 dark:text-emerald-400", compact ? "text-base" : "text-lg")}>{fmt(data.avgIncome)}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[11px] font-semibold tracking-wide text-neutral-400">
                            {isPt ? "Despesa média" : "Avg. Expenses"}
                        </p>
                        <p className={cn("font-bold tabular-nums text-red-600 dark:text-red-400", compact ? "text-base" : "text-lg")}>{fmt(data.avgExpenses)}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[11px] font-semibold tracking-wide text-neutral-400">
                            {isPt ? "Recorrentes" : "Recurring"}
                        </p>
                        <p className={cn("font-bold tabular-nums", compact ? "text-base" : "text-lg")}>{fmt(data.recurringCosts)}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[11px] font-semibold tracking-wide text-neutral-400">
                            {isPt ? "Líquido mensal" : "Monthly Net"}
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
                    <Alert variant="destructive" className="rounded-xl border-destructive/20 bg-destructive/5">
                        <AlertTriangle className="size-4" />
                        <AlertDescription>
                            {isPt
                                ? "Atenção: As suas despesas excedem as receitas. Considere rever o seu orçamento."
                                : "Warning: Your expenses exceed your income. Consider reviewing your budget."}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Projection Timeline */}
                <div>
                    <h4 className={cn("text-[13px] font-semibold", compact ? "mb-2" : "mb-3")}>
                        {isPt ? "Saldo Projetado" : "Projected Balance"}
                    </h4>
                    {(() => {
                        const locale = isPt ? "pt-PT" : "en-US"
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
                                    <span className="text-[11px] font-semibold text-foreground w-16 shrink-0">
                                        {isPt ? "Atual" : "Now"}
                                    </span>
                                    <div className={cn("flex-1 rounded-lg bg-muted/40 overflow-hidden", compact ? "h-6" : "h-7")}>
                                        <div
                                            className={`h-full rounded-lg transition-all duration-500 ${currentNegative ? "bg-destructive/60" : "bg-primary/60"}`}
                                            style={{ width: `${Math.min(100, currentBarWidth)}%` }}
                                        />
                                    </div>
                                    <span className={`text-[11px] font-bold w-24 text-right tabular-nums ${currentNegative ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
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
                                            <span className="text-[11px] font-medium text-neutral-400 w-16 shrink-0">{monthName}</span>
                                            <div className={cn("flex-1 rounded-lg bg-muted/40 overflow-hidden", compact ? "h-6" : "h-7")}>
                                                <div
                                                    className={`h-full rounded-lg transition-all duration-500 ${isNegative ? "bg-destructive/40 group-hover/bar:bg-destructive/60" : "bg-primary/40 group-hover/bar:bg-primary/60"}`}
                                                    style={{ width: `${Math.min(100, barWidth)}%` }}
                                                />
                                            </div>
                                            <span className={`text-[11px] font-semibold w-24 text-right tabular-nums ${isNegative ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
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
                    {isPt ? "Copiar resumo" : "Copy summary"}
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={handleRefresh}>
                    <RefreshCw />
                    {isPt ? "Atualizar previsão" : "Refresh forecast"}
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    )
}
