//
//  use-finance-data.ts
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Provides the use finance data React hook for Argent, encapsulating reusable state,
//  effects, or data-access behavior for consuming components.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { queryKeys, AuthError } from "@/lib/query-keys"
import type { DataFile } from "@/lib/types"

interface UseFinanceDataResult {
  data: DataFile | null
  isLoading: boolean
  error: string | null
  partial: boolean
  refetch: () => void
}

interface FetchResult {
  financeData: DataFile
  partial: boolean
}

async function fetchFinanceData(): Promise<FetchResult> {
  // Use allSettled so one slow/failing endpoint doesn't block the whole dashboard.
  const results = await Promise.allSettled([
    fetch('/api/accounts'),
    fetch('/api/transactions'),
    fetch('/api/budgets'),
    fetch('/api/bills'),
  ])
  const [accountsSettled, transactionsSettled, budgetsSettled, billsSettled] = results

  const pickRes = (s: PromiseSettledResult<Response>): Response | null =>
    s.status === 'fulfilled' ? s.value : null

  const accountsRes = pickRes(accountsSettled)
  const transactionsRes = pickRes(transactionsSettled)
  const budgetsRes = pickRes(budgetsSettled)
  const billsRes = pickRes(billsSettled)
  // Auth error — throw AuthError so the useQuery retry logic skips (not a transient failure).
  if (accountsRes?.status === 401 || transactionsRes?.status === 401) {
    throw new AuthError('Not authenticated')
  }

  // If every data endpoint failed (network down, server 500), surface a real error
  // instead of rendering an empty dashboard that looks like "you have no data".
  const dataEndpoints = [accountsRes, transactionsRes, budgetsRes, billsRes]
  const allFailed = dataEndpoints.every((r) => !r || !r.ok)
  if (allFailed) {
    throw new Error('Failed to load dashboard data')
  }

  // At least one endpoint succeeded — mark partial if any failed so the UI can warn.
  const partial = dataEndpoints.some((r) => !r || !r.ok)

  const safeJson = async <T,>(res: Response | null, fallback: T): Promise<T> => {
    if (!res || !res.ok) return fallback
    try { return await res.json() as T } catch { return fallback }
  }

  const [accounts, transactions, budgets, bills] = await Promise.all([
    safeJson<DataFile["accounts"]>(accountsRes, []),
    safeJson<DataFile["transactions"]>(transactionsRes, []),
    safeJson<DataFile["budgets"]>(budgetsRes, []),
    safeJson<DataFile["bills"]>(billsRes, []),
  ])

  let startDate = ''
  let endDate = ''
  if (transactions.length > 0) {
    const dates = transactions.map((t: { date: string }) => t.date).sort()
    startDate = dates[0]
    endDate = dates[dates.length - 1]
  }

  return {
    financeData: {
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
    },
    partial,
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

  const { data: result, isLoading, error } = useQuery({
    queryKey: queryKeys.financeData,
    queryFn: fetchFinanceData,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: (failureCount, error) => {
      if (error instanceof AuthError) return false
      return failureCount < 2
    },
  })

  return {
    data: result?.financeData ?? null,
    isLoading,
    error: error ? (error instanceof Error ? error.message : 'Failed to load data') : null,
    partial: result?.partial ?? false,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financeData })
    },
  }
}
