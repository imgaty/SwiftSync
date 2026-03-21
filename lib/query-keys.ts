"use client"

/**
 * Centralized query keys for React Query.
 * Using a factory pattern ensures consistent, type-safe cache keys.
 */
export const queryKeys = {
    // Finance data (accounts, transactions, budgets, bills)
    accounts: ["accounts"] as const,
    transactions: ["transactions"] as const,
    budgets: ["budgets"] as const,
    bills: ["bills"] as const,
    financeData: ["financeData"] as const,

    // Goals
    goals: ["goals"] as const,

    // Cash flow
    cashflow: (accountIds?: string) => ["cashflow", accountIds ?? "all"] as const,

    // Notifications
    notifications: ["notifications"] as const,

    // Bank connections
    bankConnections: ["bankConnections"] as const,

    // Settings
    profile: ["profile"] as const,
    categorizationRules: ["categorizationRules"] as const,
}

/**
 * Shared fetch helper that handles auth errors consistently.
 * Throws on non-OK responses (except 401 which returns empty arrays).
 */
export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, options)
    if (res.status === 401) {
        throw new AuthError("Not authenticated")
    }
    if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new ApiError(body.error || `API error (${res.status})`, res.status)
    }
    return res.json()
}

export class AuthError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "AuthError"
    }
}

export class ApiError extends Error {
    status: number
    constructor(message: string, status: number) {
        super(message)
        this.name = "ApiError"
        this.status = status
    }
}
