//
//  utils.ts
//  Argent
//
//  Created by hilario on 22 May 2026 at 21:31.
//  Description: Implements the Utils dashboard module for Argent, shaping financial summary content,
//  supporting states, and interactions used by the dashboard experience.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import type { Bill } from "@/lib/types"

export const DAY_MS = 1000 * 60 * 60 * 24

export function startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function buildDueDate(year: number, month: number, dueDay: number) {
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const safeDay = Math.min(Math.max(dueDay || 1, 1), daysInMonth)
    return new Date(year, month, safeDay)
}

export function getNextBillDueDate(bill: Bill, now: Date) {
    const today = startOfDay(now)

    if (bill.frequency === "weekly") {
        const candidate = new Date(today)
        candidate.setDate(candidate.getDate() + 7)
        return candidate
    }

    let candidate = buildDueDate(today.getFullYear(), today.getMonth(), bill.dueDay)

    if (candidate < today) {
        const nextMonth = today.getMonth() + (bill.frequency === "yearly" ? 12 : 1)
        candidate = buildDueDate(today.getFullYear(), nextMonth, bill.dueDay)
    }

    return candidate
}

export function getMonthPrefix(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

export function formatDaysUntil(days: number, isPortuguese: boolean) {
    if (days <= 0) return isPortuguese ? "Hoje" : "Today"
    if (days === 1) return isPortuguese ? "Amanha" : "Tomorrow"
    return isPortuguese ? `em ${days}d` : `in ${days}d`
}
