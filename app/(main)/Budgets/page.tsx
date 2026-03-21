"use client"

import * as React from "react"
import { PageShell, PageHeader, PageTitle, StatCards, PageSection } from "@/components/page-framework"
import { BudgetTable, Budget } from "@/components/budget-table"
import { useLanguage } from "@/components/language-provider"
import { useFinanceData } from "@/hooks/use-finance-data"
import { PiggyBank, Target, AlertTriangle, TrendingUp } from "lucide-react"

export default function BudgetsPage() {
    const { t } = useLanguage()
    const f = t.finance || {}
    const { data, isLoading } = useFinanceData()
    const budgetsData = (data?.budgets || []) as Budget[]

    // Compute stats from budgets
    const stats = React.useMemo(() => {
        if (isLoading || budgetsData.length === 0) return []
        const totalBudget = budgetsData.reduce((sum, b) => sum + b.budgetAmount, 0)
        const totalSpent = budgetsData.reduce((sum, b) => sum + b.spentAmount, 0)
        const remaining = totalBudget - totalSpent
        const overBudget = budgetsData.filter(b => b.status === "over_budget").length
        const onTrack = budgetsData.filter(b => b.status !== "over_budget").length
        const overallPercent = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0
        const fmt = (n: number) => `€${n.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`
        return [
            { label: "Total Budget", value: fmt(totalBudget), change: `${budgetsData.length} categories`, trend: "neutral" as const, icon: <Target className="h-4 w-4" /> },
            { label: "Total Spent", value: fmt(totalSpent), change: `${overallPercent}% used`, trend: overallPercent > 90 ? "down" as const : "up" as const, icon: <PiggyBank className="h-4 w-4" /> },
            { label: "Remaining", value: fmt(remaining), change: remaining >= 0 ? "Under budget" : "Over budget", trend: remaining >= 0 ? "up" as const : "down" as const, icon: <TrendingUp className="h-4 w-4" /> },
            { label: "Over Budget", value: String(overBudget), change: `${onTrack} on track`, trend: overBudget > 0 ? "down" as const : "up" as const, icon: <AlertTriangle className="h-4 w-4" /> },
        ]
    }, [budgetsData, isLoading])

    return (
        <PageShell>
            <PageHeader
                breadcrumbs={[
                    { label: t.sidebar_dashboard || "Dashboard", href: "/" },
                    { label: f.budgets || "Budgets", href: "/Budgets" },
                ]}
                isLoading={isLoading}
            />

            <PageTitle
                title={f.pages?.budgets_title || "Budgets"}
                description={f.pages?.budgets_description || "Set and track spending limits by category"}
                isLoading={isLoading}
                icon={<PiggyBank className="h-5 w-5" />}
            />

            <StatCards stats={stats} isLoading={isLoading} />

            <PageSection stagger={3}>
                <BudgetTable data={budgetsData} isLoading={isLoading} />
            </PageSection>
        </PageShell>
    )
}
