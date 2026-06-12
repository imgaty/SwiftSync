//
//  onboarding.ts
//  Argent
//
//  Created by Codex on 07 June 2026.
//  Description: Provides onboarding gate helpers for account setup requirements.
//
import "server-only"

import type { AuthContext } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"

export async function hasImportedBankAccount(ctx: AuthContext): Promise<boolean> {
    const account = await prisma.bankAccount.findFirst({
        where: { userId: ctx.userId },
        select: { id: true },
    })

    return Boolean(account)
}
