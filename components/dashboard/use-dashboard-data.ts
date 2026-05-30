//
//  use-dashboard-data.ts
//  Argent
//
//  Created by hilario on 22 May 2026 at 21:32.
//  Description: Implements the Use dashboard data dashboard module for Argent, shaping financial summary
//  content, supporting states, and interactions used by the dashboard experience.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import { useCurrency } from "@/components/currency-provider"
import { useLanguage } from "@/components/language-provider"
import { buildDashboardPriorityItems } from "@/components/dashboard/dashboard-priority"
import { useFinanceData } from "@/hooks/use-finance-data"
import type { Account, Bill, Budget, FinanceData, Transaction } from "@/lib/types"
import type {
    BudgetPressure,
    DashboardLabels,
    DashboardTranslations,
    DashboardUserProfile,
    ProfileResponse,
    UpcomingBill,
} from "@/components/dashboard/types"
import {
    DAY_MS,
    getMonthPrefix,
    getNextBillDueDate,
    startOfDay,
} from "@/components/dashboard/utils"

const EMPTY_ACCOUNTS: Account[] = []
const EMPTY_TRANSACTIONS: Transaction[] = []
const EMPTY_BILLS: Bill[] = []
const EMPTY_BUDGETS: Budget[] = []

export function useDashboardData() {
    const { t, isLoading: isLanguageLoading } = useLanguage()
    const text = t as typeof t & DashboardTranslations
    const { data: financeData, isLoading: isDataLoading } = useFinanceData()
    const { formatCurrency } = useCurrency()

    const dashboardExportLabel = text.dashboard?.export || "Export"
    const goodMorningLabel = text.dashboard?.good_morning || "Good morning"
    const goodAfternoonLabel = text.dashboard?.good_afternoon || "Good afternoon"
    const goodEveningLabel = text.dashboard?.good_evening || "Good evening"
    const locale = t.config?.locale || "en-US"
    const isPortuguese = locale.startsWith("pt")

    const [selectedAccountIds, setSelectedAccountIds] = React.useState<string[]>([])
    const [now, setNow] = React.useState(() => new Date())
    const [userProfile, setUserProfile] = React.useState<DashboardUserProfile | null>(null)
    const [isProfileLoading, setIsProfileLoading] = React.useState(true)

    const isLoading = isLanguageLoading || isDataLoading

    React.useEffect(() => {
        const timer = window.setInterval(() => setNow(new Date()), 60_000)
        return () => window.clearInterval(timer)
    }, [])

    React.useEffect(() => {
        async function loadProfile() {
            try {
                const profileResponse = await fetch("/api/auth/profile", { credentials: "include" })

                if (profileResponse.ok) {
                    const profile = await profileResponse.json() as ProfileResponse
                    setUserProfile({
                        name: profile.name || "",
                        initials: profile.initials || "",
                    })
                }
            } catch {
                setUserProfile(null)
            } finally {
                setIsProfileLoading(false)
            }
        }
        loadProfile()
    }, [])

    const greeting = React.useMemo(() => {
        const hour = now.getHours()
        if (hour >= 5 && hour < 12) return goodMorningLabel
        if (hour >= 12 && hour < 18) return goodAfternoonLabel
        return goodEveningLabel
    }, [now, goodMorningLabel, goodAfternoonLabel, goodEveningLabel])

    const formattedDate = React.useMemo(() => {
        return now.toLocaleString(locale, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        })
    }, [now, locale])

    const accounts = financeData?.accounts ?? EMPTY_ACCOUNTS

    const selectedAccountIdSet = React.useMemo(
        () => (selectedAccountIds.length > 0 ? new Set(selectedAccountIds) : null),
        [selectedAccountIds],
    )

    const filteredTransactions = React.useMemo(() => {
        const allTransactions = financeData?.transactions ?? EMPTY_TRANSACTIONS
        if (!selectedAccountIdSet) return allTransactions
        return allTransactions.filter((transaction) => selectedAccountIdSet.has(transaction.accountId))
    }, [financeData?.transactions, selectedAccountIdSet])

    const filteredBills = React.useMemo(() => {
        const allBills = financeData?.bills ?? EMPTY_BILLS
        if (!selectedAccountIdSet) return allBills
        return allBills.filter((bill) => selectedAccountIdSet.has(bill.accountId))
    }, [financeData?.bills, selectedAccountIdSet])

    const filteredAccounts = React.useMemo(() => {
        if (!selectedAccountIdSet) return accounts
        return accounts.filter((account) => selectedAccountIdSet.has(account.id))
    }, [accounts, selectedAccountIdSet])

    const filteredBudgets = React.useMemo(() => {
        const allBudgets = financeData?.budgets ?? EMPTY_BUDGETS
        if (!selectedAccountIdSet) return allBudgets

        const spentByTag = new Map<string, number>()
        for (const transaction of filteredTransactions) {
            if (transaction.type === "out") {
                for (const tag of transaction.tags) {
                    spentByTag.set(tag, (spentByTag.get(tag) || 0) + transaction.amount)
                }
            }
        }

        return allBudgets.map((budget) => ({
            ...budget,
            spentAmount: spentByTag.get(budget.tag) || 0,
        }))
    }, [financeData?.budgets, filteredTransactions, selectedAccountIdSet])

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

    const accountsById = React.useMemo(() => {
        return new Map(filteredAccounts.map((account) => [account.id, account]))
    }, [filteredAccounts])

    const recentTransactions = React.useMemo(() => {
        return [...filteredTransactions]
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 5)
    }, [filteredTransactions])

    const upcomingBillEvents = React.useMemo<UpcomingBill[]>(() => {
        const today = startOfDay(now)

        return filteredBills
            .map((bill) => {
                const dueDate = getNextBillDueDate(bill, now)
                return {
                    ...bill,
                    dueDate,
                    daysUntilDue: Math.max(0, Math.ceil((dueDate.getTime() - today.getTime()) / DAY_MS)),
                }
            })
            .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    }, [filteredBills, now])

    const upcomingBills = React.useMemo(() => upcomingBillEvents.slice(0, 3), [upcomingBillEvents])

    const budgetPressure = React.useMemo<BudgetPressure[]>(() => {
        return filteredBudgets
            .map((budget) => {
                const limitValue = budget.limit || budget.budgetAmount || 0
                const percentUsed = limitValue > 0 ? Math.round((budget.spentAmount / limitValue) * 100) : 0
                return {
                    ...budget,
                    limitValue,
                    percentUsed,
                    remainingAmount: limitValue - budget.spentAmount,
                }
            })
            .filter((budget) => budget.limitValue > 0)
            .sort((a, b) => b.percentUsed - a.percentUsed)
            .slice(0, 3)
    }, [filteredBudgets])

    const monthlySnapshot = React.useMemo(() => {
        const monthPrefix = getMonthPrefix(now)
        let income = 0
        let expenses = 0
        let transactionCount = 0
        const outflowByTag = new Map<string, number>()

        for (const transaction of filteredTransactions) {
            if (!transaction.date.startsWith(monthPrefix)) continue
            transactionCount += 1

            if (transaction.type === "in") {
                income += transaction.amount
            } else {
                expenses += transaction.amount
                const tag = transaction.tags[0] || (isPortuguese ? "Outros" : "Other")
                outflowByTag.set(tag, (outflowByTag.get(tag) || 0) + transaction.amount)
            }
        }

        const topOutflow = Array.from(outflowByTag.entries())
            .sort((a, b) => b[1] - a[1])[0]

        const upcomingTotal = upcomingBillEvents
            .filter((bill) => bill.daysUntilDue <= 30)
            .reduce((sum, bill) => sum + bill.amount, 0)

        return {
            income,
            expenses,
            net: income - expenses,
            transactionCount,
            topOutflowLabel: topOutflow?.[0] || (isPortuguese ? "Sem saidas" : "No outflow"),
            topOutflowAmount: topOutflow?.[1] || 0,
            upcomingTotal,
            highestBudgetUse: budgetPressure[0]?.percentUsed ?? 0,
        }
    }, [budgetPressure, filteredTransactions, isPortuguese, now, upcomingBillEvents])

    const formatCompactCurrency = React.useCallback((amount: number) => {
        return formatCurrency(amount, { maximumFractionDigits: 0 })
    }, [formatCurrency])

    const dashboardLabels = React.useMemo<DashboardLabels>(() => ({
        activityPulse: isPortuguese ? "Pulso de atividade" : "Activity pulse",
        analytics: t.finance?.analytics || "Analytics",
        billExposure: isPortuguese ? "Exposicao de contas" : "Bill exposure",
        overview: isPortuguese ? "Visao geral" : "Overview",
        cashFlow: t.finance?.cash_flow || "Cash Flow",
        cashPosition: isPortuguese ? "Posicao de caixa" : "Cash position",
        done: isPortuguese ? "Concluir" : "Done",
        dropCardHere: isPortuguese ? "Largar cartao aqui" : "Drop a card here",
        dropHere: isPortuguese ? "Largar aqui" : "Drop here",
        dueNext30: isPortuguese ? "a vencer nos proximos 30d" : "due next 30d",
        netFlow: isPortuguese ? "Fluxo liquido" : "Net flow",
        topOutflow: isPortuguese ? "Maior saida" : "Top outflow",
        dueSoon: isPortuguese ? "A vencer" : "Due soon",
        budgetUse: isPortuguese ? "Pressao" : "Pressure",
        recentActivity: isPortuguese ? "Atividade recente" : "Recent activity",
        focus: isPortuguese ? "Foco financeiro" : "Financial focus",
        budgetPressure: isPortuguese ? "Orcamentos" : "Budgets",
        upcomingBills: isPortuguese ? "Contas" : "Bills",
        healthy: isPortuguese ? "Estavel" : "Healthy",
        highestPressure: isPortuguese ? "Maior pressao" : "Highest pressure",
        layout: isPortuguese ? "Layout" : "Layout",
        left: isPortuguese ? "restante" : "left",
        leftColumn: isPortuguese ? "Esquerda" : "Left",
        movesHere: isPortuguese ? "Move para aqui" : "Moves here",
        needsReview: isPortuguese ? "Rever" : "Needs review",
        noBillsDue: isPortuguese ? "Sem contas nos proximos 30d" : "No bills due next 30d",
        noBudgetPressure: isPortuguese ? "Sem pressao em orcamentos" : "No budget pressure",
        over: isPortuguese ? "acima" : "over",
        noTransactions: isPortuguese ? "Sem transacoes neste escopo." : "No transactions in this scope.",
        noFocus: isPortuguese ? "Sem orcamentos ou contas neste escopo." : "No budgets or bills in this scope.",
        priorityBrief: isPortuguese ? "Resumo prioritario" : "Priority brief",
        reset: isPortuguese ? "Repor" : "Reset",
        rightColumn: isPortuguese ? "Direita" : "Right",
        stack: isPortuguese ? "Empilhar" : "Stack",
        split: isPortuguese ? "Dividir" : "Split",
        thisMonth: isPortuguese ? "este mes" : "this month",
        next30: isPortuguese ? "proximos 30d" : "next 30d",
        accounts: isPortuguese ? "contas" : "accounts",
        transactions: isPortuguese ? "transacoes" : "transactions",
        selected: isPortuguese ? "selecionadas" : "selected",
    }), [isPortuguese, t.finance?.analytics, t.finance?.cash_flow])

    const scopeSummary = selectedAccountIds.length > 0
        ? `${filteredAccounts.length}/${accounts.length} ${dashboardLabels.accounts} ${dashboardLabels.selected}`
        : `${accounts.length} ${dashboardLabels.accounts}`

    const activitySummary = `${monthlySnapshot.transactionCount} ${dashboardLabels.transactions} ${dashboardLabels.thisMonth}`

    const priorityItems = React.useMemo(() => buildDashboardPriorityItems({
        budgetPressure,
        dashboardLabels,
        formatCompactCurrency,
        monthlySnapshot,
        upcomingBills,
    }), [budgetPressure, dashboardLabels, formatCompactCurrency, monthlySnapshot, upcomingBills])

    return React.useMemo(() => ({
        accounts,
        accountsById,
        activitySummary,
        budgetPressure,
        dashboardExportLabel,
        dashboardLabels,
        filteredFinanceData,
        formattedDate,
        formatCompactCurrency,
        greeting,
        isLoading,
        isPortuguese,
        isProfileLoading,
        locale,
        monthlySnapshot,
        priorityItems,
        recentTransactions,
        scopeSummary,
        selectedAccountIds,
        setSelectedAccountIds,
        sidebarDashboardLabel: t.sidebar_dashboard,
        transactionsLabel: t.finance?.transactions || "Transactions",
        upcomingBills,
        userProfile,
    }), [
        accounts,
        accountsById,
        activitySummary,
        budgetPressure,
        dashboardExportLabel,
        dashboardLabels,
        filteredFinanceData,
        formattedDate,
        formatCompactCurrency,
        greeting,
        isLoading,
        isPortuguese,
        isProfileLoading,
        locale,
        monthlySnapshot,
        priorityItems,
        recentTransactions,
        scopeSummary,
        selectedAccountIds,
        t.finance?.transactions,
        t.sidebar_dashboard,
        upcomingBills,
        userProfile,
    ])
}
