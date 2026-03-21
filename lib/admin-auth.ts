// =============================================================================
// ADMIN AUTHENTICATION & AUTHORIZATION HELPERS
// =============================================================================
// Used by admin API routes and server components to verify admin access.

import { cookies, headers } from "next/headers"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifySessionToken } from "@/lib/session"

export type AdminRole = "admin" | "superadmin"
const ADMIN_ROLES: AdminRole[] = ["admin", "superadmin"]

export interface AdminUser {
    id: string
    email: string
    name: string
    role: AdminRole
    status: string
}

// -----------------------------------------------------------------------------
// getAdminUser — returns the authenticated admin user or null
// -----------------------------------------------------------------------------
export async function getAdminUser(): Promise<AdminUser | null> {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth-token")

    if (!authToken?.value) return null

    const session = await verifySessionToken(authToken.value)
    if (!session) return null

    const user = await prisma.user.findUnique({
        where: { id: session.uid },
        select: { id: true, email: true, name: true, role: true, status: true },
    })

    if (!user) return null
    if (user.status !== "active") return null
    if (!ADMIN_ROLES.includes(user.role as AdminRole)) return null

    return user as AdminUser
}

// -----------------------------------------------------------------------------
// requireAdmin — guard for admin API routes
// Returns { admin, error } — if error is set, return it immediately from the route.
// Usage:
//   const { admin, error } = await requireAdmin()
//   if (error) return error
//   // admin is guaranteed to be non-null here
// -----------------------------------------------------------------------------
export async function requireAdmin(
    requiredRole: AdminRole = "admin"
): Promise<{ admin: AdminUser | null; error: NextResponse | null }> {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth-token")

    if (!authToken?.value) {
        return {
            admin: null,
            error: NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 }
            ),
        }
    }

    const session = await verifySessionToken(authToken.value)
    if (!session) {
        return {
            admin: null,
            error: NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 }
            ),
        }
    }

    const user = await prisma.user.findUnique({
        where: { id: session.uid },
        select: { id: true, email: true, name: true, role: true, status: true },
    })

    if (!user || user.status !== "active") {
        return {
            admin: null,
            error: NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 }
            ),
        }
    }

    if (!ADMIN_ROLES.includes(user.role as AdminRole)) {
        return {
            admin: null,
            error: NextResponse.json(
                { error: "Insufficient permissions" },
                { status: 403 }
            ),
        }
    }

    // For superadmin-only routes
    if (requiredRole === "superadmin" && user.role !== "superadmin") {
        return {
            admin: null,
            error: NextResponse.json(
                { error: "Superadmin access required" },
                { status: 403 }
            ),
        }
    }

    return { admin: user as AdminUser, error: null }
}

// -----------------------------------------------------------------------------
// getClientIp — extract client IP from request headers
// -----------------------------------------------------------------------------
export async function getClientIp(): Promise<string> {
    const hdrs = await headers()
    return (
        hdrs.get("x-forwarded-for")?.split(",")[0].trim() ??
        hdrs.get("x-real-ip") ??
        "unknown"
    )
}
