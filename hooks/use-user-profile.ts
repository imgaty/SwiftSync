//
//  use-user-profile.ts
//  Argent
//
//  Created by OpenAI on 03 June 2026.
//  Description: Provides the shared authenticated user profile query.
//
"use client"

import { useQuery, type QueryFunctionContext } from "@tanstack/react-query"
import { AuthError, queryKeys } from "@/lib/query-keys"

export interface UserProfile {
    id: string
    name: string
    email: string
    avatar?: string
    role: string
    dateOfBirth?: string
    initials?: string
    createdAt?: string
}

async function fetchUserProfile({ signal }: QueryFunctionContext<typeof queryKeys.profile>): Promise<UserProfile> {
    const response = await fetch("/api/auth/profile", {
        cache: "no-store",
        credentials: "include",
        headers: {
            "cache-control": "no-cache",
            pragma: "no-cache",
        },
        signal,
    })

    if (response.status === 401) {
        throw new AuthError("Not authenticated")
    }

    if (!response.ok) {
        throw new Error("Failed to fetch user profile")
    }

    return await response.json() as UserProfile
}

export function useUserProfile() {
    return useQuery({
        queryKey: queryKeys.profile,
        queryFn: fetchUserProfile,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
            if (error instanceof AuthError) return false
            return failureCount < 2
        },
    })
}
