"use client"

import * as React from "react"
import { PageShell, PageHeader, StatCards, PageSection } from "@/components/page-framework"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, CalendarDays, TrendingUp, TrendingDown, Bell } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { useCurrency } from "@/components/currency-provider"
import { useFinanceData } from "@/hooks/use-finance-data"
import type { Transaction, Bill } from "@/lib/types"

type CalendarDay = {
    date: Date
    isCurrentMonth: boolean
    isToday: boolean
    transactions: Transaction[]
    bills: { name: string; amount: number; dueDay: number }[]
}

function getCalendarDays(year: number, month: number, transactions: Transaction[], bills: Bill[]): CalendarDay[] {
    const firstDay = new Date(year, month, 1)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())  // Start from Sunday

    const days: CalendarDay[] = []
    const current = new Date(startDate)
    const today = new Date()

    while (days.length < 42) { // 6 weeks
        const dateStr = current.toISOString().slice(0, 10)
        const isCurrentMonth = current.getMonth() === month
        const isToday =
            current.getDate() === today.getDate() &&
            current.getMonth() === today.getMonth() &&
            current.getFullYear() === today.getFullYear()

        // Find transactions on this date
        const dayTransactions = transactions.filter((t) => t.date === dateStr)

        // Find bills due on this day
        const dayBills = bills
            .filter((b) => b.dueDay === current.getDate() && isCurrentMonth)
            .map((b) => ({ name: b.name, amount: b.amount, dueDay: b.dueDay }))

        days.push({
            date: new Date(current),
            isCurrentMonth,
            isToday,
            transactions: dayTransactions,
            bills: dayBills,
        })
        current.setDate(current.getDate() + 1)
    }

    return days
}

