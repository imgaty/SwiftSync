//
//  page.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Renders the /Calendar route in Argent, composing page-level layout, data dependencies,
//  and feature components for that user-facing screen.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import { PageShell, PageHeader, PageSection } from "@/components/page-framework"
import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SmartTooltip } from "@/components/ui/tooltip"
import {
    ArrowDownRight,
    ArrowUpRight,
    Bell,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Receipt,
    TrendingDown,
    TrendingUp,
    Wallet,
} from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { useCurrency } from "@/components/currency-provider"
import { useFinanceData } from "@/hooks/use-finance-data"
import type { Transaction, Bill } from "@/lib/types"
import { getTranslations } from "@/lib/translation-utils"
import { UDS } from "@/lib/UDS"
import { cn } from "@/lib/utils"

type CalendarBill = Pick<Bill, "id" | "name" | "amount" | "dueDay" | "frequency" | "category">

type CalendarDay = {
    date: Date
    key: string
    isCurrentMonth: boolean
    isToday: boolean
    transactions: Transaction[]
    bills: CalendarBill[]
    income: number
    expenses: number
}

const DAYS_DEFAULT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const EMPTY_TRANSACTIONS: Transaction[] = []
const EMPTY_BILLS: Bill[] = []

function formatDateKey(date: Date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
}

function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate()
}

function getScheduledDueDay(dueDay: number, year: number, month: number) {
    const safeDueDay = Number.isFinite(dueDay) ? dueDay : 1
    return Math.min(Math.max(1, safeDueDay), getDaysInMonth(year, month))
}

function countLabel(template: string | undefined, count: number, fallback: string) {
    return (template || fallback).replace("%count", String(count))
}

function getCalendarDays(year: number, month: number, transactions: Transaction[], bills: Bill[]): CalendarDay[] {
    const transactionsByDate = new Map<string, Transaction[]>()
    const billsByDueDay = new Map<number, CalendarBill[]>()

    for (const transaction of transactions) {
        const group = transactionsByDate.get(transaction.date)
        if (group) group.push(transaction)
        else transactionsByDate.set(transaction.date, [transaction])
    }

    for (const bill of bills) {
        const dueDay = getScheduledDueDay(bill.dueDay, year, month)
        const group = billsByDueDay.get(dueDay)
        const calendarBill = {
            id: bill.id,
            name: bill.name,
            amount: bill.amount,
            dueDay,
            frequency: bill.frequency,
            category: bill.category,
        }

        if (group) group.push(calendarBill)
        else billsByDueDay.set(dueDay, [calendarBill])
    }

    const firstDay = new Date(year, month, 1)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    const days: CalendarDay[] = []
    const current = new Date(startDate)
    const todayKey = formatDateKey(new Date())

    while (days.length < 42) {
        const key = formatDateKey(current)
        const isCurrentMonth = current.getMonth() === month
        const dayTransactions = transactionsByDate.get(key) ?? EMPTY_TRANSACTIONS
        let income = 0
        let expenses = 0

        for (const transaction of dayTransactions) {
            if (transaction.type === "in") income += transaction.amount
            else expenses += transaction.amount
        }

        days.push({
            date: new Date(current),
            key,
            isCurrentMonth,
            isToday: key === todayKey,
            transactions: dayTransactions,
            bills: isCurrentMonth ? billsByDueDay.get(current.getDate()) ?? [] : [],
            income,
            expenses,
        })
        current.setDate(current.getDate() + 1)
    }

    return days
}

function DetailMetric({
    label,
    value,
    tone = "neutral",
    icon,
}: {
    label: string
    value: string
    tone?: "positive" | "negative" | "accent" | "neutral"
    icon: React.ReactNode
}) {
    return (
        <div className={`${UDS.inlineSurface} min-w-0 px-2.5 py-2`}>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                {icon}
                <span className="truncate">{label}</span>
            </div>
            <p className={cn(
                "mt-1 truncate text-sm font-semibold tabular-nums",
                tone === "positive" && "text-positive",
                tone === "negative" && "text-negative",
                tone === "accent" && "text-amber-700 dark:text-amber-300",
            )}>
                {value}
            </p>
        </div>
    )
}

