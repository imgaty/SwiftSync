// =============================================================================
// ADMIN AUDIT LOGGER
// =============================================================================
// Logs every admin action to the AuditLog table for accountability and tracking.

import { prisma } from "@/lib/prisma"
import { getClientIp } from "@/lib/admin-auth"

export interface AuditLogEntry {
    performerId: string       // Admin user ID who performed the action
    targetUserId?: string     // User affected (if applicable)
    action: string            // e.g. "user.suspend", "user.delete", "user.reset_2fa"
    entity: string            // e.g. "user", "transaction", "system"
    entityId?: string         // ID of the affected entity
    details?: Record<string, unknown>  // Extra context (stored as JSON string)
}

// -----------------------------------------------------------------------------
// logAdminAction — creates an audit log entry
// -----------------------------------------------------------------------------
export async function logAdminAction(entry: AuditLogEntry): Promise<void> {
    const ipAddress = await getClientIp()

    await prisma.auditLog.create({
        data: {
            performerId: entry.performerId,
            targetUserId: entry.targetUserId ?? null,
            action: entry.action,
            entity: entry.entity,
            entityId: entry.entityId ?? null,
            details: entry.details ? JSON.stringify(entry.details) : null,
            ipAddress,
        },
    })
}

// -----------------------------------------------------------------------------
// Common audit action constants
// -----------------------------------------------------------------------------
export const ADMIN_ACTIONS = {
    // User management
    USER_VIEW: "user.view",
    USER_SUSPEND: "user.suspend",
    USER_UNSUSPEND: "user.unsuspend",
    USER_BAN: "user.ban",
    USER_DELETE: "user.delete",
    USER_FORCE_RESET_PASSWORD: "user.force_reset_password",
    USER_RESET_2FA: "user.reset_2fa",
    USER_CHANGE_ROLE: "user.change_role",
    USER_IMPERSONATE: "user.impersonate",

    // Data management
    TRANSACTION_VIEW: "transaction.view",
    TRANSACTION_DELETE: "transaction.delete",
    ACCOUNT_VIEW: "account.view",
    BILL_VIEW: "bill.view",
    BUDGET_VIEW: "budget.view",
    GOAL_VIEW: "goal.view",

    // System
    ANNOUNCEMENT_CREATE: "announcement.create",
    ANNOUNCEMENT_UPDATE: "announcement.update",
    ANNOUNCEMENT_DELETE: "announcement.delete",
    SYSTEM_SETTINGS_UPDATE: "system.settings_update",
} as const

export type AdminAction = (typeof ADMIN_ACTIONS)[keyof typeof ADMIN_ACTIONS]
