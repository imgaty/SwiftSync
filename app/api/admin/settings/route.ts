import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { logAdminAction } from "@/lib/admin-audit"

// GET /api/admin/settings — Retrieve admin profile + app stats overview
export async function GET() {
    const { admin, error } = await requireAdmin()
    if (error) return error

    const user = await prisma.user.findUnique({
        where: { id: admin!.id },
        select: {
            id: true, name: true, email: true, role: true,
            createdAt: true, lastLoginAt: true,
            twoFactorEnabled: true,
        },
    })

    // Count admins
    const admins = await prisma.user.findMany({
        where: { role: { in: ["admin", "superadmin"] } },
        select: { id: true, name: true, email: true, role: true },
    })

    return NextResponse.json({ profile: user, admins })
}
