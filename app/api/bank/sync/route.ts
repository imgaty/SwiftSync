import { NextResponse } from "next/server"
import { getAuthUserId } from "@/lib/auth-helpers"
import { simulateBankSync } from "@/lib/bank-api"

// POST /api/bank/sync — Simulate a bank sync to retrieve account data
export async function POST(request: Request) {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const body = await request.json()
  const { method, cardNumber, iban } = body

  if (!method || !["card", "iban"].includes(method)) {
    return NextResponse.json({ error: "Method must be 'card' or 'iban'" }, { status: 400 })
  }

  if (method === "card" && !cardNumber) {
    return NextResponse.json({ error: "Card number required for card sync" }, { status: 400 })
  }

  if (method === "iban" && !iban) {
    return NextResponse.json({ error: "IBAN required for IBAN sync" }, { status: 400 })
  }

  // Simulate a small network delay for realism
  await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 700))

  const result = simulateBankSync({
    method,
    cardNumber: method === "card" ? cardNumber : undefined,
    iban: method === "iban" ? iban : undefined,
    expirationDate: body.expirationDate,
    cvc: body.cvc,
    holderName: body.holderName,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error, ...result }, { status: 400 })
  }

  return NextResponse.json(result)
}
