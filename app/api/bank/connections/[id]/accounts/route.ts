import { NextRequest, NextResponse } from "next/server"
import { listAccounts, listTransactions, getConnection, mapNatureToAccountType, getProviderColor } from "@/lib/salt-edge"
import { getAuthUserId } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/bank/connections/[id]/accounts — Fetch accounts from a Salt Edge connection
 * Also optionally imports them into the local database.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { id: connectionId } = await params

  try {
    // Fetch connection info
    const connection = await getConnection(connectionId)

    // Fetch accounts from Salt Edge
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
    const message = error instanceof Error ? error.message : "Failed to fetch accounts"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/bank/connections/[id]/accounts — Import Salt Edge accounts into the local database
 * Body: { accounts: [{ saltEdgeAccountId, name, nature, balance, currencyCode }] }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

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

    // If no specific accounts provided, import all from connection
    let saltEdgeAccounts
    if (!accountsToImport || accountsToImport.length === 0) {
      saltEdgeAccounts = await listAccounts(connectionId)
    }

    const connection = await getConnection(connectionId)
    const providerName = connection.provider_name
    const color = getProviderColor(connection.provider_code)

    // Upsert the bank
    const bank = await prisma.bank.upsert({
      where: { name: providerName },
      create: { name: providerName },
      update: {},
    })

    const accountsData = saltEdgeAccounts
      ? saltEdgeAccounts.map((a) => ({
          name: a.name,
          nature: a.nature,
          balance: a.balance,
          currencyCode: a.currency_code,
          iban: a.extra?.iban,
        }))
      : accountsToImport!

    const imported = []
    for (const acc of accountsData) {
      const account = await prisma.bankAccount.create({
        data: {
          userId,
          bankId: bank.id,
          accountType: mapNatureToAccountType(acc.nature),
          cardName: acc.name || `${providerName} Account`,
          balance: acc.balance || 0,
          color,
          isActive: true,
        },
        include: { bank: true },
      })

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
    try {
      const saltEdgeTxs = await listTransactions({ connectionId })
      if (saltEdgeTxs.length > 0) {
        // We'll batch-create transactions
        for (const tx of saltEdgeTxs.slice(0, 100)) {
          // Limit to first 100 for initial import
          await prisma.transaction.create({
            data: {
              userId,
              date: new Date(tx.made_on),
              type: tx.amount >= 0 ? "in" : "out",
              amount: Math.abs(tx.amount),
              description: tx.description || tx.category || "Transaction",
              tags: tx.category ? [tx.category] : [],
              accountId: imported[0]?.id || "",
            },
          })
        }
      }
    } catch (txError) {
      console.warn("Could not import transactions:", txError)
      // Not fatal — account was still imported
    }

    return NextResponse.json({
      imported,
      connectionId,
      providerName,
    })
  } catch (error) {
    console.error("Salt Edge import error:", error)
    const message = error instanceof Error ? error.message : "Failed to import accounts"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
