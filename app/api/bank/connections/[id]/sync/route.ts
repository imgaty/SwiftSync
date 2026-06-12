//
//  route.ts
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Handles the /api/bank/connections/[id]/sync API endpoint for Argent, keeping request
//  parsing, business operations, and response formatting at the route boundary.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import { NextRequest, NextResponse } from "next/server"
import { getConnection, listAccounts, listTransactions, mapNatureToAccountType, getProviderColor } from "@/lib/salt-edge"
import { getAuthContext } from "@/lib/auth-helpers"
import { requirePermission, scopeFilter, scopeCreateData } from "@/lib/data-access"
import { buildSaltEdgeCategorization, loadEnabledRules, loadAvailableTags } from "@/lib/PACE.server"
import { resolveImportedTransactionTags } from "@/lib/PACE"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/bank/connections/[id]/sync — Refresh accounts & transactions from Salt Edge
 * Re-fetches live data and upserts into the local database.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthContext()
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  const permissionError = await requirePermission(ctx, "bank:connect")
  if (permissionError) return permissionError

  const { id: connectionId } = await params

  // Ownership check — only the caller's scope may sync a connection.
  // scopeRecordFilter targets the primary key `id`; Salt Edge's connectionId
  // is a separate column, so we filter manually with the same scope clause.
  const ownedConnection = await prisma.saltEdgeConnection.findFirst({
    where: { ...scopeFilter(ctx), connectionId },
    select: { id: true },
  })

  if (!ownedConnection) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 })
  }

  try {
    // Verify connection exists on Salt Edge
    const connection = await getConnection(connectionId)
    const providerName = connection.provider_name
    const color = getProviderColor(connection.provider_code)

    // Update local SaltEdgeConnection record
    await prisma.saltEdgeConnection.upsert({
      where: { connectionId },
      create: {
        ...scopeCreateData(ctx),
        customerId: connection.customer_id,
        connectionId,
        providerCode: connection.provider_code,
        providerName,
        countryCode: connection.country_code,
        status: connection.status,
        lastSyncAt: new Date(),
      },
      update: {
        status: connection.status,
        lastSyncAt: new Date(),
      },
    })

    // Upsert the bank
    const bank = await prisma.bank.upsert({
      where: { name: providerName },
      create: { name: providerName },
      update: {},
    })

    // Fetch and upsert accounts
    const saltEdgeAccounts = await listAccounts(connectionId)
    let accountsSynced = 0

    const dbConnection = await prisma.saltEdgeConnection.findUnique({
      where: { connectionId },
    })

    const accountIdBySaltEdgeId = new Map<string, string>()
    for (const acc of saltEdgeAccounts) {
      const account = await prisma.bankAccount.upsert({
        where: { saltEdgeAccountId: acc.id },
        create: {
          ...scopeCreateData(ctx),
          connectionId: dbConnection?.id,
          saltEdgeAccountId: acc.id,
          bankId: bank.id,
          accountType: mapNatureToAccountType(acc.nature),
          cardName: acc.name || `${providerName} Account`,
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
          connectionId: dbConnection?.id,
          isActive: true,
        },
      })
      accountIdBySaltEdgeId.set(acc.id, account.id)
      accountsSynced++
    }

    // Fetch and upsert transactions
    let newTransactions = 0
    try {
      const saltEdgeTxs = await listTransactions({ connectionId })

      if (accountIdBySaltEdgeId.size > 0 && saltEdgeTxs.length > 0) {
        // Load user rules + available tags once for the whole batch.
        const [userRules, availableTags] = await Promise.all([
          loadEnabledRules(ctx),
          loadAvailableTags(ctx),
        ])
        for (const tx of saltEdgeTxs.slice(0, 100)) {
          if (tx.id) {
            const accountId = accountIdBySaltEdgeId.get(tx.account_id)
            if (!accountId) continue
            const existing = await prisma.transaction.findUnique({
              where: { saltEdgeId: tx.id },
              select: { id: true, tags: true },
            })
            // Categorization pipeline: counterparty + Salt Edge tags + user
            // rules + (cache → AI fallback when everything else returned nothing).
            const cat = await buildSaltEdgeCategorization(ctx, tx, {
              rules: userRules,
              availableTags,
            })
            const description = tx.description || tx.category || "Transaction"
            const inferredTags = cat.tags.length > 0 ? cat.tags : ["other"]
            const tags = resolveImportedTransactionTags(existing?.tags, inferredTags)
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
            if (!existing) newTransactions++
          }
        }
      }
    } catch (txError) {
      console.warn("Could not sync transactions:", txError)
    }

    return NextResponse.json({
      accountsSynced,
      newTransactions,
      providerName,
    })
  } catch (error) {
    console.error("Salt Edge sync error:", error)
    const message = error instanceof Error ? error.message : "Failed to sync connection"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
