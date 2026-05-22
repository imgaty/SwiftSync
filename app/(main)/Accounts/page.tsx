"use client"

import * as React from "react"
import { PageShell, PageHeader, StatCards, PageSection } from "@/components/page-framework"
import { AccountsTable, Account } from "@/components/accounts-table"
import { BankConnections } from "@/components/bank-connections"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/language-provider"
import { useCurrency } from "@/components/currency-provider"
import { useFinanceData } from "@/hooks/use-finance-data"
import { Wallet, TrendingUp, TrendingDown, CreditCard, Plus } from "lucide-react"

export default function AccountsPage() {
    const { t } = useLanguage()
    const { formatCurrency } = useCurrency()
    const f = t.finance || {}
    const isPt = (t.config?.locale || "en-US").startsWith("pt")
    const { data, isLoading } = useFinanceData()
    const allAccounts = (data?.accounts || []) as Account[]

    // Compute stats from accounts
    const stats = React.useMemo(() => {
        if (isLoading || allAccounts.length === 0) return []
        let totalBalance = 0, totalIn = 0, totalOut = 0
        for (const a of allAccounts) { totalBalance += a.balance; totalIn += a.totalIn; totalOut += a.totalOut }
        const fmt = (n: number) => formatCurrency(n)
        return [
            { label: "Total Balance", value: fmt(totalBalance), icon: <Wallet className="h-4 w-4" /> },
            { label: "Total Income", value: fmt(totalIn), change: "All accounts", trend: "up" as const, icon: <TrendingUp className="h-4 w-4" /> },
            { label: "Total Expenses", value: fmt(totalOut), change: "All accounts", trend: "down" as const, icon: <TrendingDown className="h-4 w-4" /> },
            { label: "Accounts", value: String(allAccounts.length), icon: <CreditCard className="h-4 w-4" /> },
        ]
    }, [allAccounts, isLoading, formatCurrency])

    return (
        <PageShell>
            <PageHeader
                breadcrumbs={[
                    { label: t.sidebar_dashboard || "Dashboard", href: "/" },
                    { label: f.accounts || "Accounts", href: "/Accounts" },
                ]}
                isLoading={isLoading}
                actions={
                    <Button
                        onClick={() => document.getElementById("bank-connections")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                        title={isPt ? "Ligar banco" : "Connect bank"}
                    >
                        <Plus />
                    </Button>
                }
            />


            <StatCards stats={stats} isLoading={isLoading} />

            <PageSection stagger={2}>
                <div id="bank-connections">
                    <BankConnections />
                </div>
            </PageSection>

            <PageSection stagger={3}>
                <AccountsTable data={allAccounts} isLoading={isLoading} />
            </PageSection>
        </PageShell>
    )
}
