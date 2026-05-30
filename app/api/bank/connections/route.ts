//
//  route.ts
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Handles the /api/bank/connections API endpoint for Argent, keeping request parsing,
//  business operations, and response formatting at the route boundary.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import { NextRequest, NextResponse } from "next/server"
import { getOrCreateCustomerForScope, listConnections, listAccounts, listTransactions, mapNatureToAccountType, getProviderColor } from "@/lib/salt-edge"
import { getAuthContext } from "@/lib/auth-helpers"
import { requirePermission, scopeFilter, scopeCreateData } from "@/lib/data-access"
import { buildSaltEdgeCategorization, loadEnabledRules, loadAvailableTags } from "@/lib/PACE.server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/bank/connections — List all bank connections for the user.
 * Tries Salt Edge API first; falls back to local DB records so connections
 * persist across browsers / devices without reconnecting.
 *
 * Auto-imports accounts for any connection that has no local BankAccount records,
 * ensuring data shows on dashboard/other pages even on a fresh browser session.
 */
export async function GET(_request: NextRequest) {
  const ctx = await getAuthContext()
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const canSyncFromSaltEdge = !(await requirePermission(ctx, "bank:connect"))

  if (canSyncFromSaltEdge) {
    try {
    const customerId = await getOrCreateCustomerForScope(ctx)
    const connections = await listConnections(customerId)

    // Sync each connection to DB and auto-import missing accounts
    for (const c of connections) {
      const dbConnection = await prisma.saltEdgeConnection.upsert({
        where: { connectionId: c.id },
        create: {
          userId: ctx.userId,
          customerId,
          connectionId: c.id,
          providerCode: c.provider_code,
          providerName: c.provider_name,
          countryCode: c.country_code,
          status: c.status,
        },
        update: {
          status: c.status,
          providerName: c.provider_name,
        },
      })

      // Check if this connection has any local accounts — if not, auto-import
      const localAccountCount = await prisma.bankAccount.count({
        where: { connectionId: dbConnection.id },
      })

      if (localAccountCount === 0 && c.status === "active") {
        try {
          const color = getProviderColor(c.provider_code)
          const bank = await prisma.bank.upsert({
            where: { name: c.provider_name },
            create: { name: c.provider_name },
            update: {},
          })

          const saltEdgeAccounts = await listAccounts(c.id)
          const accountIdBySaltEdgeId = new Map<string, string>()

          for (const acc of saltEdgeAccounts) {
            const account = await prisma.bankAccount.upsert({
              where: { saltEdgeAccountId: acc.id },
              create: {
                ...scopeCreateData(ctx),
                connectionId: dbConnection.id,
                saltEdgeAccountId: acc.id,
                bankId: bank.id,
                accountType: mapNatureToAccountType(acc.nature),
                cardName: acc.name || `${c.provider_name} Account`,
                balance: acc.balance || 0,
                currency: acc.currency_code || "EUR",
                iban: acc.extra?.iban || null,
                color,
                isActive: true,
              },
              update: {
                balance: acc.balance || 0,
                currency: acc.currency_code || "EUR",
                iban: acc.extra?.iban || null,
                connectionId: dbConnection.id,
                isActive: true,
              },
            })
            accountIdBySaltEdgeId.set(acc.id, account.id)
          }

          // Also import transactions
          if (accountIdBySaltEdgeId.size > 0) {
            try {
              const saltEdgeTxs = await listTransactions({ connectionId: c.id })
              const [userRules, availableTags] = await Promise.all([
                loadEnabledRules(ctx),
                loadAvailableTags(ctx),
              ])
              for (const tx of saltEdgeTxs.slice(0, 100)) {
                if (tx.id) {
                  const cat = await buildSaltEdgeCategorization(ctx, tx, {
                    rules: userRules,
                    availableTags,
                  })
                  const accountId = accountIdBySaltEdgeId.get(tx.account_id)
                  if (!accountId) continue
                  const tags = cat.tags.length > 0 ? cat.tags : ["other"]
                  const description = tx.description || tx.category || "Transaction"
                  await prisma.transaction.upsert({
                    where: { saltEdgeId: tx.id },
                    create: {
                      ...scopeCreateData(ctx),
                      saltEdgeId: tx.id,
                      date: new Date(tx.made_on),
                      type: tx.amount >= 0 ? "in" : "out",
                      amount: Math.abs(tx.amount),
                      description,
                      tags,
                      accountId,
                      counterpartyId: cat.counterpartyId,
                      counterpartyRaw: cat.counterpartyRaw,
                    },
                    update: {
                      date: new Date(tx.made_on),
                      type: tx.amount >= 0 ? "in" : "out",
                      amount: Math.abs(tx.amount),
                      description,
                      tags,
                      accountId,
                      counterpartyId: cat.counterpartyId,
                      counterpartyRaw: cat.counterpartyRaw,
                    },
                  })
                }
              }
            } catch (txErr) {
              console.warn("Auto-import transactions failed:", txErr)
            }
          }
        } catch (importErr) {
          console.warn(`Auto-import for connection ${c.id} failed:`, importErr)
        }
      }
    }

  } catch (error) {
    console.warn("Salt Edge API unreachable, falling back to DB:", error)
  }
  }

  // Serve the scoped local records. This includes connections synced above and
  // prevents another user's Salt Edge connections from leaking into this account.
  const dbConnections = await prisma.saltEdgeConnection.findMany({
    where: scopeFilter(ctx),
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({
    connections: dbConnections.map((c) => ({
      id: c.connectionId,
      providerCode: c.providerCode,
      providerName: c.providerName,
      status: c.status,
      countryCode: c.countryCode,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
  })
}
