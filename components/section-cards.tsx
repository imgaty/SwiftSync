"use client"

import * as React from "react"
import { TrendingDown, TrendingUp } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

import {
    Card,
    CardAction,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

import { ErrorState } from "@/components/error-state"
import { useLanguage } from "@/components/language-provider"
import type { FinanceData } from "@/lib/types"



// ==============================================================================
// CONFIG & TYPES
// ==============================================================================

interface StatData {
    value: number
    diff: number
    percent: number
    trend: 'up' | 'down'
}

const COLORS = {
    income: "rgba(22, 163, 74, 1)",
    expenses: "rgba(220, 38, 38, 1)",
    savings: "rgba(37, 99, 235, 1)",
    balance: "rgba(139, 92, 246, 1)",
} as const

type StatKey = 'income' | 'expenses' | 'savings' | 'balance'

interface SectionCardsProps {
    data?: FinanceData | null
    isLoading?: boolean
}



// ==============================================================================
// GLOBAL CACHE - Computed stats cached to avoid reprocessing
// ==============================================================================

interface CachedStats {
    stats: Record<StatKey, StatData>
    computedAt: string // YYYY-MM format to invalidate when month changes
}

let statsCache: CachedStats | null = null

// Process transactions and compute stats for income/expenses
function computeStats(data: FinanceData): Record<StatKey, StatData> {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear

    // Initialize totals
    const current = { income: 0, expenses: 0 }
    const prev = { income: 0, expenses: 0 }

    // Process transactions
    for (const tx of data.transactions) {
        const date = new Date(tx.date)
        if (isNaN(date.getTime())) continue

        const month = date.getMonth()
        const year = date.getFullYear()
        
        if (year === currentYear && month === currentMonth) {
            if (tx.type === 'in') {
                current.income += tx.amount
            } else {
                current.expenses += tx.amount
            }
        } else if (year === prevYear && month === prevMonth) {
            if (tx.type === 'in') {
                prev.income += tx.amount
            } else {
                prev.expenses += tx.amount
            }
        }
    }

    // Calculate savings (income - expenses)
    const currentSavings = current.income - current.expenses
    const prevSavings = prev.income - prev.expenses

    // Calculate total balance from accounts
    const totalBalance = data.accounts.reduce((sum: number, acc: { balance: number }) => sum + acc.balance, 0)
    const prevBalance = totalBalance - currentSavings // Estimate previous balance

    const calcStats = (currentVal: number, prevVal: number): StatData => {
        const diff = currentVal - prevVal
        const percent = prevVal === 0 ? (currentVal === 0 ? 0 : 100) : (diff / prevVal) * 100

        return {
            value: currentVal,
            diff,
            percent: Math.abs(percent),
            trend: diff >= 0 ? 'up' : 'down',
        }
    }

    return {
        income: calcStats(current.income, prev.income),
        expenses: calcStats(current.expenses, prev.expenses),
        savings: calcStats(currentSavings, prevSavings),
        balance: {
            value: totalBalance,
            diff: currentSavings,
            percent: prevBalance === 0 ? 0 : Math.abs((currentSavings / prevBalance) * 100),
            trend: currentSavings >= 0 ? 'up' : 'down',
        },
    }
}



// ==============================================================================
// MAIN COMPONENT
// ==============================================================================

export function SectionCards({ data: externalData, isLoading: externalLoading }: SectionCardsProps = {}) {
    const { t } = useLanguage()
    const [stats, setStats] = React.useState<Record<StatKey, StatData> | null>(null)
    const [errorInfo, setErrorInfo] = React.useState<{ type: 'EMPTY_DATA' | 'UNKNOWN', details?: string } | null>(null)

    React.useEffect(() => {
        if (externalLoading) return

        if (!externalData) {
            // No data provided and not loading — show empty state with zero values
            setStats({
                income: { value: 0, diff: 0, percent: 0, trend: 'up' },
                expenses: { value: 0, diff: 0, percent: 0, trend: 'up' },
                savings: { value: 0, diff: 0, percent: 0, trend: 'up' },
                balance: { value: 0, diff: 0, percent: 0, trend: 'up' },
            })
            return
        }

        const computed = computeStats(externalData)
        setStats(computed)
    }, [externalData, externalLoading])

    // Memoize currency formatter
    const formatCurrency = React.useCallback((value: number) =>
        value.toLocaleString(t.config?.locale || 'pt-PT', { style: 'currency', currency: 'EUR' }),
    [t.config?.locale])

    // Cards configuration
    const cards: { key: StatKey; label: string }[] = React.useMemo(() => [
        { key: 'income', label: t.data_type_labels?.income || 'Income' },
        { key: 'expenses', label: t.data_type_labels?.expenses || 'Expenses' },
        { key: 'savings', label: t.data_type_labels?.savings || 'Savings' },
        { key: 'balance', label: t.data_type_labels?.balance || 'Balance' },
    ], [t.data_type_labels])

    if (errorInfo) {
        return <ErrorState type={errorInfo.type} details={errorInfo.details} />
    }

    // Loading skeleton
    if (!stats || externalLoading) {
        return (
            <div className="grid grid-cols-1 @[640px]/main:grid-cols-2 @[900px]/main:grid-cols-4 gap-4">
                {[0, 1, 2, 3].map(i => (
                    <Card key={i} className="@container/card gap-3 p-5 border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/3 backdrop-blur-sm rounded-2xl">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <Skeleton className="w-2.5 h-2.5 rounded-full" />
                                <Skeleton className="h-3.5 w-16" />
                            </div>
                            <Skeleton className="h-5 w-14 rounded-full" />
                        </div>
                        <Skeleton className="h-8 w-28 mt-1" />
                        <Skeleton className="h-3.5 w-32 mt-1" />
                    </Card>
                ))}
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 @[640px]/main:grid-cols-2 @[900px]/main:grid-cols-4 gap-4">
            {cards.map(({ key, label }, index) => {
                const stat = stats[key]
                const color = COLORS[key]
                
                // For expenses, "up" is actually bad (spending more)
                const isPositive = key === 'expenses' 
                    ? stat.trend === 'down'  // Less expenses = good
                    : stat.trend === 'up'    // More income/savings/balance = good

                return (
                    <Card 
                        key={key} 
                        className="@container/card relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.01] cursor-default group border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/3 backdrop-blur-sm rounded-2xl p-5"
                        style={{ animationDelay: `${index * 0.08}s` }}
                    >
                        {/* Top accent line */}
                        <div 
                            className="absolute top-0 left-0 right-0 h-0.5 opacity-60 group-hover:opacity-100 transition-opacity duration-300"
                            style={{ background: `linear-gradient(90deg, ${color}, transparent)` }}
                        />
                        
                        {/* Decorative gradient overlay on hover */}
                        <div 
                            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                            style={{ 
                                background: `radial-gradient(circle at 20% 0%, ${color}08 0%, transparent 60%)` 
                            }}
                        />
                        
                        <CardHeader className="flex-row justify-between items-center relative z-10 p-0 pb-3">
                            <CardDescription className="flex items-center gap-2.5 min-w-0">
                                <div 
                                    className="w-2.5 h-2.5 rounded-full shrink-0 transition-all duration-300 group-hover:scale-125 group-hover:shadow-sm" 
                                    style={{ backgroundColor: color, boxShadow: `0 0 0 3px ${color}15` }} 
                                />
                                <span className="auto-scroll text-[13px] font-medium text-neutral-500 dark:text-neutral-400">{label}</span>
                            </CardDescription>

                            <CardAction>
                                <Badge 
                                    variant="outline" 
                                    className={`text-[11px] font-semibold px-2 py-0.5 transition-all duration-200 ${isPositive
                                        ? "bg-positive-subtle text-positive border-positive-subtle" 
                                        : "bg-negative-subtle text-negative border-negative-subtle"
                                    }`}
                                >
                                    {stat.trend === 'up' ? <TrendingUp className="size-3 transition-transform group-hover:scale-110" /> : <TrendingDown className="size-3 transition-transform group-hover:scale-110" />}
                                    {stat.trend === 'down' && '-'}
                                    {stat.percent.toFixed(1)}%
                                </Badge>
                            </CardAction>
                        </CardHeader>

                        <CardTitle className="auto-scroll text-2xl font-bold tracking-tight relative z-10 transition-colors duration-200 p-0">
                            {formatCurrency(stat.value)}
                        </CardTitle>

                        <CardFooter className="relative z-10 p-0 pt-2">
                            <div className={`auto-scroll flex items-center gap-1.5 text-[12px] font-medium transition-colors duration-200 ${isPositive ? 'text-positive' : 'text-negative'}`}>
                                {stat.diff >= 0 ? '+' : ''}{formatCurrency(stat.diff)} this {(t.time_range?.month || 'month').toLowerCase()}
                                {stat.trend === 'up' ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                            </div>
                        </CardFooter>
                    </Card>
                )
            })}
        </div>
    )
}
