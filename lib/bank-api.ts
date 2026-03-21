// =============================================================================
// BANK API — Card BIN + IBAN lookup & simulated account sync
// =============================================================================

// ---------------------------------------------------------------------------
// Portuguese bank identification by IBAN bank code (positions 5-8)
// ---------------------------------------------------------------------------
const PT_BANKS: Record<string, { name: string; color: string; logo?: string }> = {
  "0033": { name: "Millennium BCP", color: "#D4213D" },
  "0035": { name: "Caixa Geral de Depósitos", color: "#007A33" },
  "0036": { name: "Montepio Geral", color: "#003D6B" },
  "0007": { name: "Novo Banco", color: "#00A551" },
  "0010": { name: "BPI", color: "#002855" },
  "0018": { name: "Santander Totta", color: "#EC0000" },
  "0023": { name: "ActivoBank", color: "#FF6600" },
  "0045": { name: "Crédito Agrícola", color: "#006633" },
  "0046": { name: "Banco Popular", color: "#003D6B" },
  "0038": { name: "Bankinter", color: "#FF6600" },
  "0079": { name: "BNP Paribas", color: "#009A44" },
  "0193": { name: "WiZink Bank", color: "#7B2D8E" },
  "0269": { name: "Best Bank", color: "#000000" },
}

// ---------------------------------------------------------------------------
// International bank identification by IBAN country prefix
// ---------------------------------------------------------------------------
const COUNTRY_BANKS: Record<string, { defaultBank: string; color: string }> = {
  PT: { defaultBank: "Banco de Portugal", color: "#003D6B" },
  ES: { defaultBank: "Banco de España", color: "#D4213D" },
  DE: { defaultBank: "Deutsche Bank", color: "#0018A8" },
  FR: { defaultBank: "BNP Paribas", color: "#009A44" },
  GB: { defaultBank: "Barclays", color: "#00AEEF" },
  IT: { defaultBank: "UniCredit", color: "#E2001A" },
  NL: { defaultBank: "ING", color: "#FF6200" },
  IE: { defaultBank: "AIB", color: "#6B2C91" },
  BE: { defaultBank: "KBC", color: "#003D6B" },
  AT: { defaultBank: "Erste Bank", color: "#003D6B" },
  LU: { defaultBank: "Banque Internationale", color: "#003D6B" },
}

// ---------------------------------------------------------------------------
// Card network detection by BIN (first 6 digits)
// ---------------------------------------------------------------------------
interface CardNetwork {
  network: string
  type: "credit_card" | "checking"
  color: string
}

function detectCardNetwork(cardNumber: string): CardNetwork | null {
  const clean = cardNumber.replace(/\s/g, "")
  if (clean.length < 4) return null

  const d1 = parseInt(clean[0])
  const d2 = parseInt(clean.substring(0, 2))
  const d4 = parseInt(clean.substring(0, 4))

  // Visa: starts with 4
  if (d1 === 4) return { network: "Visa", type: "credit_card", color: "#1A1F71" }
  // Mastercard: 51-55 or 2221-2720
  if (d2 >= 51 && d2 <= 55) return { network: "Mastercard", type: "credit_card", color: "#EB001B" }
  if (d4 >= 2221 && d4 <= 2720) return { network: "Mastercard", type: "credit_card", color: "#EB001B" }
  // AMEX: 34, 37
  if (d2 === 34 || d2 === 37) return { network: "American Express", type: "credit_card", color: "#006FCF" }
  // Discover: 6011, 65, 644-649
  if (clean.startsWith("6011") || d2 === 65 || (parseInt(clean.substring(0, 3)) >= 644 && parseInt(clean.substring(0, 3)) <= 649))
    return { network: "Discover", type: "credit_card", color: "#FF6600" }
  // Maestro: 5018, 5020, 5038, 6304
  if (["5018", "5020", "5038", "6304"].some((p) => clean.startsWith(p)))
    return { network: "Maestro", type: "checking", color: "#CC0000" }
  // Electron: 4026, 417500, 4508, 4844, 4913, 4917
  if (["4026", "4508", "4844", "4913", "4917"].some((p) => clean.startsWith(p)) || clean.startsWith("417500"))
    return { network: "Visa Electron", type: "checking", color: "#1A1F71" }

  return { network: "Unknown", type: "credit_card", color: "#6B7280" }
}

