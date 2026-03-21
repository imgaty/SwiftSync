"use client"

import * as React from "react"
import type { ChartContextValue } from "@/lib/chart-types"

// ==============================================================================
// CHART CONTEXT
// ==============================================================================

const ChartContext = React.createContext<ChartContextValue | null>(null)

export function ChartProvider({ 
    children, 
    value 
}: { 
    children: React.ReactNode
    value: ChartContextValue 
}) {
    return (
        <ChartContext.Provider value={value}>
            {children}
        </ChartContext.Provider>
    )
}

export function useChartContext(): ChartContextValue {
    const context = React.useContext(ChartContext)
    if (!context) {
        throw new Error('useChartContext must be used within a ChartProvider')
    }
    return context
}
