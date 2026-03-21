import { NextResponse } from "next/server"
import { getAuthUserId } from "@/lib/auth-helpers"
import { lookupCard, parseIBAN, simulateBankSync } from "@/lib/bank-api"

// POST /api/bank/lookup — Identify bank from card number or IBAN
export async function POST(request: Request) {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const body = await request.json()
  const { type, cardNumber, iban } = body

  if (type === "card") {
    if (!cardNumber) {
      return NextResponse.json({ error: "Card number required" }, { status: 400 })
    }
    const result = lookupCard(cardNumber)
    return NextResponse.json(result)
  }

  if (type === "iban") {
    if (!iban) {
      return NextResponse.json({ error: "IBAN required" }, { status: 400 })
    }
    const result = parseIBAN(iban)
    return NextResponse.json(result)
  }

  return NextResponse.json({ error: "Invalid type. Use 'card' or 'iban'" }, { status: 400 })
}