// ---------------------------------------------------------------------------
// Card BIN → issuing bank mapping (common Portuguese/European BINs)
// ---------------------------------------------------------------------------
const BIN_BANKS: Record<string, string> = {
  "453201": "Millennium BCP",
  "453200": "Millennium BCP",
  "402360": "Millennium BCP",
  "432187": "Millennium BCP",
  "542543": "Caixa Geral de Depósitos",
  "542523": "Caixa Geral de Depósitos",
  "516730": "Caixa Geral de Depósitos",
  "491633": "Novo Banco",
  "486512": "Novo Banco",
  "453957": "Santander Totta",
  "467832": "Santander Totta",
  "448534": "BPI",
  "447920": "BPI",
  "530773": "Millennium BCP",
  "489365": "Revolut",
  "535522": "Revolut",
  "437696": "Revolut",
  "539178": "N26",
  "412389": "Wise",
  "423223": "Moey!",
}

function detectBankFromBIN(cardNumber: string): string | null {
  const clean = cardNumber.replace(/\s/g, "")
  if (clean.length < 6) return null
  const bin6 = clean.substring(0, 6)
  return BIN_BANKS[bin6] || null
}

// ---------------------------------------------------------------------------
// IBAN parsing & validation
// ---------------------------------------------------------------------------
export interface IBANInfo {
  valid: boolean
  country: string
  countryCode: string
  bankCode: string
  bankName: string
  formattedIBAN: string
  color: string
}

function validateIBANChecksum(iban: string): boolean {
  // Move first 4 chars to end, convert letters to numbers
  const rearranged = iban.substring(4) + iban.substring(0, 4)
  let numStr = ""
  for (const ch of rearranged) {
    if (ch >= "0" && ch <= "9") numStr += ch
    else numStr += (ch.charCodeAt(0) - 55).toString()
  }
  // Modular arithmetic (mod 97)
  let remainder = 0
  for (let i = 0; i < numStr.length; i++) {
    remainder = (remainder * 10 + parseInt(numStr[i])) % 97
  }
  return remainder === 1
}

export function parseIBAN(input: string): IBANInfo {
  const iban = input.replace(/\s/g, "").toUpperCase()

  if (iban.length < 15 || iban.length > 34) {
    return { valid: false, country: "", countryCode: "", bankCode: "", bankName: "", formattedIBAN: iban, color: "" }
  }

  const countryCode = iban.substring(0, 2)
  const valid = validateIBANChecksum(iban)

  // Format IBAN with spaces every 4 characters
  const formattedIBAN = iban.replace(/(.{4})/g, "$1 ").trim()

  // Detect bank
  let bankName = ""
  let color = "#3B82F6"

  if (countryCode === "PT" && iban.length === 25) {
    const bankCode = iban.substring(4, 8)
    const ptBank = PT_BANKS[bankCode]
    if (ptBank) {
      bankName = ptBank.name
      color = ptBank.color
    } else {
      bankName = "Portuguese Bank"
    }
    return { valid, country: "Portugal", countryCode, bankCode, bankName, formattedIBAN, color }
  }

  const countryInfo = COUNTRY_BANKS[countryCode]
  if (countryInfo) {
    bankName = countryInfo.defaultBank
    color = countryInfo.color
  } else {
    bankName = "International Bank"
  }

  const bankCode = iban.substring(4, 8)
  return { valid, country: countryCode, countryCode, bankCode, bankName, formattedIBAN, color }
}

// ---------------------------------------------------------------------------
// Card lookup
// ---------------------------------------------------------------------------
export interface CardLookupResult {
  valid: boolean
  network: string | null
  type: "credit_card" | "checking"
  bankName: string
  color: string
  last4: string
  maskedNumber: string
}

