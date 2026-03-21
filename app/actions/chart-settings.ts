"use server"

import { cookies } from "next/headers"

const COOKIE_NAME = "chart-settings"
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

interface CustomDateRange {
    startDate: string | null
    endDate: string | null
}

interface ChartInstance {
    id: string
    metricType: "income" | "expenses"
    displayMode: "area" | "bar" | "pie"
    selectedCategories: string[]
    showTotal: boolean
    periodType: string
    timeOffset: number
    customDateRange?: CustomDateRange
}

interface ChartSettings {
    charts: ChartInstance[]
    selectedChartId: string
}

export async function saveChartSettings(settings: ChartSettings): Promise<void> {
    const cookieStore = await cookies()
    
    cookieStore.set(COOKIE_NAME, JSON.stringify(settings), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: COOKIE_MAX_AGE,
        path: "/",
    })
}

export async function getChartSettings(): Promise<ChartSettings | null> {
    const cookieStore = await cookies()
    const cookie = cookieStore.get(COOKIE_NAME)
    
    if (!cookie?.value) return null
    
    try {
        return JSON.parse(cookie.value) as ChartSettings
    } catch {
        return null
    }
}

export async function clearChartSettings(): Promise<void> {
    const cookieStore = await cookies()
    cookieStore.delete(COOKIE_NAME)
}
