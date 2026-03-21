"use client"

import * as React from "react"
import { PageShell, PageHeader, PageSection } from "@/components/page-framework"
import { SectionCards } from "@/components/section-cards"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { TransactionsTable } from "@/components/transactions-table"
import { BudgetTable } from "@/components/budget-table"
import { BillsTable } from "@/components/bills-table"
import { AccountsTable } from "@/components/accounts-table"
import { ExportDialog } from "@/components/export-dialog"
import { CashFlowCard } from "@/components/cash-flow-card"
import { AccountFilter } from "@/components/account-filter"

import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"

import { Button } from "@/components/ui/button"
import { Download, BarChart3, TrendingUp, Wallet, ArrowLeftRight } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { useFinanceData } from "@/hooks/use-finance-data"
import type { FinanceData } from "@/lib/types"



export default function Dashboard() {
    const { t, isLoading: isLangLoading } = useLanguage()
    const { data: financeData, isLoading: isDataLoading } = useFinanceData()
    const f = t.finance || {}
    const [showExport, setShowExport] = React.useState(false)
    const [selectedAccountIds, setSelectedAccountIds] = React.useState<string[]>([])
    
    const isLoading = isLangLoading || isDataLoading
    
    // Extract data from unified source
    const accounts = financeData?.accounts || []

    // Filter data by selected accounts (empty = all)
    const accountIdSet = React.useMemo(
        () => (selectedAccountIds.length > 0 ? new Set(selectedAccountIds) : null),
        [selectedAccountIds]
    )

    const filteredTransactions = React.useMemo(() => {
        const txs = financeData?.transactions || []
        if (!accountIdSet) return txs
        return txs.filter((tx) => accountIdSet.has(tx.accountId))
    }, [financeData?.transactions, accountIdSet])

    const filteredBills = React.useMemo(() => {
        const bills = financeData?.bills || []
        if (!accountIdSet) return bills
        return bills.filter((b) => accountIdSet.has(b.accountId))
    }, [financeData?.bills, accountIdSet])

    const filteredAccounts = React.useMemo(() => {
        if (!accountIdSet) return accounts
        return accounts.filter((a) => accountIdSet.has(a.id))
    }, [accounts, accountIdSet])

    const filteredBudgets = React.useMemo(() => {
        const budgets = financeData?.budgets || []
        if (!accountIdSet) return budgets
        // Budgets don't have accountId — recompute spentAmount from filtered transactions
        const tagSpent = new Map<string, number>()
        for (const tx of filteredTransactions) {
            if (tx.type === "out") {
                for (const tag of tx.tags) {
                    tagSpent.set(tag, (tagSpent.get(tag) || 0) + tx.amount)
                }
            }
        }
        return budgets.map((b) => ({
            ...b,
            spentAmount: accountIdSet ? (tagSpent.get(b.tag) || 0) : b.spentAmount,
        }))
    }, [financeData?.budgets, filteredTransactions, accountIdSet])

    // Build filtered FinanceData for SectionCards
    const filteredFinanceData = React.useMemo((): FinanceData | null => {
        if (!financeData) return null
        return {
            ...financeData,
            accounts: filteredAccounts,
            transactions: filteredTransactions,
            bills: filteredBills,
            budgets: filteredBudgets,
        }
    }, [financeData, filteredAccounts, filteredTransactions, filteredBills, filteredBudgets])

    return (
        <PageShell>
            {/* Header */}
            <PageHeader
                breadcrumbs={[
                    { label: isLoading ? "" : (t.sidebar_dashboard || "Dashboard"), href: "/" },
                ]}
                isLoading={isLoading}
                actions={
                    <div className="flex items-center gap-2">
                        <AccountFilter
                            accounts={accounts}
                            selectedIds={selectedAccountIds}
                            onChange={setSelectedAccountIds}
                            isLoading={isLoading}
                        />
                        <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => setShowExport(true)} 
                            title="Export"
                            className="h-9 w-9 rounded-xl border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-200"
                        >
                            <Download className="h-4 w-4" />
                        </Button>
                    </div>
                }
            />

            {/* Stats Cards */}
            <PageSection
                stagger={1}
                title={isLoading ? undefined : (f.overview || 'Overview')}
                description={isLoading ? undefined : (f.overview_desc || 'Your financial snapshot at a glance')}
                icon={<BarChart3 className="h-4 w-4" />}
                isLoading={isLoading}
            >
                <SectionCards data={filteredFinanceData} isLoading={isLoading} />
            </PageSection>

            {/* Chart */}
            <PageSection
                stagger={2}
                title={isLoading ? undefined : (f.analytics || 'Analytics')}
                description={isLoading ? undefined : (f.analytics_desc || 'Track your spending and income trends')}
                icon={<TrendingUp className="h-4 w-4" />}
                isLoading={isLoading}
            >
                <ChartAreaInteractive accountIds={selectedAccountIds} />
            </PageSection>
            
            {/* Data Tabs */}
            <PageSection
                stagger={3}
                title={isLoading ? undefined : (f.financial_data || 'Financial Data')}
                description={isLoading ? undefined : (
                    f.financial_data_desc ||
                    `${filteredTransactions.length} transactions · ${filteredBudgets.length} budgets · ${filteredBills.length} bills · ${filteredAccounts.length} accounts`
                )}
                icon={<Wallet className="h-4 w-4" />}
                isLoading={isLoading}
            >
                <Tabs defaultValue="transactions" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 lg:w-full h-11 p-1 bg-black/3 dark:bg-white/4 border border-black/10 dark:border-white/10 backdrop-blur-sm rounded-xl">
                        {isLoading ? (
                            <>
                                <Skeleton className="h-8 w-full rounded-lg" />
                                <Skeleton className="h-8 w-full rounded-lg" />
                                <Skeleton className="h-8 w-full rounded-lg" />
                                <Skeleton className="h-8 w-full rounded-lg" />
                            </>
                        ) : (
                            <>
                                <TabsTrigger value="transactions" className="rounded-lg text-[13px] font-medium transition-all duration-200 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-black dark:text-white">{f.transactions || 'Transactions'}</TabsTrigger>
                                <TabsTrigger value="budgets" className="rounded-lg text-[13px] font-medium transition-all duration-200 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-black dark:text-white">{f.budgets || 'Budgets'}</TabsTrigger>
                                <TabsTrigger value="bills" className="rounded-lg text-[13px] font-medium transition-all duration-200 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-black dark:text-white">{f.bills || 'Bills'}</TabsTrigger>
                                <TabsTrigger value="accounts" className="rounded-lg text-[13px] font-medium transition-all duration-200 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-black dark:text-white">{f.accounts || 'Accounts'}</TabsTrigger>
                            </>
                        )}
                    </TabsList>
                    
                    <TabsContent value="transactions" className="mt-6 animate-fade-in">
                        <TransactionsTable data={filteredTransactions} isLoading={isLoading} />
                    </TabsContent>
                    
                    <TabsContent value="budgets" className="mt-6 animate-fade-in">
                        <BudgetTable data={filteredBudgets} isLoading={isLoading} />
                    </TabsContent>
                    
                    <TabsContent value="bills" className="mt-6 animate-fade-in">
                        <BillsTable data={filteredBills} isLoading={isLoading} />
                    </TabsContent>
                    
                    <TabsContent value="accounts" className="mt-6 animate-fade-in">
                        <AccountsTable data={filteredAccounts} isLoading={isLoading} />
                    </TabsContent>
                </Tabs>
            </PageSection>

            {/* Cash Flow Prediction */}
            <PageSection
                stagger={4}
                title={isLoading ? undefined : (f.cash_flow || 'Cash Flow')}
                description={isLoading ? undefined : (f.cash_flow_desc || 'Predicted income and expenses for the coming weeks')}
                icon={<ArrowLeftRight className="h-4 w-4" />}
                isLoading={isLoading}
            >
                <CashFlowCard accountIds={selectedAccountIds} />
            </PageSection>

            {/* Export Dialog */}
            <ExportDialog open={showExport} onOpenChange={setShowExport} />
        </PageShell>
    )
}