function SummaryMetric({
    label,
    value,
    tone = "neutral",
    icon,
}: {
    label: string
    value: string
    tone?: "positive" | "negative" | "accent" | "neutral"
    icon: React.ReactNode
}) {
    return (
        <div className={`${UDS.inlineSurface} flex min-w-0 items-center gap-2 px-2.5 py-2`}>
            <span className={cn(
                "flex size-7 shrink-0 items-center justify-center",
                UDS.iconSurface,
                tone === "positive" && "border-positive-subtle text-positive",
                tone === "negative" && "border-negative-subtle text-negative",
                tone === "accent" && "border-amber-500/25 text-amber-700 dark:text-amber-300",
                tone === "neutral" && "text-muted-foreground",
            )}>
                {icon}
            </span>
            <div className="min-w-0">
                <p className="truncate text-[11px] font-medium text-muted-foreground">{label}</p>
                <p className={cn(
                    "truncate text-sm font-semibold tabular-nums",
                    tone === "positive" && "text-positive",
                    tone === "negative" && "text-negative",
                    tone === "accent" && "text-amber-700 dark:text-amber-300",
                )}>
                    {value}
                </p>
            </div>
        </div>
    )
}

function CalendarDayIndicator({
    children,
    className,
    label,
}: {
    children: React.ReactNode
    className?: string
    label: string
}) {
    return (
        <SmartTooltip text={label} group="calendar-day-indicators" forceSide="top">
            <span
                role="img"
                aria-label={label}
                className={cn("inline-flex shrink-0 items-center justify-center", className)}
            >
                {children}
            </span>
        </SmartTooltip>
    )
}

