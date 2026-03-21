"use client"

import * as React from "react"

const AppLoadingContext = React.createContext<{
    isLoading: boolean
    setIsLoading: (loading: boolean) => void
}>({
    isLoading: true,
    setIsLoading: () => {},
})

export function AppLoadingProvider({ children }: { children: React.ReactNode }) {
    const [isLoading, setIsLoading] = React.useState(true)

    // Simulate loading - in production, replace with real data fetching
    React.useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 2000)
        return () => clearTimeout(timer)
    }, [])

    return (
        <AppLoadingContext.Provider value={{ isLoading, setIsLoading }}>
            {children}
        </AppLoadingContext.Provider>
    )
}

export function useAppLoading() {
    return React.useContext(AppLoadingContext)
}
