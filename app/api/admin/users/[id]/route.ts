//
//  route.ts
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Handles the /api/admin/users/[id] API endpoint for Argent, keeping request parsing,
//  business operations, and response formatting at the route boundary.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
/* Admin actions on a single user.
 *
 * GET returns the admin detail view; PATCH performs a privileged action
 * (suspend / unsuspend / ban / activate / change_role / reset_2fa /
 * force_reset_password / delete). Every action is audit-logged.
 *
 * Learn more in `docs/Admin System.md`
 */

import { NextRequest, NextResponse } from "next/server"
import { randomBytes, createHash } from "crypto"
import { requireAdmin } from "@/lib/admin-auth"
import { logAdminAction, ADMIN_ACTIONS } from "@/lib/admin-audit"
import { sendPasswordResetEmail } from "@/lib/email"
import { prisma } from "@/lib/prisma"

interface RouteParams {
    params: Promise<{ id: string }>
}

// GET /api/admin/users/[id] — Detailed user profile for admin view
export async function GET(_request: NextRequest, { params }: RouteParams) {
    const { admin, error } = await requireAdmin()
    if (error) return error

    const { id } = await params

    const user = await prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            email: true,
            dateOfBirth: true,
            recoveryEmail: true,
            role: true,
            status: true,
            twoFactorEnabled: true,
            createdAt: true,
            updatedAt: true,
            lastLoginAt: true,
            lastLoginIp: true,
            suspendedAt: true,
            suspendedReason: true,
            _count: {
                select: {
                    transactions: true,
                    bankAccounts: true,
                    bills: true,
                    budgets: true,
                    financialGoals: true,
                    notifications: true,
                    PACERules: true,
                    oauthAccounts: true,
                    trustedDevices: true,
                    saltEdgeConnections: true,
                },
            },
            bankAccounts: {
                select: {
                    id: true,
                    cardName: true,
                    accountType: true,
                    balance: true,
                    createdAt: true,
                    bank: { select: { name: true } },
                },
                orderBy: { createdAt: "desc" },
                take: 10,
            },
            transactions: {
                select: {
                    id: true,
                    description: true,
                    amount: true,
                    type: true,
                    date: true,
                    tags: true,
                    createdAt: true,
                },
                orderBy: { createdAt: "desc" },
                take: 10,
            },
            oauthAccounts: {
                select: {
                    id: true,
                    provider: true,
                    createdAt: true,
                },
            },
            auditLogs: {
                orderBy: { createdAt: "desc" },
                take: 20,
                select: {
                    id: true,
                    action: true,
                    entity: true,
                    details: true,
                    createdAt: true,
                    performer: { select: { id: true, name: true, email: true } },
                },
            },
        },
    })

    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Compute financial summary
    const financialSummary = await prisma.transaction.aggregate({
        where: { userId: id },
        _sum: { amount: true },
        _count: true,
    })

    const incomeTotal = await prisma.transaction.aggregate({
        where: { userId: id, type: "in" },
        _sum: { amount: true },
    })

    const expenseTotal = await prisma.transaction.aggregate({
        where: { userId: id, type: "out" },
        _sum: { amount: true },
    })

    // Log this view action
    await logAdminAction({
        performerId: admin!.id,
        targetUserId: id,
        action: ADMIN_ACTIONS.USER_VIEW,
        entity: "user",
        entityId: id,
    })

    return NextResponse.json({
        user,
        financialSummary: {
            totalTransactions: financialSummary._count,
            totalAmount: financialSummary._sum.amount || 0,
            totalIncome: incomeTotal._sum.amount || 0,
            totalExpenses: expenseTotal._sum.amount || 0,
        },
    })
}

