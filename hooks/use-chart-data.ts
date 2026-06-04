//
//  use-chart-data.ts
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Provides the use chart data React hook for Argent, encapsulating reusable state,
//  effects, or data-access behavior for consuming components.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { createEmptyDailyData, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/chart"
import type { DailyData, ExpenseCategory, IncomeCategory } from "@/lib/chart"
import { AppErrors } from "@/components/error-state"
import { queryKeys } from "@/lib/query-keys"

// ==============================================================================
// CHART DATA HOOK — Fetches transactions from API via React Query
// ==============================================================================

interface UseChartDataReturn {
    data: DailyData[]
    isLoading: boolean
    errorInfo: { type: keyof typeof AppErrors; details?: string } | null
    minDate: Date | null
}

export interface APITransaction {
    id: string
    date: string
    type: 'in' | 'out'
    amount: number
    description: string
    tags: string[]
    accountId: string
}

async function fetchTransactions(): Promise<APITransaction[]> {
    const res = await fetch('/api/transactions')
    if (!res.ok) {
        if (res.status === 401) return []
        throw new Error(`API error (${res.status} ${res.statusText})`)
    }
    return res.json()
}

function processTransactions(
    transactions: APITransaction[],
    accountKey: string
): { data: DailyData[]; minDate: Date | null } {
    let filtered = transactions

    // Filter by account IDs if specified
    if (accountKey) {
        const idSet = new Set(accountKey.split(","))
        filtered = filtered.filter((tx) => idSet.has(tx.accountId))
    }

    if (!filtered?.length) {
        return { data: [], minDate: null }
    }

    const dailyMap = new Map<string, DailyData>()

    for (const txn of filtered) {
        const dateKey = txn.date
        if (!dailyMap.has(dateKey)) dailyMap.set(dateKey, createEmptyDailyData(dateKey))

        const daily = dailyMap.get(dateKey)!

        if (txn.type === 'in') {
            daily.income += txn.amount
            const tag = txn.tags.find(t => INCOME_CATEGORIES.includes(t as IncomeCategory)) || 'other'
            daily[tag] = (daily[tag] as number) + txn.amount
        } else {
            daily.expenses += txn.amount
            const tag = txn.tags.find(t => EXPENSE_CATEGORIES.includes(t as ExpenseCategory)) || 'other'
            daily[tag] = (daily[tag] as number) + txn.amount
        }
    }

    const processed = Array.from(dailyMap.values()).sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    let minDate: Date | null = null
    if (processed.length) {
        let minTime = Infinity
        for (const d of processed) {
            const t = new Date(d.date).getTime()
            if (!isNaN(t) && t < minTime) minTime = t
        }
        if (minTime !== Infinity) minDate = new Date(minTime)
    }

    return { data: processed, minDate }
}

export function useChartData(
    accountIds?: string[],
    providedTransactions?: APITransaction[] | null,
): UseChartDataReturn {
    const hasProvidedTransactions = providedTransactions !== undefined

    // Stable stringified key for accountIds to avoid re-processing on every render
    const accountKey = React.useMemo(() =>
        accountIds && accountIds.length > 0 ? accountIds.slice().sort().join(",") : "",
        [accountIds]
    )

    const { data: transactions, isLoading, error } = useQuery({
        queryKey: queryKeys.transactions,
        queryFn: fetchTransactions,
        enabled: !hasProvidedTransactions,
        staleTime: 2 * 60 * 1000,
    })

    const sourceTransactions = hasProvidedTransactions ? providedTransactions : transactions

    const result = React.useMemo(() => {
        if (!sourceTransactions) return { data: [] as DailyData[], minDate: null }
        return processTransactions(sourceTransactions, accountKey)
    }, [sourceTransactions, accountKey])

    const errorInfo = !hasProvidedTransactions && error
        ? { type: 'UNKNOWN' as keyof typeof AppErrors, details: error instanceof Error ? error.message : String(error) }
        : null

    return {
        data: result.data,
        isLoading: hasProvidedTransactions ? providedTransactions === null : isLoading,
        errorInfo,
        minDate: result.minDate,
    }
}
