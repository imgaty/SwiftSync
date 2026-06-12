//
//  route.ts
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Handles the /api/bank/connections/[id]/accounts API endpoint for Argent, keeping request
//  parsing, business operations, and response formatting at the route boundary.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import { NextRequest, NextResponse } from "next/server"
import { listAccounts, listTransactions, getConnection, mapNatureToAccountType, getProviderColor, getOrCreateCustomerForScope } from "@/lib/salt-edge"
import { getAuthContext } from "@/lib/auth-helpers"
import { requirePermission, scopeCreateData } from "@/lib/data-access"
import { buildSaltEdgeCategorization, loadEnabledRules, loadAvailableTags } from "@/lib/PACE.server"
import { resolveImportedTransactionTags } from "@/lib/PACE"
import { prisma } from "@/lib/prisma"
import { prepareSaltEdgeAccountsForImport } from "@/lib/salt-edge-account-import"

/**
 * GET /api/bank/connections/[id]/accounts — Fetch accounts from a Salt Edge connection
 * Also optionally imports them into the local database.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthContext()
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  const permissionError = await requirePermission(ctx, "data:read")
  if (permissionError) return permissionError

  const { id: connectionId } = await params

  // Verify the caller actually owns this connection locally before hitting Salt Edge.
  const owned = await prisma.saltEdgeConnection.findFirst({
    where: {
      connectionId,
      userId: ctx.userId,
    },
    select: { id: true },
  })
  if (!owned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  try {
    const connection = await getConnection(connectionId)
    const accounts = await listAccounts(connectionId)

    return NextResponse.json({
      connection: {
        id: connection.id,
        providerCode: connection.provider_code,
        providerName: connection.provider_name,
        status: connection.status,
        countryCode: connection.country_code,
      },
      accounts: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        nature: a.nature,
        balance: a.balance,
        currencyCode: a.currency_code,
        iban: a.extra?.iban,
        cardType: a.extra?.card_type,
        accountNumber: a.extra?.account_number,
        clientName: a.extra?.client_name,
        status: a.extra?.status,
        accountType: mapNatureToAccountType(a.nature),
        color: getProviderColor(connection.provider_code),
      })),
    })
  } catch (error) {
    console.error("Salt Edge accounts error:", error)
    return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 })
  }
}

/**
 * POST /api/bank/connections/[id]/accounts — Import Salt Edge accounts into the local database
 * Body: { accounts: [{ saltEdgeAccountId, name, nature, balance, currencyCode }] }
 *
 * Accepts connections the caller has just linked (not yet persisted locally) OR connections
 * they already own. Ownership is enforced by cross-checking the Salt Edge customer_id with
 * the caller's customer record.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthContext()
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  const permissionError = await requirePermission(ctx, "bank:connect")
  if (permissionError) return permissionError

  const { id: connectionId } = await params

  try {
    const body = await request.json()
    const { accounts: accountsToImport } = body as {
      accounts?: Array<{
        saltEdgeAccountId: string
        name: string
        nature: string
        balance: number
        currencyCode: string
        iban?: string
      }>
    }

    // Fetch connection info from Salt Edge
    const connection = await getConnection(connectionId)
    const providerName = connection.provider_name
    const color = getProviderColor(connection.provider_code)

    // Verify ownership. Either (a) we already have this connection row scoped to the caller,
    // or (b) the Salt Edge customer_id on the connection matches a row the caller owns.
    const existing = await prisma.saltEdgeConnection.findUnique({
      where: { connectionId },
      select: { userId: true, customerId: true },
    })
    if (existing) {
      if (existing.userId !== ctx.userId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 })
      }
    } else {
      const scopedCustomerId = await getOrCreateCustomerForScope(ctx)
      if (connection.customer_id !== scopedCustomerId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 })
      }
    }

    const saltEdgeAccounts = await listAccounts(connectionId)
    const accountResolution = prepareSaltEdgeAccountsForImport(saltEdgeAccounts, accountsToImport)
    if (!accountResolution.ok) {
      return NextResponse.json(
        { error: accountResolution.error },
        { status: accountResolution.status },
      )
    }
    const accountsData = accountResolution.accounts

    const dbConnection = await prisma.saltEdgeConnection.upsert({
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

    const imported = []
    const accountIdBySaltEdgeId = new Map<string, string>()
    for (const acc of accountsData) {
      // Upsert by saltEdgeAccountId to prevent duplicates across reconnects
      const account = acc.saltEdgeAccountId
        ? await prisma.bankAccount.upsert({
            where: { saltEdgeAccountId: acc.saltEdgeAccountId },
            create: {
              ...scopeCreateData(ctx),
              connectionId: dbConnection.id,
              saltEdgeAccountId: acc.saltEdgeAccountId,
              bankId: bank.id,
              accountType: mapNatureToAccountType(acc.nature),
              cardName: acc.name || `${providerName} Account`,
              balance: acc.balance || 0,
              currency: acc.currencyCode || "EUR",
              iban: acc.iban || null,
              color,
              isActive: true,
            },
            update: {
              balance: acc.balance || 0,
              currency: acc.currencyCode || "EUR",
              iban: acc.iban || null,
              connectionId: dbConnection.id,
              isActive: true,
            },
            include: { bank: true },
          })
        : await prisma.bankAccount.create({
            data: {
              ...scopeCreateData(ctx),
              connectionId: dbConnection.id,
              bankId: bank.id,
              accountType: mapNatureToAccountType(acc.nature),
              cardName: acc.name || `${providerName} Account`,
              balance: acc.balance || 0,
              currency: acc.currencyCode || "EUR",
              iban: acc.iban || null,
              color,
              isActive: true,
            },
            include: { bank: true },
          })

      if (acc.saltEdgeAccountId) {
        accountIdBySaltEdgeId.set(acc.saltEdgeAccountId, account.id)
      }

      imported.push({
        id: account.id,
        name: account.cardName,
        type: account.accountType,
        institution: account.bank.name,
        balance: Number(account.balance),
        color: account.color,
      })
    }

    // Also import transactions if available
    let transactionsImported = 0
    try {
      const saltEdgeTxs = await listTransactions({ connectionId })
      if (saltEdgeTxs.length > 0) {
        const [userRules, availableTags] = await Promise.all([
          loadEnabledRules(ctx),
          loadAvailableTags(ctx),
        ])
        for (const tx of saltEdgeTxs.slice(0, 100)) {
          const cat = await buildSaltEdgeCategorization(ctx, tx, {
            rules: userRules,
            availableTags,
          })
          const accountId = accountIdBySaltEdgeId.get(tx.account_id)
          if (!accountId) continue
          const inferredTags = cat.tags.length > 0 ? cat.tags : ["other"]
          const description = tx.description || tx.category || "Transaction"
          // Upsert by saltEdgeId to prevent duplicate transactions
          if (tx.id) {
            const existing = await prisma.transaction.findUnique({
              where: { saltEdgeId: tx.id },
              select: { tags: true },
            })
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
          } else {
            await prisma.transaction.create({
              data: {
                ...scopeCreateData(ctx),
                date: new Date(tx.made_on),
                type: tx.amount >= 0 ? "in" : "out",
                amount: Math.abs(tx.amount),
                description,
                tags: inferredTags,
                accountId,
                counterpartyId: cat.counterpartyId,
                counterpartyRaw: cat.counterpartyRaw,
              },
            })
          }
          transactionsImported++
        }
      }
    } catch (txError) {
      console.warn("Could not import transactions:", txError)
    }

    return NextResponse.json({
      imported,
      transactionsImported,
      connectionId,
      providerName,
    })
  } catch (error) {
    console.error("Salt Edge import error:", error)
    return NextResponse.json({ error: "Failed to import accounts" }, { status: 500 })
  }
}
