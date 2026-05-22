import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { verifySessionToken } from "@/lib/session"

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
        select: { id: true, status: true },
    })

    if (!user || user.status !== "active") return null

    return { userId: user.id }
}

// Backward-compatible helper that returns just the userId.
export async function getAuthUserId(): Promise<string | null> {
    const ctx = await getAuthContext()
    return ctx?.userId ?? null
}