// PATCH /api/admin/users/[id] — Update user role or status
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    const { admin, error } = await requireAdmin()
    if (error) return error

    const { id } = await params
    const body = await request.json()
    const { action, reason, role: newRole } = body as {
        action: string
        reason?: string
        role?: string
    }

    // Prevent admins from modifying themselves
    if (id === admin!.id) {
        return NextResponse.json(
            { error: "Cannot modify your own account" },
            { status: 400 }
        )
    }

    // Prevent non-superadmins from changing roles
    if (action === "change_role" && admin!.role !== "superadmin") {
        return NextResponse.json(
            { error: "Only superadmins can change user roles" },
            { status: 403 }
        )
    }

    const targetUser = await prisma.user.findUnique({
        where: { id },
        select: { id: true, email: true, role: true, status: true },
    })

    if (!targetUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Prevent modifying superadmins (unless you're also a superadmin)
    if (targetUser.role === "superadmin" && admin!.role !== "superadmin") {
        return NextResponse.json(
            { error: "Cannot modify a superadmin" },
            { status: 403 }
        )
    }

    switch (action) {
        case "suspend": {
            if (targetUser.status === "suspended") {
                return NextResponse.json({ error: "User is already suspended" }, { status: 400 })
            }
            await prisma.user.update({
                where: { id },
                data: {
                    status: "suspended",
                    suspendedAt: new Date(),
                    suspendedReason: reason || "Suspended by admin",
                },
            })
            await logAdminAction({
                performerId: admin!.id,
                targetUserId: id,
                action: ADMIN_ACTIONS.USER_SUSPEND,
                entity: "user",
                entityId: id,
                details: { reason: reason || "Suspended by admin", previousStatus: targetUser.status },
            })
            break
        }

        case "unsuspend": {
            if (targetUser.status !== "suspended") {
                return NextResponse.json({ error: "User is not suspended" }, { status: 400 })
            }
            await prisma.user.update({
                where: { id },
                data: {
                    status: "active",
                    suspendedAt: null,
                    suspendedReason: null,
                },
            })
            await logAdminAction({
                performerId: admin!.id,
                targetUserId: id,
                action: ADMIN_ACTIONS.USER_UNSUSPEND,
                entity: "user",
                entityId: id,
            })
            break
        }

        case "ban": {
            if (targetUser.status === "banned") {
                return NextResponse.json({ error: "User is already banned" }, { status: 400 })
            }
            await prisma.user.update({
                where: { id },
                data: {
                    status: "banned",
                    suspendedAt: new Date(),
                    suspendedReason: reason || "Banned by admin",
                },
            })
            await logAdminAction({
                performerId: admin!.id,
                targetUserId: id,
                action: ADMIN_ACTIONS.USER_BAN,
                entity: "user",
                entityId: id,
                details: { reason: reason || "Banned by admin", previousStatus: targetUser.status },
            })
            break
        }

        case "activate": {
            await prisma.user.update({
                where: { id },
                data: {
                    status: "active",
                    suspendedAt: null,
                    suspendedReason: null,
                },
            })
            await logAdminAction({
                performerId: admin!.id,
                targetUserId: id,
                action: ADMIN_ACTIONS.USER_UNSUSPEND,
                entity: "user",
                entityId: id,
                details: { previousStatus: targetUser.status },
            })
            break
        }

        case "change_role": {
            if (!newRole || !["user", "admin", "superadmin"].includes(newRole)) {
                return NextResponse.json({ error: "Invalid role" }, { status: 400 })
            }
            await prisma.user.update({
                where: { id },
                data: { role: newRole },
            })
            await logAdminAction({
                performerId: admin!.id,
                targetUserId: id,
                action: ADMIN_ACTIONS.USER_CHANGE_ROLE,
                entity: "user",
                entityId: id,
                details: { previousRole: targetUser.role, newRole },
            })
            break
        }

        case "reset_2fa": {
            await prisma.user.update({
                where: { id },
                data: {
                    twoFactorEnabled: false,
                    twoFactorSecret: null,
                },
            })
            // Also clear trusted devices
            await prisma.trustedDevice.deleteMany({ where: { userId: id } })
            await logAdminAction({
                performerId: admin!.id,
                targetUserId: id,
                action: ADMIN_ACTIONS.USER_RESET_2FA,
                entity: "user",
                entityId: id,
            })
            break
        }

        case "force_reset_password": {
            // Match the self-service flow: store a sha256 of the token, email the raw one
            // directly to the user. We do NOT return the raw token to the admin — that would
            // let an admin take over any non-superadmin account silently.
            const rawToken = randomBytes(32).toString("hex")
            const hashedToken = createHash("sha256").update(rawToken).digest("hex")
            const resetExpiry = new Date(Date.now() + 3600000) // 1 hour

            await prisma.user.update({
                where: { id },
                data: {
                    resetToken: hashedToken,
                    resetTokenExpiry: resetExpiry,
                },
            })

            try {
                await sendPasswordResetEmail(targetUser.email, rawToken)
            } catch (e) {
                console.error("Failed to send admin-triggered password reset email:", e)
                return NextResponse.json(
                    { error: "Failed to send reset email. Please try again." },
                    { status: 500 },
                )
            }

            await logAdminAction({
                performerId: admin!.id,
                targetUserId: id,
                action: ADMIN_ACTIONS.USER_FORCE_RESET_PASSWORD,
                entity: "user",
                entityId: id,
                details: { emailedTo: targetUser.email },
            })
            return NextResponse.json({
                action,
                message: "Password reset email sent to user.",
                resetTokenExpiry: resetExpiry.toISOString(),
            })
        }

        case "delete": {
            // Soft delete — mark as deleted
            await prisma.user.update({
                where: { id },
                data: { status: "deleted" },
            })
            await logAdminAction({
                performerId: admin!.id,
                targetUserId: id,
                action: ADMIN_ACTIONS.USER_DELETE,
                entity: "user",
                entityId: id,
                details: { previousStatus: targetUser.status },
            })
            break
        }

        default:
            return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    // Return updated user
    const updated = await prisma.user.findUnique({
        where: { id },
        select: {
            id: true, name: true, email: true, role: true, status: true,
            twoFactorEnabled: true, suspendedAt: true, suspendedReason: true,
        },
    })

    return NextResponse.json({ user: updated, action })
}
