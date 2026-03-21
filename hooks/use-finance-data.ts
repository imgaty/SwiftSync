"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { queryKeys, AuthError } from "@/lib/query-keys"
import type { DataFile } from "@/lib/types"

interface UseFinanceDataResult {
  data: DataFile | null
  isLoading: boolean
  error: string | null
  refetch: () => void
}

async function fetchFinanceData(): Promise<DataFile> {
  const [accountsRes, transactionsRes, budgetsRes, billsRes] = await Promise.all([
    fetch('/api/accounts'),
    fetch('/api/transactions'),
    fetch('/api/budgets'),
    fetch('/api/bills'),
  ])

  // Check for auth errors
  if (accountsRes.status === 401 || transactionsRes.status === 401) {
    return {
      meta: { generatedAt: new Date().toISOString(), currency: 'EUR', locale: 'pt-PT', dateRange: { start: '', end: '' }, totalTransactions: 0 },
      accounts: [],
      transactions: [],
      budgets: [],
      bills: [],
    }
  }

  const [accounts, transactions, budgets, bills] = await Promise.all([
    accountsRes.ok ? accountsRes.json() : [],
    transactionsRes.ok ? transactionsRes.json() : [],
    budgetsRes.ok ? budgetsRes.json() : [],
    billsRes.ok ? billsRes.json() : [],
  ])

  let startDate = ''
  let endDate = ''
  if (transactions.length > 0) {
    const dates = transactions.map((t: { date: string }) => t.date).sort()
    startDate = dates[0]
    endDate = dates[dates.length - 1]
  }

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      currency: 'EUR',
      locale: 'pt-PT',
      dateRange: { start: startDate, end: endDate },
      totalTransactions: transactions.length,
    },
    accounts,
    transactions,
    budgets,
    bills,
  }
}

/**
 * Shared finance data hook — powered by React Query.
 * Data is automatically cached, deduplicated, and refetched when stale.
 * Mutations anywhere in the app can invalidate via queryKeys.financeData.
 * Call `refetch()` to force a fresh load.
 */
export function useFinanceData(): UseFinanceDataResult {
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.financeData,
    queryFn: fetchFinanceData,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: (failureCount, error) => {
      if (error instanceof AuthError) return false
      return failureCount < 2
    },
  })

  return {
    data: data ?? null,
    isLoading,
    error: error ? (error instanceof Error ? error.message : 'Failed to load data') : null,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financeData })
    },
  }
}
