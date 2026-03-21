"use client"

import * as React from "react"
import { PageShell, PageHeader, PageTitle, StatCards, PageSection } from "@/components/page-framework"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, CalendarDays, TrendingUp, TrendingDown, Bell } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
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
    const lastDay = new Date(year, month + 1, 0)
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

const MONTHS_PT = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const DAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
const DAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export default function CalendarPage() {
    const { t, language } = useLanguage()
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

    const months = language === "pt" ? MONTHS_PT : MONTHS_EN
    const days = language === "pt" ? DAYS_PT : DAYS_EN

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

    // Summary for current month
    const monthlyIncome = transactions
        .filter((t) => t.type === "in" && t.date.startsWith(`${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`))
        .reduce((s, t) => s + t.amount, 0)
    const monthlyExpenses = transactions
        .filter((t) => t.type === "out" && t.date.startsWith(`${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`))
        .reduce((s, t) => s + t.amount, 0)

    const upcomingBills = bills.filter((b) => b.dueDay >= today.getDate()).length

    return (
        <PageShell>
            <PageHeader
                breadcrumbs={[
                    { label: isLoading ? "" : (t.sidebar_dashboard || "Dashboard"), href: "/" },
                    { label: isLoading ? "" : (t.sidebar_calendar || "Calendar"), href: "/Calendar" },
                ]}
                isLoading={isLoading}
                actions={
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={goToToday} className="rounded-xl">
                            {language === "pt" ? "Hoje" : "Today"}
                        </Button>
                        <Button variant="outline" size="icon" onClick={prevMonth} className="h-9 w-9 rounded-xl">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={nextMonth} className="h-9 w-9 rounded-xl">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                }
            />

            <PageTitle
                title={`${months[currentMonth]} ${currentYear}`}
                description={language === "pt" ? "Vista de calendário financeiro" : "Financial calendar view"}
                isLoading={isLoading}
                icon={<CalendarDays className="h-5 w-5" />}
            />

            <StatCards
                stats={[
                    { label: language === "pt" ? "Receitas do mês" : "Monthly Income", value: `€${monthlyIncome.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`, trend: "up" as const, icon: <TrendingUp className="h-4 w-4" /> },
                    { label: language === "pt" ? "Despesas do mês" : "Monthly Expenses", value: `€${monthlyExpenses.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`, trend: "down" as const, icon: <TrendingDown className="h-4 w-4" /> },
                    { label: language === "pt" ? "Contas a vencer" : "Upcoming Bills", value: String(upcomingBills), icon: <Bell className="h-4 w-4" /> },
                ]}
                isLoading={isLoading}
            />

            {/* Calendar Grid */}
            <PageSection stagger={3}>
            <Card>
                <CardContent className="p-4">
                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-px mb-2">
                        {days.map((day) => (
                            <div key={day} className="text-center text-xs font-medium text-neutral-500 dark:text-neutral-400 py-2">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Days */}
                    <div className="grid grid-cols-7 gap-px">
                        {calendarDays.map((day, i) => {
                            const hasTransactions = day.transactions.length > 0
                            const hasBills = day.bills.length > 0
                            const income = day.transactions.filter((t) => t.type === "in").reduce((s, t) => s + t.amount, 0)
                            const expenses = day.transactions.filter((t) => t.type === "out").reduce((s, t) => s + t.amount, 0)

                            return (
                                <button
                                    key={i}
                                    onClick={() => setSelectedDay(day)}
                                    className={`
                                        relative min-h-[80px] p-1.5 text-left rounded-md transition-all border
                                        ${day.isCurrentMonth ? "bg-background" : "bg-black/5 dark:bg-white/5/30 text-neutral-500 dark:text-neutral-400"}
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
                                            <div className="text-[10px] text-green-600 truncate">
                                                +€{income.toFixed(0)}
                                            </div>
                                        )}
                                        {expenses > 0 && (
                                            <div className="text-[10px] text-red-600 truncate">
                                                -€{expenses.toFixed(0)}
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
                            {selectedDay.date.toLocaleDateString(language === "pt" ? "pt-PT" : "en-US", {
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
                                    {language === "pt" ? "Contas a vencer" : "Bills Due"}
                                </h4>
                                {selectedDay.bills.map((bill, i) => (
                                    <div key={i} className="flex justify-between items-center py-1.5 border-b last:border-0">
                                        <span className="text-sm">{bill.name}</span>
                                        <Badge variant="outline" className="text-amber-600">
                                            €{bill.amount.toFixed(2)}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Transactions */}
                        {selectedDay.transactions.length > 0 ? (
                            <div>
                                <h4 className="text-sm font-medium mb-2">
                                    {language === "pt" ? "Transações" : "Transactions"}
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
                                        <span className={`text-sm font-medium ${txn.type === "in" ? "text-green-600" : "text-red-600"}`}>
                                            {txn.type === "in" ? "+" : "-"}€{txn.amount.toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            !selectedDay.bills.length && (
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                    {language === "pt" ? "Sem movimentos neste dia." : "No transactions on this day."}
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
