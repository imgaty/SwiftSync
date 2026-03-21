// Get the currently authenticated user ID from cookies. Used by API routes and server components to identify the user making the request.



import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { verifySessionToken } from "@/lib/session"

export async function getAuthUserId(): Promise<string | null> {
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

    return user.id
}