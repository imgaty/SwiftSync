//
//  auth-helpers.ts
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Provides shared auth helpers logic for Argent, centralizing domain behavior, helpers, or
//  integration code used by pages, routes, and components.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { sessionVersionMatches, verifySessionToken } from "@/lib/session"

export interface AuthContext {
    userId: string
}

// Full auth context for personal-only data access.
export async function getAuthContext(): Promise<AuthContext | null> {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth-token")
    if (!authToken?.value) return null

    const session = await verifySessionToken(authToken.value)
    if (!session) return null

    const user = await prisma.user.findUnique({
        where: { id: session.uid },
        select: { id: true, status: true, sessionVersion: true },
    })

    if (!user || user.status !== "active") return null
    if (!sessionVersionMatches(session, user.sessionVersion)) return null

    return { userId: user.id }
}

// Backward-compatible helper that returns just the userId.
export async function getAuthUserId(): Promise<string | null> {
    const ctx = await getAuthContext()
    return ctx?.userId ?? null
}
