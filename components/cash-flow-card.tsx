"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

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

export function CashFlowCard() {
    const { language } = useLanguage()
    const [data, setData] = React.useState<CashFlowData | null>(null)
    const [isLoading, setIsLoading] = React.useState(true)

    React.useEffect(() => {
        async function fetchCashFlow() {
            try {
                const res = await fetch("/api/cashflow?months=6")
                if (res.ok) {
                    const json = await res.json()
                    setData(json)
                }
            } catch (err) {
                console.error("Failed to fetch cash flow:", err)
            } finally {
                setIsLoading(false)
            }
        }
        fetchCashFlow()
    }, [])

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-64 mt-1" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-32" />
                </CardContent>
            </Card>
        )
    }

    if (!data) return null

    const isPositiveNet = data.monthlyNet >= 0
    const fmt = (n: number) => `€${n.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    {language === "pt" ? "Previsão de Cash Flow" : "Cash Flow Forecast"}
                </CardTitle>
                <CardDescription>
                    {language === "pt"
                        ? "Projeção para os próximos 6 meses com base no seu histórico"
                        : "6-month projection based on your transaction history"}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">
                            {language === "pt" ? "Receita média/mês" : "Avg. Monthly Income"}
                        </p>
                        <p className="text-lg font-bold text-green-600">{fmt(data.avgIncome)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">
                            {language === "pt" ? "Despesa média/mês" : "Avg. Monthly Expenses"}
                        </p>
                        <p className="text-lg font-bold text-red-600">{fmt(data.avgExpenses)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">
                            {language === "pt" ? "Custos recorrentes" : "Recurring Costs"}
                        </p>
                        <p className="text-lg font-bold">{fmt(data.recurringCosts)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">
                            {language === "pt" ? "Líquido mensal" : "Monthly Net"}
                        </p>
                        <p className={`text-lg font-bold ${isPositiveNet ? "text-green-600" : "text-red-600"}`}>
                            {isPositiveNet ? "+" : ""}{fmt(data.monthlyNet)}
                        </p>
                    </div>
                </div>

                {/* Warning if negative */}
                {!isPositiveNet && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        {language === "pt"
                            ? "Atenção: As suas despesas excedem as receitas. Considere rever o seu orçamento."
                            : "Warning: Your expenses exceed your income. Consider reviewing your budget."}
                    </div>
                )}

                {/* Projection Timeline */}
                <div>
                    <h4 className="text-sm font-medium mb-2">
                        {language === "pt" ? "Saldo Projetado" : "Projected Balance"}
                    </h4>
                    <div className="space-y-2">
                        {data.projections.map((p) => {
                            const date = new Date(p.date)
                            const monthName = date.toLocaleDateString(language === "pt" ? "pt-PT" : "en-US", { month: "short", year: "numeric" })
                            const isNegative = p.projected < 0
                            const maxBalance = Math.max(...data.projections.map((pp) => Math.abs(pp.projected)), Math.abs(data.currentBalance))
                            const barWidth = maxBalance > 0 ? (Math.abs(p.projected) / maxBalance) * 100 : 0

                            return (
                                <div key={p.date} className="flex items-center gap-3">
                                    <span className="text-xs text-muted-foreground w-16 shrink-0">{monthName}</span>
                                    <div className="flex-1 h-5 rounded bg-muted/30 overflow-hidden">
                                        <div
                                            className={`h-full rounded transition-all ${isNegative ? "bg-red-500/60" : "bg-primary/60"}`}
                                            style={{ width: `${Math.min(100, barWidth)}%` }}
                                        />
                                    </div>
                                    <span className={`text-xs font-medium w-24 text-right ${isNegative ? "text-red-600" : ""}`}>
                                        {fmt(p.projected)}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