const DAYS_DEFAULT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export default function CalendarPage() {
    const { t } = useLanguage()
    const { formatCurrency } = useCurrency()
    const cal = (t as any).calendar_page || {} as Record<string, any>
    const { data, isLoading } = useFinanceData()

    const today = new Date()
    const [currentYear, setCurrentYear] = React.useState(today.getFullYear())
    const [currentMonth, setCurrentMonth] = React.useState(today.getMonth())
    const [selectedDay, setSelectedDay] = React.useState<CalendarDay | null>(null)

    const transactions = (data?.transactions || []) as Transaction[]
    const bills = (data?.bills || []) as Bill[]

    const calendarDays = React.useMemo(
        () => getCalendarDays(currentYear, currentMonth, transactions, bills),
        [currentYear, currentMonth, transactions, bills]
    )

    const days: string[] = cal.days_short || DAYS_DEFAULT

    const prevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11)
            setCurrentYear((y) => y - 1)
        } else {
            setCurrentMonth((m) => m - 1)
        }
        setSelectedDay(null)
    }

    const nextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0)
            setCurrentYear((y) => y + 1)
        } else {
            setCurrentMonth((m) => m + 1)
        }
        setSelectedDay(null)
    }

    const goToToday = () => {
        setCurrentYear(today.getFullYear())
        setCurrentMonth(today.getMonth())
        setSelectedDay(null)
    }

    // Summary for current month (single-pass, memoized)
    const { monthlyIncome, monthlyExpenses } = React.useMemo(() => {
        const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`
        let income = 0, expenses = 0
        for (const tx of transactions) {
            if (tx.date.startsWith(prefix)) {
                if (tx.type === "in") income += tx.amount
                else if (tx.type === "out") expenses += tx.amount
            }
        }
        return { monthlyIncome: income, monthlyExpenses: expenses }
    }, [transactions, currentYear, currentMonth])

    const upcomingBills = React.useMemo(
        () => bills.filter((b) => b.dueDay >= today.getDate()).length,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [bills]
    )

    return (
        <PageShell>
            <PageHeader
                breadcrumbs={[
                    { label: isLoading ? "" : (t.sidebar_dashboard || "Dashboard"), href: "/" },
                    { label: isLoading ? "" : (t.sidebar_calendar || "Calendar"), href: "/Calendar" },
                ]}
                isLoading={isLoading}
                actions={
                    <>
                        <Button onClick={goToToday} title={cal.today || "Today"}>
                            <CalendarDays />
                        </Button>
                        <Button onClick={prevMonth} title={cal.prev_month || "Previous month"}>
                            <ChevronLeft />
                        </Button>
                        <Button onClick={nextMonth} title={cal.next_month || "Next month"}>
                            <ChevronRight />
                        </Button>
                    </>
                }
            />


            <StatCards
                stats={[
                    { label: cal.monthly_income || "Monthly Income", value: formatCurrency(monthlyIncome), trend: "up" as const, icon: <TrendingUp className="h-4 w-4" /> },
                    { label: cal.monthly_expenses || "Monthly Expenses", value: formatCurrency(monthlyExpenses), trend: "down" as const, icon: <TrendingDown className="h-4 w-4" /> },
                    { label: cal.upcoming_bills || "Upcoming Bills", value: String(upcomingBills), icon: <Bell className="h-4 w-4" /> },
                ]}
                isLoading={isLoading}
            />

            {/* Calendar Grid */}
            <PageSection stagger={3}>
            <Card>
                <CardContent className="p-2 sm:p-4 overflow-x-auto">
                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-px mb-2 min-w-[500px]">
                        {days.map((day) => (
                            <div key={day} className="text-center text-xs font-medium text-neutral-400 py-2">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Days */}
                    <div className="grid grid-cols-7 gap-px min-w-[500px]">
                        {calendarDays.map((day) => {
                            const hasBills = day.bills.length > 0
                            const income = day.transactions.filter((t) => t.type === "in").reduce((s, t) => s + t.amount, 0)
                            const expenses = day.transactions.filter((t) => t.type === "out").reduce((s, t) => s + t.amount, 0)

                            return (
                                <button
                                    key={day.date.toISOString().slice(0, 10)}
                                    onClick={() => setSelectedDay(day)}
                                    className={`
                                        relative min-h-20 p-1.5 text-left rounded-md transition-all border
                                        ${day.isCurrentMonth ? "bg-background" : "bg-black/5 dark:bg-white/5/30 text-neutral-400"}
                                        ${day.isToday ? "ring-2 ring-primary border-primary" : "border-transparent"}
                                        ${selectedDay?.date.getTime() === day.date.getTime() ? "bg-black/5 dark:bg-white/5" : ""}
                                        hover:bg-black/5 dark:hover:bg-white/10/50
                                    `}
                                >
                                    <span className={`text-xs font-medium ${day.isToday ? "text-primary font-bold" : ""}`}>
                                        {day.date.getDate()}
                                    </span>

                                    <div className="mt-1 space-y-0.5">
                                        {income > 0 && (
                                            <div className="text-[10px] text-positive truncate">
                                                +{formatCurrency(income, { maximumFractionDigits: 0 })}
                                            </div>
                                        )}
                                        {expenses > 0 && (
                                            <div className="text-[10px] text-negative truncate">
                                                -{formatCurrency(expenses, { maximumFractionDigits: 0 })}
                                            </div>
                                        )}
                                        {hasBills && (
                                            <div className="flex gap-0.5">
                                                {day.bills.map((b, j) => (
                                                    <div key={j} className="w-1.5 h-1.5 rounded-full bg-amber-500" title={b.name} />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>

            </PageSection>

            {/* Selected Day Detail */}
            {selectedDay && (
                <PageSection stagger={4}>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">
                            {selectedDay.date.toLocaleDateString(t.config?.locale || "en-US", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            })}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Bills */}
                        {selectedDay.bills.length > 0 && (
                            <div>
                                <h4 className="text-sm font-medium mb-2 text-amber-600">
                                    {cal.bills_due || "Bills Due"}
                                </h4>
                                {selectedDay.bills.map((bill, i) => (
                                    <div key={i} className="flex justify-between items-center py-1.5 border-b last:border-0">
                                        <span className="text-sm">{bill.name}</span>
                                        <Badge variant="outline" className="text-amber-600">
                                            {formatCurrency(bill.amount)}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Transactions */}
                        {selectedDay.transactions.length > 0 ? (
                            <div>
                                <h4 className="text-sm font-medium mb-2">
                                    {t.finance?.transactions || "Transactions"}
                                </h4>
                                {selectedDay.transactions.map((txn) => (
                                    <div key={txn.id} className="flex justify-between items-center py-1.5 border-b last:border-0">
                                        <div>
                                            <span className="text-sm">{txn.description}</span>
                                            <div className="flex gap-1 mt-0.5">
                                                {txn.tags.map((tag) => (
                                                    <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                                                        {tag}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                        <span className={`text-sm font-medium ${txn.type === "in" ? "text-positive" : "text-negative"}`}>
                                            {txn.type === "in" ? "+" : "-"}{formatCurrency(txn.amount)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            !selectedDay.bills.length && (
                                <p className="text-sm text-neutral-400">
                                    {cal.no_transactions || "No transactions on this day."}
                                </p>
                            )
                        )}
                    </CardContent>
                </Card>
                </PageSection>
            )}
        </PageShell>
    )
}
