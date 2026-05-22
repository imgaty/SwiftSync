"use client"

import * as React from "react"
import { PageShell, PageHeader, StatCards, PageSection } from "@/components/page-framework"
import { BudgetTable, Budget } from "@/components/budget-table"
import { EmptyState } from "@/components/empty-state"
import { useLanguage } from "@/components/language-provider"
import { useCurrency } from "@/components/currency-provider"
import { useFinanceData } from "@/hooks/use-finance-data"
import { PiggyBank, Target, AlertTriangle, TrendingUp } from "lucide-react"

export default function BudgetsPage() {
    const { t } = useLanguage()
    const { formatCurrency } = useCurrency()
    const f = t.finance || {}
    const isPt = (t.config?.locale || "en-US").startsWith("pt")
    const { data, isLoading } = useFinanceData()
    const budgetsData = (data?.budgets || []) as Budget[]
    const accountsCount = data?.accounts?.length ?? 0
    const transactionsCount = data?.transactions?.length ?? 0

    // Compute stats from budgets
    const stats = React.useMemo(() => {
        if (isLoading || budgetsData.length === 0) return []
        let totalBudget = 0, totalSpent = 0, overBudget = 0
        for (const b of budgetsData) {
            totalBudget += b.budgetAmount
            totalSpent += b.spentAmount
            if (b.status === "over_budget") overBudget++
        }
        const remaining = totalBudget - totalSpent
        const onTrack = budgetsData.length - overBudget
        const overallPercent = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0
        const fmt = (n: number) => formatCurrency(n)
        return [
            { label: "Total Budget", value: fmt(totalBudget), change: `${budgetsData.length} categories`, trend: "neutral" as const, icon: <Target className="h-4 w-4" /> },
            { label: "Total Spent", value: fmt(totalSpent), change: `${overallPercent}% used`, trend: overallPercent > 90 ? "down" as const : "up" as const, icon: <PiggyBank className="h-4 w-4" /> },
            { label: "Remaining", value: fmt(remaining), change: remaining >= 0 ? "Under budget" : "Over budget", trend: remaining >= 0 ? "up" as const : "down" as const, icon: <TrendingUp className="h-4 w-4" /> },
            { label: "Over Budget", value: String(overBudget), change: `${onTrack} on track`, trend: overBudget > 0 ? "down" as const : "up" as const, icon: <AlertTriangle className="h-4 w-4" /> },
        ]
    }, [budgetsData, isLoading, formatCurrency])

    return (
        <PageShell>
            <PageHeader
                breadcrumbs={[
                    { label: t.sidebar_dashboard || "Dashboard", href: "/" },
                    { label: f.budgets || "Budgets", href: "/Budgets" },
                ]}
                isLoading={isLoading}
            />

            <StatCards stats={stats} isLoading={isLoading} />

            {!isLoading && budgetsData.length === 0 ? (
                <EmptyState
                    variant="no-budgets"
                    fullPage
                    title={isPt ? "Nada para mostrar aqui" : "Nothing to show here yet"}
                    description={
                        accountsCount === 0
                            ? (isPt
                                ? "Ligue uma conta primeiro — os orçamentos fazem mais sentido quando já existe atividade financeira para acompanhar."
                                : "Connect an account first — budgets make more sense once there is financial activity to track.")
                            : transactionsCount === 0
                                ? (isPt
                                    ? "Os orçamentos dependem do histórico de transações. Assim que houver movimento, poderá começar a organizar limites por categoria."
                                    : "Budgets rely on transaction history. Once activity starts flowing in, you can organize limits by category.")
                                : (isPt
                                    ? "Ainda não há orçamentos configurados. Reveja as suas transações para começar a planear limites por categoria."
                                    : "You have no budgets set up yet. Review your transactions to start planning category limits.")}
                    action={
                        accountsCount === 0
                            ? {
                                label: isPt ? "Ligar conta" : "Connect account",
                                href: "/Accounts",
                            }
                            : {
                                label: isPt ? "Ver transações" : "Review transactions",
                                href: "/Transactions",
                            }
                    }
                />
            ) : (
                <PageSection stagger={3}>
                    <BudgetTable data={budgetsData} isLoading={isLoading} />
                </PageSection>
            )}
        </PageShell>
    )
}
