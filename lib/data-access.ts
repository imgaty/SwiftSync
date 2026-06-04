//
//  data-access.ts
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Provides shared data access logic for Argent, centralizing domain behavior, helpers, or
//  integration code used by pages, routes, and components.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import { NextResponse } from "next/server"
import type { AuthContext } from "@/lib/auth-helpers"

export type Permission =
    | "data:write"        // Create, update, delete financial data
    | "data:read"         // View financial data
    | "data:export"       // Export data
    | "data:import"       // Import data
    | "data:delete"       // Delete financial data
    | "pace:manage"       // Create/edit PACE rules
    | "bank:connect"      // Connect bank accounts

// Build Prisma filters for the current personal account.
export function scopeFilter(ctx: AuthContext): { userId: string } {
    return { userId: ctx.userId }
}

export function scopeRecordFilter(ctx: AuthContext, id: string): { id: string; userId: string } {
    return { id, userId: ctx.userId }
}

export function scopeCreateData(ctx: AuthContext): { userId: string } {
    return {
        userId: ctx.userId,
    }
}

// Permission hook kept for route consistency. In personal mode, the user owns
// every record returned by the scope helpers above.
export async function requirePermission(
    _ctx: AuthContext,
    _permission: Permission
): Promise<NextResponse | null> {
    return null
}

export async function withPermission(
    ctx: AuthContext | null,
    permission: Permission
): Promise<{ ctx: AuthContext | null; error: NextResponse | null }> {
    if (!ctx) {
        return { ctx: null, error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) }
    }

    const permError = await requirePermission(ctx, permission)
    if (permError) {
        return { ctx: null, error: permError }
    }

    return { ctx, error: null }
}
