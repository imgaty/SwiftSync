//
//  loading-provider.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Implements the Loading provider React component for Argent, encapsulating reusable
//  interface structure, state handling, and presentation logic for feature screens.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import { LoadingScreen } from "@/components/loading-screen"

// ==============================================================================
// APP LOADING CONTEXT
// ==============================================================================

const AppLoadingContext = React.createContext<{
    isLoading: boolean
    setIsLoading: (loading: boolean) => void
}>({
    isLoading: true,
    setIsLoading: () => {},
})

const INITIAL_LOADING_DURATION_MS = 1600
const LOADING_EXIT_DURATION_MS = 450

export function AppLoadingProvider({ children }: { children: React.ReactNode }) {
    const [isLoading, setIsLoading] = React.useState(true)
    const [isVisible, setIsVisible] = React.useState(true)
    const [isFilling, setIsFilling] = React.useState(false)

    React.useEffect(() => {
        const animationFrame = window.requestAnimationFrame(() => setIsFilling(true))
        const timer = window.setTimeout(() => setIsLoading(false), INITIAL_LOADING_DURATION_MS)
        return () => {
            window.cancelAnimationFrame(animationFrame)
            window.clearTimeout(timer)
        }
    }, [])

    React.useEffect(() => {
        if (isLoading) {
            setIsVisible(true)
            return
        }

        const timer = window.setTimeout(() => setIsVisible(false), LOADING_EXIT_DURATION_MS)
        return () => window.clearTimeout(timer)
    }, [isLoading])

    const value = React.useMemo(() => ({ isLoading, setIsLoading }), [isLoading])

    return (
        <AppLoadingContext.Provider value={value}>
            {isVisible ? <LoadingScreen exiting={!isLoading} filling={isFilling} /> : null}
            {children}
        </AppLoadingContext.Provider>
    )
}

export function useAppLoading() {
    return React.useContext(AppLoadingContext)
}
