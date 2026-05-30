//
//  page.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Renders the /Transactions route in Argent, composing page-level layout, data
//  dependencies, and feature components for that user-facing screen.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { PageShell, PageHeader, StatCards, PageSection } from "@/components/page-framework"
import { TransactionsTable, Transaction } from "@/components/transactions-table"
import { TransactionEditDialog } from "@/components/transactions/transaction-edit-dialog"
import { EmptyState } from "@/components/empty-state"
import { useLanguage } from "@/components/language-provider"
import { useCurrency } from "@/components/currency-provider"
import { useFinanceData } from "@/hooks/use-finance-data"
import { notify } from "@/lib/notify"
import { queryKeys } from "@/lib/query-keys"
import { ArrowLeftRight, TrendingUp, TrendingDown, Hash } from "lucide-react"

export default function TransactionsPage() {
    const { t } = useLanguage()
    const { formatCurrency } = useCurrency()
    const f = t.finance || {}
    const isPt = (t.config?.locale || "en-US").startsWith("pt")
    const { data, isLoading } = useFinanceData()
    const qc = useQueryClient()
    const transactionsData = React.useMemo(() => (data?.transactions ?? []) as Transaction[], [data?.transactions])
    const hasTransactions = transactionsData.length > 0
    const accountsList = data?.accounts ?? []
    const accountsCount = accountsList.length

    const [editOpen, setEditOpen] = React.useState(false)
    const [editing, setEditing] = React.useState<Transaction | null>(null)

    const handleAdd = React.useCallback(() => {
        setEditing(null)
        setEditOpen(true)
    }, [])

    const handleEdit = React.useCallback((tx: Transaction) => {
        setEditing(tx)
        setEditOpen(true)
    }, [])

    const handleDelete = React.useCallback(async (tx: Transaction) => {
        const ok = window.confirm(`Delete "${tx.description}"?`)
        if (!ok) return
        try {
            const res = await fetch(`/api/transactions/${tx.id}`, { method: "DELETE" })
            if (!res.ok) throw new Error(`Failed (${res.status})`)
            qc.invalidateQueries({ queryKey: queryKeys.financeData })
            notify.success({
                title: "Transaction deleted",
                message: tx.description.slice(0, 80),
            })
        } catch (err) {
            notify.error({
                title: "Failed to delete",
                message: err instanceof Error ? err.message : "Unknown error",
            })
        }
    }, [qc])

    // Compute stats from transactions
    const stats = React.useMemo(() => {
        if (isLoading || transactionsData.length === 0) return []
        let totalIn = 0, totalOut = 0, countIn = 0, countOut = 0
        for (const tx of transactionsData) {
            if (tx.type === "in") { totalIn += tx.amount; countIn++ }
            else if (tx.type === "out") { totalOut += tx.amount; countOut++ }
        }
        const net = totalIn - totalOut
        const fmt = (n: number) => formatCurrency(Math.abs(n))
        return [
            { label: "Income", value: fmt(totalIn), change: `${countIn} transactions`, trend: "up" as const, icon: <TrendingUp className="h-4 w-4" /> },
            { label: "Expenses", value: fmt(totalOut), change: `${countOut} transactions`, trend: "down" as const, icon: <TrendingDown className="h-4 w-4" /> },
            { label: "Net", value: `${net >= 0 ? "" : "-"}${fmt(net)}`, change: net >= 0 ? "Positive flow" : "Negative flow", trend: net >= 0 ? "up" as const : "down" as const, icon: <ArrowLeftRight className="h-4 w-4" /> },
            { label: "Transactions", value: String(transactionsData.length), icon: <Hash className="h-4 w-4" /> },
        ]
    }, [transactionsData, isLoading, formatCurrency])

    return (
        <PageShell className="gap-4 p-3 md:p-4">
            <PageHeader
                breadcrumbs={[
                    { label: t.sidebar_dashboard || "Dashboard", href: "/" },
                    { label: f.transactions || "Transactions", href: "/Transactions" },
                ]}
                isLoading={isLoading}
            />

            {isLoading ? (
                <>
                    <StatCards stats={stats} isLoading />
                    <PageSection stagger={3} fill>
                        <TransactionsTable
                            data={transactionsData}
                            accounts={accountsList}
                            isLoading
                            onAddTransaction={handleAdd}
                            onEditTransaction={handleEdit}
                            onDeleteTransaction={handleDelete}
                        />
                    </PageSection>
                </>
            ) : !hasTransactions ? (
                <EmptyState
                    variant="no-transactions"
                    placement="page"
                    title={isPt ? "Nada para mostrar aqui" : "Nothing to show here yet"}
                    description={
                        accountsCount === 0
                            ? (isPt
                                ? "Ligue uma conta bancária para começar a sincronizar transações no Argent."
                                : "Connect a bank account to start syncing transactions into Argent.")
                            : (isPt
                                ? "As transações vão aparecer aqui assim que as suas contas sincronizarem atividade."
                                : "Transactions will appear here as soon as your connected accounts sync activity.")}
                    action={
                        {
                            label: accountsCount === 0
                                ? (isPt ? "Ligar conta" : "Connect account")
                                : (isPt ? "Ir para contas" : "Go to accounts"),
                            href: "/Accounts",
                        }
                    }
                />
            ) : (
                <>
                    <StatCards stats={stats} isLoading={false} />
                    <PageSection stagger={3} fill>
                        <TransactionsTable
                            data={transactionsData}
                            accounts={accountsList}
                            isLoading={false}
                            onAddTransaction={handleAdd}
                            onEditTransaction={handleEdit}
                            onDeleteTransaction={handleDelete}
                        />
                    </PageSection>
                </>
            )}

            <TransactionEditDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                initial={editing}
                accounts={accountsList}
            />
        </PageShell>
    )
}
