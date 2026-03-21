/**
 * Cash Flow Prediction Engine
 * Projects future balance based on recurring transactions, bills, and historical patterns.
 */

interface RecurringItem {
  amount: number
  frequency: "weekly" | "monthly" | "yearly"
  type: "in" | "out"
}

interface CashFlowProjection {
  date: string        // YYYY-MM-DD
  projected: number   // Projected balance
  income: number      // Expected income
  expenses: number    // Expected expenses
  net: number         // Net for this period
}

/**
 * Calculate average monthly income and expenses from transaction history.
 */
export function getMonthlyAverages(
  transactions: { date: string; type: string; amount: number }[],
  monthsToAverage = 6
): { avgIncome: number; avgExpenses: number } {
  const now = new Date()
  const cutoff = new Date(now)
  cutoff.setMonth(cutoff.getMonth() - monthsToAverage)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  const recent = transactions.filter((t) => t.date >= cutoffStr)
  
  const income = recent
    .filter((t) => t.type === "in")
    .reduce((sum, t) => sum + t.amount, 0)
  const expenses = recent
    .filter((t) => t.type === "out")
    .reduce((sum, t) => sum + t.amount, 0)

  const months = Math.max(1, monthsToAverage)
  return {
    avgIncome: Math.round((income / months) * 100) / 100,
    avgExpenses: Math.round((expenses / months) * 100) / 100,
  }
}

/**
 * Calculate recurring monthly costs from bills.
 */
export function getRecurringMonthlyCosts(
  bills: { amount: number; frequency: string }[]
): number {
  let monthly = 0
  for (const bill of bills) {
    switch (bill.frequency) {
      case "weekly":
        monthly += bill.amount * 4.33
        break
      case "monthly":
        monthly += bill.amount
        break
      case "yearly":
        monthly += bill.amount / 12
        break
    }
  }
  return Math.round(monthly * 100) / 100
}

/**
 * Generate cash flow projection for the next N months.
 */
export function projectCashFlow(
  currentBalance: number,
  avgMonthlyIncome: number,
  avgMonthlyExpenses: number,
  recurringBills: number,
  monthsAhead = 6
): CashFlowProjection[] {
  const projections: CashFlowProjection[] = []
  let runningBalance = currentBalance
  const now = new Date()

  for (let i = 1; i <= monthsAhead; i++) {
    const futureDate = new Date(now)
    futureDate.setMonth(futureDate.getMonth() + i)
    const dateStr = futureDate.toISOString().slice(0, 7) + "-01"

    // Use the higher of recurring bills or average expenses
    const estimatedExpenses = Math.max(avgMonthlyExpenses, recurringBills)
    const net = avgMonthlyIncome - estimatedExpenses
    runningBalance += net

    projections.push({
      date: dateStr,
      projected: Math.round(runningBalance * 100) / 100,
      income: avgMonthlyIncome,
      expenses: estimatedExpenses,
      net: Math.round(net * 100) / 100,
    })
  }

  return projections
}

/**
 * Full cash flow analysis — combines all data sources.
 */
export function analyzeCashFlow(
  currentBalance: number,
  transactions: { date: string; type: string; amount: number }[],
  bills: { amount: number; frequency: string }[],
  monthsAhead = 6
): {
  projections: CashFlowProjection[]
  avgIncome: number
  avgExpenses: number
  recurringCosts: number
  monthlyNet: number
  projectedBalanceEndOfYear: number
} {
  const { avgIncome, avgExpenses } = getMonthlyAverages(transactions)
  const recurringCosts = getRecurringMonthlyCosts(bills)
  const effectiveExpenses = Math.max(avgExpenses, recurringCosts)
  const monthlyNet = avgIncome - effectiveExpenses

  const projections = projectCashFlow(
    currentBalance,
    avgIncome,
    effectiveExpenses,
    recurringCosts,
    monthsAhead
  )

  return {
    projections,
    avgIncome,
    avgExpenses,
    recurringCosts,
    monthlyNet: Math.round(monthlyNet * 100) / 100,
    projectedBalanceEndOfYear: projections[projections.length - 1]?.projected ?? currentBalance,
  }
}
