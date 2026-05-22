// Revised on 10 Apr 2026 - 18h34
// Purpose: Provides to every child component access to the shared React Query system.

"use client"

import * as React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

function makeQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000, // 1 minute
                refetchOnWindowFocus: true,
                retry: 2,
            },
        },
    })
}

let browserQueryClient: QueryClient | undefined

function getQueryClient() {
    if (typeof window === "undefined") {
        return makeQueryClient()                                            // Server: always make a new query client
    }
    if (!browserQueryClient) browserQueryClient = makeQueryClient()         // Browser: reuse the same query client
    return browserQueryClient
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
    const queryClient = getQueryClient()

    return (
        <QueryClientProvider client = {queryClient}>
            {children}
        </QueryClientProvider>
    )
}
