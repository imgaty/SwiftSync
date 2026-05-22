import { NextResponse } from "next/server"
import type { AuthContext } from "@/lib/auth-helpers"
import type { Permission } from "@/lib/permissions"

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
