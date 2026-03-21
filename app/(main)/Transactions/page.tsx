"use client"

import * as React from "react"
import { PageShell, PageHeader, PageTitle, StatCards, PageSection } from "@/components/page-framework"
import { TransactionsTable, Transaction } from "@/components/transactions-table"
import { useLanguage } from "@/components/language-provider"
import { useFinanceData } from "@/hooks/use-finance-data"
import { ArrowLeftRight, TrendingUp, TrendingDown, Hash } from "lucide-react"

export default function TransactionsPage() {
    const { t } = useLanguage()
    const f = t.finance || {}
    const { data, isLoading } = useFinanceData()
    const transactionsData = (data?.transactions || []) as Transaction[]

    // Compute stats from transactions
    const stats = React.useMemo(() => {
        if (isLoading || transactionsData.length === 0) return []
        const totalIn = transactionsData.filter(tx => tx.type === "in").reduce((sum, tx) => sum + tx.amount, 0)
        const totalOut = transactionsData.filter(tx => tx.type === "out").reduce((sum, tx) => sum + tx.amount, 0)
        const net = totalIn - totalOut
        const fmt = (n: number) => `€${Math.abs(n).toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`
        return [
            { label: "Income", value: fmt(totalIn), change: `${transactionsData.filter(tx => tx.type === "in").length} transactions`, trend: "up" as const, icon: <TrendingUp className="h-4 w-4" /> },
            { label: "Expenses", value: fmt(totalOut), change: `${transactionsData.filter(tx => tx.type === "out").length} transactions`, trend: "down" as const, icon: <TrendingDown className="h-4 w-4" /> },
            { label: "Net", value: `${net >= 0 ? "" : "-"}${fmt(net)}`, change: net >= 0 ? "Positive flow" : "Negative flow", trend: net >= 0 ? "up" as const : "down" as const, icon: <ArrowLeftRight className="h-4 w-4" /> },
            { label: "Transactions", value: String(transactionsData.length), icon: <Hash className="h-4 w-4" /> },
        ]
    }, [transactionsData, isLoading])

    return (
        <PageShell>
            <PageHeader
                breadcrumbs={[
                    { label: t.sidebar_dashboard || "Dashboard", href: "/" },
                    { label: f.transactions || "Transactions", href: "/Transactions" },
                ]}
                isLoading={isLoading}
            />

            <PageTitle
                title={f.pages?.transactions_title || "Transactions"}
                description={f.pages?.transactions_description || "View and manage all your transactions"}
                isLoading={isLoading}
                icon={<ArrowLeftRight className="h-5 w-5" />}
            />

            <StatCards stats={stats} isLoading={isLoading} />

            <PageSection stagger={3}>
                <TransactionsTable data={transactionsData} isLoading={isLoading} />
            </PageSection>
        </PageShell>
    )
}
