//
//  chart-context.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Implements the Chart context React component for Argent, encapsulating reusable
//  interface structure, state handling, and presentation logic for feature screens.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
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
