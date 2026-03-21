// ==============================================================================
// UNIFIED DATA TYPES
// ==============================================================================

// Account types
export type AccountType = "checking" | "savings" | "credit_card" | "digital_wallet"

export interface Account {
  id: string
  name: string
  type: AccountType
  institution: string
  balance: number
  totalIn: number
  totalOut: number
  transactionCount: number
  color: string
}

// Transaction types
export type TransactionType = "in" | "out"

export interface Transaction {
  id: string
  date: string // YYYY-MM-DD
  type: TransactionType
  amount: number
  tags: string[]
  description: string
  accountId: string
}

// Bill types
export type BillFrequency = "monthly" | "yearly" | "weekly"

export interface Bill {
  id: string
  name: string
  amount: number
  tags: string[]
  dueDay: number
  frequency: BillFrequency
  accountId: string
  category: string
}

// Budget types
export interface Budget {
  tag: string
  category: string
  limit: number
  budgetAmount: number
  spentAmount: number
  color: string
}

// Data file structure
export interface FinanceData {
  meta: {
    generatedAt: string
    currency: string
    locale: string
    dateRange: {
      start: string
      end: string
    }
    totalTransactions: number
  }
  accounts: Account[]
  transactions: Transaction[]
  bills: Bill[]
  budgets: Budget[]
}

// Alias for backward compatibility
export type DataFile = FinanceData

// ==============================================================================
// CHART AGGREGATION TYPES
// ==============================================================================

export interface DailyAggregation {
  date: string
  income: number
  expenses: number
  net: number
  [tag: string]: string | number // Dynamic tag totals
}

export interface MonthlyAggregation {
  month: string // YYYY-MM
  income: number
  expenses: number
  net: number
  [tag: string]: string | number
}

export interface YearlyAggregation {
  year: string // YYYY
  income: number
  expenses: number
  net: number
  [tag: string]: string | number
}

// ==============================================================================
// UTILITY FUNCTIONS
// ==============================================================================

/**
 * Aggregate transactions by date
 */
export function aggregateByDate(transactions: Transaction[]): DailyAggregation[] {
  const byDate = new Map<string, DailyAggregation>()
  
  for (const txn of transactions) {
    if (!byDate.has(txn.date)) {
      byDate.set(txn.date, { date: txn.date, income: 0, expenses: 0, net: 0 })
    }
    const agg = byDate.get(txn.date)!
    
    if (txn.type === "in") {
      agg.income += txn.amount
      agg.net += txn.amount
    } else {
      agg.expenses += txn.amount
      agg.net -= txn.amount
    }
    
    // Add tag-specific totals
    for (const tag of txn.tags) {
      const tagKey = txn.type === "in" ? `${tag}_in` : tag
      agg[tagKey] = ((agg[tagKey] as number) || 0) + txn.amount
    }
  }
  
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Aggregate transactions by month
 */
export function aggregateByMonth(transactions: Transaction[]): MonthlyAggregation[] {
  const byMonth = new Map<string, MonthlyAggregation>()
  
  for (const txn of transactions) {
    const month = txn.date.slice(0, 7) // YYYY-MM
    
    if (!byMonth.has(month)) {
      byMonth.set(month, { month, income: 0, expenses: 0, net: 0 })
    }
    const agg = byMonth.get(month)!
    
    if (txn.type === "in") {
      agg.income += txn.amount
      agg.net += txn.amount
    } else {
      agg.expenses += txn.amount
      agg.net -= txn.amount
    }
    
    for (const tag of txn.tags) {
      const tagKey = txn.type === "in" ? `${tag}_in` : tag
      agg[tagKey] = ((agg[tagKey] as number) || 0) + txn.amount
    }
  }
  
  return Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month))
}

/**
 * Aggregate transactions by year
 */
export function aggregateByYear(transactions: Transaction[]): YearlyAggregation[] {
  const byYear = new Map<string, YearlyAggregation>()
  
  for (const txn of transactions) {
    const year = txn.date.slice(0, 4) // YYYY
    
    if (!byYear.has(year)) {
      byYear.set(year, { year, income: 0, expenses: 0, net: 0 })
    }
    const agg = byYear.get(year)!
    
    if (txn.type === "in") {
      agg.income += txn.amount
      agg.net += txn.amount
    } else {
      agg.expenses += txn.amount
      agg.net -= txn.amount
    }
    
    for (const tag of txn.tags) {
      const tagKey = txn.type === "in" ? `${tag}_in` : tag
      agg[tagKey] = ((agg[tagKey] as number) || 0) + txn.amount
    }
  }
  
  return Array.from(byYear.values()).sort((a, b) => a.year.localeCompare(b.year))
}

/**
 * Filter transactions by date range
 */
export function filterByDateRange(
  transactions: Transaction[],
  start: Date,
  end: Date
): Transaction[] {
  const startStr = start.toISOString().slice(0, 10)
  const endStr = end.toISOString().slice(0, 10)
  return transactions.filter(txn => txn.date >= startStr && txn.date <= endStr)
}

/**
 * Filter transactions by tags
 */
export function filterByTags(
  transactions: Transaction[],
  tags: string[],
  mode: "any" | "all" = "any"
): Transaction[] {
  if (mode === "any") {
    return transactions.filter(txn => txn.tags.some(t => tags.includes(t)))
  }
  return transactions.filter(txn => tags.every(t => txn.tags.includes(t)))
}

/**
 * Get unique tags from transactions
 */
export function getUniqueTags(transactions: Transaction[]): string[] {
  const tags = new Set<string>()
  for (const txn of transactions) {
    for (const tag of txn.tags) {
      tags.add(tag)
    }
  }
  return Array.from(tags).sort()
}

/**
 * Calculate budget spending from transactions
 */
export function calculateBudgetSpending(
  transactions: Transaction[],
  budgets: Budget[],
  month?: string // YYYY-MM format, defaults to current month
): Array<Budget & { spent: number; remaining: number; percentage: number }> {
  const targetMonth = month || new Date().toISOString().slice(0, 7)
  
  // Filter to current month expenses only
  const monthExpenses = transactions.filter(
    txn => txn.type === "out" && txn.date.startsWith(targetMonth)
  )
  
  return budgets.map(budget => {
    const spent = monthExpenses
      .filter(txn => txn.tags.includes(budget.tag))
      .reduce((sum, txn) => sum + txn.amount, 0)
    
    const remaining = Math.max(0, budget.limit - spent)
    const percentage = Math.round((spent / budget.limit) * 100)
    
    return { ...budget, spent, remaining, percentage }
  })
}
