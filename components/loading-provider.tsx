"use client"

import * as React from "react"



// ==============================================================================
// APP LOADING CONTEXT (Global loading state with timer)
// ==============================================================================

const AppLoadingContext = React.createContext<{
    isLoading: boolean
    setIsLoading: (loading: boolean) => void
}>({
    isLoading: true,
    setIsLoading: () => {},
})

export function AppLoadingProvider({ children }: { children: React.ReactNode }) {
    const [isLoading, setIsLoading] = React.useState(false)

    return (
        <AppLoadingContext.Provider value={{ isLoading, setIsLoading }}>
            {children}
        </AppLoadingContext.Provider>
    )
}

export function useAppLoading() {
    return React.useContext(AppLoadingContext)
}