export function lookupCard(cardNumber: string): CardLookupResult {
  const clean = cardNumber.replace(/[\s-]/g, "")

  if (clean.length < 13 || clean.length > 19) {
    return { valid: false, network: null, type: "credit_card", bankName: "", color: "", last4: "", maskedNumber: "" }
  }

  // Luhn check
  let sum = 0
  let alternate = false
  for (let i = clean.length - 1; i >= 0; i--) {
    let n = parseInt(clean[i])
    if (alternate) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    alternate = !alternate
  }
  const luhnValid = sum % 10 === 0

  const network = detectCardNetwork(clean)
  const bankName = detectBankFromBIN(clean) || network?.network || "Unknown"

  const last4 = clean.slice(-4)
  const masked = "•••• ".repeat(Math.floor((clean.length - 4) / 4)) + last4

  return {
    valid: luhnValid,
    network: network?.network || null,
    type: network?.type || "credit_card",
    bankName,
    color: network?.color || "#6B7280",
    last4,
    maskedNumber: masked,
  }
}

// ---------------------------------------------------------------------------
// Simulated bank account sync — returns "live" account data
// ---------------------------------------------------------------------------
export interface BankSyncResult {
  success: boolean
  account: {
    bankName: string
    accountType: string
    balance: number
    currency: string
    holder: string
    color: string
    // Card-specific
    cardNetwork?: string
    last4?: string
    expirationDate?: string
    // IBAN-specific
    iban?: string
  } | null
  error?: string
}

export function simulateBankSync(opts: {
  method: "card" | "iban"
  cardNumber?: string
  expirationDate?: string
  cvc?: string
  iban?: string
  holderName?: string
}): BankSyncResult {
  if (opts.method === "card") {
    if (!opts.cardNumber) return { success: false, account: null, error: "Card number required" }

    const card = lookupCard(opts.cardNumber)
    if (!card.valid) return { success: false, account: null, error: "Invalid card number" }

    // Simulate fetching account data from the bank
    const balance = generateRealisticBalance(card.type)

    return {
      success: true,
      account: {
        bankName: card.bankName,
        accountType: card.type,
        balance,
        currency: "EUR",
        holder: opts.holderName || "Account Holder",
        color: card.color,
        cardNetwork: card.network || undefined,
        last4: card.last4,
        expirationDate: opts.expirationDate,
      },
    }
  }

  if (opts.method === "iban") {
    if (!opts.iban) return { success: false, account: null, error: "IBAN required" }

    const ibanInfo = parseIBAN(opts.iban)
    if (!ibanInfo.valid) return { success: false, account: null, error: "Invalid IBAN" }

    const balance = generateRealisticBalance("checking")

    return {
      success: true,
      account: {
        bankName: ibanInfo.bankName,
        accountType: "checking",
        balance,
        currency: "EUR",
        holder: opts.holderName || "Account Holder",
        color: ibanInfo.color,
        iban: ibanInfo.formattedIBAN,
      },
    }
  }

  return { success: false, account: null, error: "Invalid method" }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function generateRealisticBalance(type: string): number {
  // Generate a realistic-looking balance based on account type
  switch (type) {
    case "credit_card":
      return -Math.round((Math.random() * 2000 + 50) * 100) / 100
    case "savings":
      return Math.round((Math.random() * 30000 + 1000) * 100) / 100
    case "checking":
      return Math.round((Math.random() * 8000 + 500) * 100) / 100
    default:
      return Math.round((Math.random() * 5000 + 100) * 100) / 100
  }
}

// List of supported banks for UI display
export const SUPPORTED_BANKS = [
  { name: "Millennium BCP", country: "PT" },
  { name: "Caixa Geral de Depósitos", country: "PT" },
  { name: "Novo Banco", country: "PT" },
  { name: "Santander Totta", country: "PT" },
  { name: "BPI", country: "PT" },
  { name: "ActivoBank", country: "PT" },
  { name: "Crédito Agrícola", country: "PT" },
  { name: "Montepio Geral", country: "PT" },
  { name: "Bankinter", country: "PT" },
  { name: "Revolut", country: "EU" },
  { name: "N26", country: "EU" },
  { name: "Wise", country: "EU" },
  { name: "Moey!", country: "PT" },
]