export default function CalendarPage() {
    const { t } = useLanguage()
    const { formatCurrency } = useCurrency()
    const cal = getTranslations(t, "calendar_page")
    const { data, isLoading } = useFinanceData()
    const locale = t.config?.locale || "en-US"

    const todayInfo = React.useMemo(() => {
        const date = new Date()
        return {
            day: date.getDate(),
            key: formatDateKey(date),
            month: date.getMonth(),
            year: date.getFullYear(),
        }
    }, [])
    const { day: todayDay, key: todayKey, month: todayMonth, year: todayYear } = todayInfo
    const [currentYear, setCurrentYear] = React.useState(todayYear)
    const [currentMonth, setCurrentMonth] = React.useState(todayMonth)
    const [selectedDateKey, setSelectedDateKey] = React.useState<string | null>(todayKey)

    const transactions = data?.transactions ?? EMPTY_TRANSACTIONS
    const bills = data?.bills ?? EMPTY_BILLS

    const calendarDays = React.useMemo(
        () => getCalendarDays(currentYear, currentMonth, transactions, bills),
        [currentYear, currentMonth, transactions, bills]
    )

    const selectedDay = React.useMemo(
        () => selectedDateKey ? calendarDays.find((day) => day.key === selectedDateKey) ?? null : null,
        [calendarDays, selectedDateKey]
    )

    const configuredDays = cal.days_short as unknown
    const days: string[] = Array.isArray(configuredDays) && configuredDays.length >= 7
        ? configuredDays.slice(0, 7).map(String)
        : DAYS_DEFAULT

    const prevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11)
            setCurrentYear((year) => year - 1)
        } else {
            setCurrentMonth((month) => month - 1)
        }
        setSelectedDateKey(null)
    }

    const nextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0)
            setCurrentYear((year) => year + 1)
        } else {
            setCurrentMonth((month) => month + 1)
        }
        setSelectedDateKey(null)
    }

    const goToToday = () => {
        const now = new Date()
        setCurrentYear(now.getFullYear())
        setCurrentMonth(now.getMonth())
        setSelectedDateKey(formatDateKey(now))
    }

    const monthLabel = React.useMemo(() => {
        return new Date(currentYear, currentMonth, 1).toLocaleDateString(locale, {
            month: "long",
            year: "numeric",
        })
    }, [currentMonth, currentYear, locale])

    const monthRangeLabel = React.useMemo(() => {
        const start = new Date(currentYear, currentMonth, 1)
        const end = new Date(currentYear, currentMonth + 1, 0)
        const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }
        return `${start.toLocaleDateString(locale, options)} - ${end.toLocaleDateString(locale, options)}`
    }, [currentMonth, currentYear, locale])

    const monthlySummary = React.useMemo(() => {
        const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`
        const isPastMonth =
            currentYear < todayYear ||
            (currentYear === todayYear && currentMonth < todayMonth)
        const isFutureMonth =
            currentYear > todayYear ||
            (currentYear === todayYear && currentMonth > todayMonth)
        const activeDayKeys = new Set<string>()
        let monthlyIncome = 0
        let monthlyExpenses = 0
        let upcomingBills = 0
        let upcomingBillTotal = 0
        let monthlyBillTotal = 0

        for (const transaction of transactions) {
            if (!transaction.date.startsWith(prefix)) continue
            activeDayKeys.add(transaction.date)
            if (transaction.type === "in") monthlyIncome += transaction.amount
            else monthlyExpenses += transaction.amount
        }

        for (const bill of bills) {
            const dueDay = getScheduledDueDay(bill.dueDay, currentYear, currentMonth)
            monthlyBillTotal += bill.amount
            activeDayKeys.add(`${prefix}-${String(dueDay).padStart(2, "0")}`)

            if (isFutureMonth || (!isPastMonth && dueDay >= todayDay)) {
                upcomingBills += 1
                upcomingBillTotal += bill.amount
            }
        }

        return {
            activeDays: activeDayKeys.size,
            monthlyBillTotal,
            monthlyExpenses,
            monthlyIncome,
            monthlyNet: monthlyIncome - monthlyExpenses,
            upcomingBills,
            upcomingBillTotal,
        }
    }, [bills, currentMonth, currentYear, todayDay, todayMonth, todayYear, transactions])

    const activityDays = React.useMemo(
        () => calendarDays.filter((day) => day.isCurrentMonth && (day.transactions.length > 0 || day.bills.length > 0)),
        [calendarDays]
    )

    const formatCompactCurrency = React.useCallback(
        (amount: number) => formatCurrency(amount, { maximumFractionDigits: 0 }),
        [formatCurrency]
    )

    const selectedBillTotal = selectedDay?.bills.reduce((sum, bill) => sum + bill.amount, 0) ?? 0
    const selectedNet = selectedDay ? selectedDay.income - selectedDay.expenses : 0

    return (
        <PageShell className="min-h-full gap-3 overflow-x-hidden overflow-y-visible p-3 md:p-4">
            <PageHeader
                breadcrumbs={[
                    { label: isLoading ? "" : (t.sidebar_dashboard || "Dashboard"), href: "/" },
                    { label: isLoading ? "" : (t.sidebar_calendar || "Calendar"), href: "/Calendar" },
                ]}
                isLoading={isLoading}
                actions={
                    <>
                        <SmartTooltip text={cal.today || "Today"} group="calendar-header-actions" forceSide="bottom">
                            <Button type="button" onClick={goToToday} aria-label={cal.today || "Today"}>
                                <CalendarDays />
                            </Button>
                        </SmartTooltip>
                        <SmartTooltip text={cal.prev_month || "Previous month"} group="calendar-header-actions" forceSide="bottom">
                            <Button type="button" onClick={prevMonth} aria-label={cal.prev_month || "Previous month"}>
                                <ChevronLeft />
                            </Button>
                        </SmartTooltip>
                        <SmartTooltip text={cal.next_month || "Next month"} group="calendar-header-actions" forceSide="bottom">
                            <Button type="button" onClick={nextMonth} aria-label={cal.next_month || "Next month"}>
                                <ChevronRight />
                            </Button>
                        </SmartTooltip>
                    </>
                }
            />

            <PageSection stagger={2} fill className="min-h-0 flex-1">
                <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_minmax(160px,32vh)] gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] lg:grid-rows-1">
                    <section className={cn(UDS.cardSurface, "flex min-h-0 min-w-0 flex-col overflow-hidden p-0")}>
                        <div className={cn("flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-3 py-2.5 sm:px-4", UDS.cardDivider)}>
                            <div className="flex min-w-0 items-center gap-2.5">
                                <div className={cn(UDS.cardSurface, "flex size-9 shrink-0 items-center justify-center text-foreground-secondary")}>
                                    <CalendarDays className="size-4.5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                                        {cal.title || "Cash calendar"}
                                    </p>
                                    <h1 className="truncate text-lg font-semibold leading-tight tracking-tight capitalize text-foreground">
                                        {monthLabel}
                                    </h1>
                                </div>
                            </div>

                            <div className="flex min-w-0 items-center gap-1.5">
                                <Badge variant="outline" className={cn("hidden text-muted-foreground sm:inline-flex", UDS.pillSurface)}>
                                    {monthRangeLabel}
                                </Badge>
                                <Badge variant="outline" className={cn("hidden text-muted-foreground md:inline-flex", UDS.pillSurface)}>
                                    {countLabel(cal.active_days_change, monthlySummary.activeDays, "%count active days")}
                                </Badge>
                                <SmartTooltip text={cal.prev_month || "Previous month"} group="calendar-month-actions" forceSide="bottom">
                                    <Button type="button" variant="glass" size="icon-sm" onClick={prevMonth} aria-label={cal.prev_month || "Previous month"}>
                                        <ChevronLeft className="size-3.5" />
                                    </Button>
                                </SmartTooltip>
                                <SmartTooltip text={cal.today || "Today"} group="calendar-month-actions" forceSide="bottom">
                                    <Button type="button" variant="glass" size="sm" onClick={goToToday} aria-label={cal.today || "Today"} className="h-7 sq-full px-2.5">
                                        <CalendarDays className="size-3.5" />
                                        <span className="hidden sm:inline">{cal.today || "Today"}</span>
                                    </Button>
                                </SmartTooltip>
                                <SmartTooltip text={cal.next_month || "Next month"} group="calendar-month-actions" forceSide="bottom">
                                    <Button type="button" variant="glass" size="icon-sm" onClick={nextMonth} aria-label={cal.next_month || "Next month"}>
                                        <ChevronRight className="size-3.5" />
                                    </Button>
                                </SmartTooltip>
                            </div>
                        </div>

                        <div className={cn("grid shrink-0 grid-cols-2 gap-2 border-b px-3 py-2 sm:grid-cols-4 sm:px-4", UDS.cardDivider)}>
                            <SummaryMetric
                                label={cal.monthly_income || "Monthly Income"}
                                value={formatCompactCurrency(monthlySummary.monthlyIncome)}
                                tone="positive"
                                icon={<TrendingUp className="size-3.5" />}
                            />
                            <SummaryMetric
                                label={cal.monthly_expenses || "Monthly Expenses"}
                                value={formatCompactCurrency(monthlySummary.monthlyExpenses)}
                                tone="negative"
                                icon={<TrendingDown className="size-3.5" />}
                            />
                            <SummaryMetric
                                label={cal.net_flow || "Net Flow"}
                                value={`${monthlySummary.monthlyNet >= 0 ? "+" : ""}${formatCompactCurrency(monthlySummary.monthlyNet)}`}
                                tone={monthlySummary.monthlyNet >= 0 ? "positive" : "negative"}
                                icon={<Wallet className="size-3.5" />}
                            />
                            <SummaryMetric
                                label={cal.upcoming_bills || "Upcoming Bills"}
                                value={`${monthlySummary.upcomingBills} · ${formatCompactCurrency(monthlySummary.upcomingBillTotal)}`}
                                tone="accent"
                                icon={<Bell className="size-3.5" />}
                            />
                        </div>

                        <div className="min-h-0 flex-1 p-2 sm:p-3">
                            <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-1.5">
                                <div className="grid grid-cols-7 gap-1.5">
                                    {days.map((day) => (
                                        <div key={day} className="truncate px-1 py-1 text-center text-[10px] font-semibold uppercase text-muted-foreground sm:text-[11px]">
                                            {day}
                                        </div>
                                    ))}
                                </div>

                                <div className="grid min-h-0 grid-cols-7 grid-rows-[repeat(6,minmax(0,1fr))] gap-1.5">
                                    {calendarDays.map((day) => {
                                        const totalMovement = day.income + day.expenses
                                        const incomeShare = totalMovement > 0 ? (day.income / totalMovement) * 100 : 0
                                        const isSelected = selectedDateKey === day.key
                                        const dayLabel = day.date.toLocaleDateString(locale, {
                                            weekday: "long",
                                            month: "long",
                                            day: "numeric",
                                        })
                                        const txCountLabel = countLabel(cal.transaction_count, day.transactions.length, "%count txns")
                                        const billCountLabel = countLabel(cal.bill_count, day.bills.length, "%count bills")
                                        const incomeLabel = `${cal.income || "Income"}: +${formatCompactCurrency(day.income)}`
                                        const expensesLabel = `${cal.expenses || "Expenses"}: -${formatCompactCurrency(day.expenses)}`

                                        return (
                                            <Button
                                                variant="ghost"
                                                key={day.key}
                                                type="button"
                                                aria-label={`${dayLabel}: ${txCountLabel}, ${billCountLabel}`}
                                                aria-pressed={isSelected}
                                                onClick={() => setSelectedDateKey(day.key)}
                                                className={cn(
                                                    UDS.inlineSurface,
                                                    "group relative flex h-full min-h-0 w-full flex-col items-stretch justify-start whitespace-normal p-1.5 text-left transition-all sm:p-2",
                                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70",
                                                    day.isCurrentMonth
                                                        ? cn("text-foreground", UDS.itemHover)
                                                        : cn("text-muted-foreground/55 hover:text-muted-foreground", UDS.itemHover),
                                                    day.isToday && "border-primary/50 ring-1 ring-primary/30",
                                                    isSelected && UDS.selectedControl,
                                                )}
                                            >
                                                <div className="flex shrink-0 items-start justify-between gap-1">
                                                    <span className={cn(
                                                        "flex size-6 shrink-0 items-center justify-center sq-full text-xs font-semibold tabular-nums",
                                                        day.isToday && "bg-primary text-primary-foreground",
                                                    )}>
                                                        {day.date.getDate()}
                                                    </span>

                                                    <div className="hidden min-w-0 shrink-0 items-center gap-1 sm:flex">
                                                        {day.transactions.length > 0 && (
                                                            <CalendarDayIndicator label={txCountLabel} className={cn(UDS.pillSurface, "size-5 text-muted-foreground")}>
                                                                <Wallet className="size-3" />
                                                            </CalendarDayIndicator>
                                                        )}
                                                        {day.bills.length > 0 && (
                                                            <CalendarDayIndicator label={billCountLabel} className="size-5 sq-full border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                                                                <Receipt className="size-3" />
                                                            </CalendarDayIndicator>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="mt-1 hidden min-h-0 flex-1 flex-col gap-0.5 overflow-hidden sm:flex">
                                                    {day.income > 0 && (
                                                        <div className="flex min-w-0 items-center gap-1 text-[11px] font-semibold text-positive">
                                                            <ArrowUpRight className="size-3 shrink-0" />
                                                            <span className="truncate tabular-nums">+{formatCompactCurrency(day.income)}</span>
                                                        </div>
                                                    )}
                                                    {day.expenses > 0 && (
                                                        <div className="flex min-w-0 items-center gap-1 text-[11px] font-semibold text-negative">
                                                            <ArrowDownRight className="size-3 shrink-0" />
                                                            <span className="truncate tabular-nums">-{formatCompactCurrency(day.expenses)}</span>
                                                        </div>
                                                    )}
                                                    {day.bills.length > 0 && (
                                                        <div className="hidden min-w-0 items-center gap-1 text-[10px] font-medium text-amber-700 dark:text-amber-300 md:flex">
                                                            <Receipt className="size-3 shrink-0" />
                                                            <span className="truncate">
                                                                {day.bills[0].name}
                                                                {day.bills.length > 1 ? ` ${countLabel(cal.more_items, day.bills.length - 1, "+%count more")}` : ""}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="mt-auto flex items-center gap-1 pt-1 sm:hidden">
                                                    {day.transactions.length > 0 && (
                                                        <CalendarDayIndicator label={txCountLabel} className="size-4 sq-full bg-foreground-secondary/10 text-foreground-secondary">
                                                            <Wallet className="size-2.5" />
                                                        </CalendarDayIndicator>
                                                    )}
                                                    {day.bills.length > 0 && (
                                                        <CalendarDayIndicator label={billCountLabel} className="size-4 sq-full bg-amber-500/10 text-amber-700 dark:text-amber-300">
                                                            <Receipt className="size-2.5" />
                                                        </CalendarDayIndicator>
                                                    )}
                                                    {day.income > 0 && (
                                                        <CalendarDayIndicator label={incomeLabel} className="size-4 sq-full bg-positive/10 text-positive">
                                                            <ArrowUpRight className="size-2.5" />
                                                        </CalendarDayIndicator>
                                                    )}
                                                    {day.expenses > 0 && (
                                                        <CalendarDayIndicator label={expensesLabel} className="size-4 sq-full bg-negative/10 text-negative">
                                                            <ArrowDownRight className="size-2.5" />
                                                        </CalendarDayIndicator>
                                                    )}
                                                </div>

                                                <div className="mt-auto hidden pt-1.5 sm:block">
                                                    {totalMovement > 0 ? (
                                                        <div className={cn("flex h-1.5 overflow-hidden sq-full", UDS.subtleFill)}>
                                                            {day.income > 0 && (
                                                                <span className="bg-positive" style={{ width: `${incomeShare}%` }} />
                                                            )}
                                                            {day.expenses > 0 && (
                                                                <span className="bg-negative" style={{ width: `${100 - incomeShare}%` }} />
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className={cn("h-1.5 sq-full", UDS.subtleFill)} />
                                                    )}
                                                </div>
                                            </Button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </section>

                    <aside className={cn(UDS.cardSurface, "flex min-h-0 min-w-0 flex-col overflow-hidden p-0")}>
                        {selectedDay ? (
                            <>
                                <div className={cn("shrink-0 border-b p-3 sm:p-4", UDS.cardDivider)}>
                                    <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                                        {cal.selected_day || "Selected day"}
                                    </p>
                                    <h2 className="mt-1 text-lg font-semibold leading-tight tracking-tight">
                                        {selectedDay.date.toLocaleDateString(locale, {
                                            weekday: "long",
                                            month: "long",
                                            day: "numeric",
                                        })}
                                    </h2>
                                </div>

                                <div className="dashboard-sidebar-scroll min-h-0 flex-1 space-y-4 overflow-y-auto p-3 sm:space-y-5 sm:p-4">
                                    <div className="grid grid-cols-3 gap-2">
                                        <DetailMetric
                                            label={cal.income || "Income"}
                                            value={formatCompactCurrency(selectedDay.income)}
                                            tone="positive"
                                            icon={<ArrowUpRight className="size-3.5" />}
                                        />
                                        <DetailMetric
                                            label={cal.expenses || "Expenses"}
                                            value={formatCompactCurrency(selectedDay.expenses)}
                                            tone="negative"
                                            icon={<ArrowDownRight className="size-3.5" />}
                                        />
                                        <DetailMetric
                                            label={cal.due || "Due"}
                                            value={formatCompactCurrency(selectedBillTotal)}
                                            tone="accent"
                                            icon={<Receipt className="size-3.5" />}
                                        />
                                    </div>

                                    <div>
                                        <h3 className="mb-2 text-xs font-semibold text-muted-foreground">
                                            {cal.daily_summary || "Daily summary"}
                                        </h3>
                                        <div className={cn("flex items-center justify-between gap-3 border-y py-2.5", UDS.cardDivider)}>
                                            <span className="text-sm text-muted-foreground">{cal.net || "Net"}</span>
                                            <span className={cn(
                                                "text-sm font-semibold tabular-nums",
                                                selectedNet >= 0 ? "text-positive" : "text-negative",
                                            )}>
                                                {selectedNet >= 0 ? "+" : ""}{formatCurrency(selectedNet)}
                                            </span>
                                        </div>
                                    </div>

                                    {selectedDay.bills.length > 0 && (
                                        <div>
                                            <h3 className="mb-2 text-xs font-semibold text-muted-foreground">
                                                {cal.bills_due || "Bills Due"}
                                            </h3>
                                            <div className={cn("divide-y", UDS.divideLine)}>
                                                {selectedDay.bills.map((bill) => (
                                                    <div key={bill.id} className="flex items-center justify-between gap-3 py-2.5">
                                                        <div className="flex min-w-0 items-center gap-2">
                                                            <span className="flex size-7 shrink-0 items-center justify-center sq-lg bg-amber-500/10 text-amber-700 dark:text-amber-300">
                                                                <Receipt className="size-3.5" />
                                                            </span>
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm font-medium">{bill.name}</p>
                                                                <p className="truncate text-[11px] text-muted-foreground">{bill.category}</p>
                                                            </div>
                                                        </div>
                                                        <span className="shrink-0 text-sm font-semibold tabular-nums text-amber-700 dark:text-amber-300">
                                                            {formatCurrency(bill.amount)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {selectedDay.transactions.length > 0 ? (
                                        <div>
                                            <h3 className="mb-2 text-xs font-semibold text-muted-foreground">
                                                {cal.transactions || t.finance?.transactions || "Transactions"}
                                            </h3>
                                            <div className={cn("divide-y", UDS.divideLine)}>
                                                {selectedDay.transactions.map((txn) => (
                                                    <div key={txn.id} className="py-2.5">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm font-medium">{txn.description}</p>
                                                                <div className="mt-1 flex flex-wrap gap-1">
                                                                    {txn.tags.map((tag) => (
                                                                        <Badge key={tag} variant="secondary" className="px-1.5 py-0 text-[10px]">
                                                                            {tag}
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <span className={cn(
                                                                "shrink-0 text-sm font-semibold tabular-nums",
                                                                txn.type === "in" ? "text-positive" : "text-negative",
                                                            )}>
                                                                {txn.type === "in" ? "+" : "-"}{formatCurrency(txn.amount)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        selectedDay.bills.length === 0 && (
                                            <EmptyState
                                                variant="no-transactions"
                                                placement="card"
                                                title={cal.no_transactions || "No transactions on this day."}
                                                description=""
                                                className="min-h-[120px] px-3 py-6"
                                            />
                                        )
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className={cn("shrink-0 border-b p-3 sm:p-4", UDS.cardDivider)}>
                                    <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                                        {cal.month_at_a_glance || "Month at a glance"}
                                    </p>
                                    <h2 className="mt-1 text-lg font-semibold leading-tight tracking-tight capitalize">
                                        {monthLabel}
                                    </h2>
                                </div>

                                <div className="dashboard-sidebar-scroll min-h-0 flex-1 space-y-4 overflow-y-auto p-3 sm:space-y-5 sm:p-4">
                                    <div className="grid grid-cols-2 gap-2">
                                        <DetailMetric
                                            label={cal.net || "Net"}
                                            value={`${monthlySummary.monthlyNet >= 0 ? "+" : ""}${formatCompactCurrency(monthlySummary.monthlyNet)}`}
                                            tone={monthlySummary.monthlyNet >= 0 ? "positive" : "negative"}
                                            icon={<Wallet className="size-3.5" />}
                                        />
                                        <DetailMetric
                                            label={cal.total_due || "Total due"}
                                            value={formatCompactCurrency(monthlySummary.monthlyBillTotal)}
                                            tone="accent"
                                            icon={<Receipt className="size-3.5" />}
                                        />
                                    </div>

                                    <div>
                                        <h3 className="mb-2 text-xs font-semibold text-muted-foreground">
                                            {cal.activity || "Activity"}
                                        </h3>
                                        {activityDays.length > 0 ? (
                                            <div className={cn("divide-y", UDS.divideLine)}>
                                                {activityDays.slice(0, 6).map((day) => {
                                                    const net = day.income - day.expenses
                                                    return (
                                                        <Button variant="ghost"
                                                            key={day.key}
                                                            type="button"
                                                            onClick={() => setSelectedDateKey(day.key)}
                                                            className="flex w-full items-center justify-between gap-3 py-2.5 text-left transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
                                                        >
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm font-medium">
                                                                    {day.date.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" })}
                                                                </p>
                                                                <p className="truncate text-[11px] text-muted-foreground">
                                                                    {countLabel(cal.transaction_count, day.transactions.length, "%count txns")}
                                                                    {day.bills.length > 0 ? `, ${countLabel(cal.bill_count, day.bills.length, "%count bills")}` : ""}
                                                                </p>
                                                            </div>
                                                            <span className={cn(
                                                                "shrink-0 text-sm font-semibold tabular-nums",
                                                                net >= 0 ? "text-positive" : "text-negative",
                                                            )}>
                                                                {net >= 0 ? "+" : ""}{formatCompactCurrency(net)}
                                                            </span>
                                                        </Button>
                                                    )
                                                })}
                                            </div>
                                        ) : (
                                            <EmptyState
                                                variant="no-events"
                                                placement="card"
                                                title={cal.no_activity || "No activity this month."}
                                                description={cal.select_day_hint || "Daily transactions and bills appear here."}
                                                className="min-h-[150px] px-3 py-6"
                                            />
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </aside>
                </div>
            </PageSection>
        </PageShell>
    )
}
