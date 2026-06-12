//
//  salt-edge-account-import.ts
//  Argent
//
//  Created by Codex on 07 June 2026.
//  Description: Validates Salt Edge account import selections against authoritative connection data.
//

export interface SaltEdgeAccountImportSource {
  id: string
  name: string
  nature: string
  balance: number
  currency_code: string
  extra?: {
    iban?: string | null
  } | null
}

export interface RequestedSaltEdgeAccountImport {
  saltEdgeAccountId?: unknown
}

export interface PreparedSaltEdgeAccountImport {
  saltEdgeAccountId: string
  name: string
  nature: string
  balance: number
  currencyCode: string
  iban?: string | null
}

export type SaltEdgeAccountImportResolution =
  | { ok: true; accounts: PreparedSaltEdgeAccountImport[] }
  | { ok: false; status: 400 | 403; error: string }

export function prepareSaltEdgeAccountsForImport(
  authoritativeAccounts: SaltEdgeAccountImportSource[],
  requestedAccounts?: RequestedSaltEdgeAccountImport[],
): SaltEdgeAccountImportResolution {
  const accountsById = new Map(authoritativeAccounts.map((account) => [account.id, account]))

  if (!requestedAccounts || requestedAccounts.length === 0) {
    return { ok: true, accounts: authoritativeAccounts.map(toPreparedAccount) }
  }

  const selected: SaltEdgeAccountImportSource[] = []
  const seen = new Set<string>()

  for (const requestedAccount of requestedAccounts) {
    const saltEdgeAccountId =
      typeof requestedAccount?.saltEdgeAccountId === "string"
        ? requestedAccount.saltEdgeAccountId.trim()
        : ""

    if (!saltEdgeAccountId) {
      return {
        ok: false,
        status: 400,
        error: "Each selected account must include a Salt Edge account ID.",
      }
    }

    const authoritativeAccount = accountsById.get(saltEdgeAccountId)
    if (!authoritativeAccount) {
      return {
        ok: false,
        status: 403,
        error: "Selected account does not belong to this connection.",
      }
    }

    if (!seen.has(saltEdgeAccountId)) {
      seen.add(saltEdgeAccountId)
      selected.push(authoritativeAccount)
    }
  }

  return { ok: true, accounts: selected.map(toPreparedAccount) }
}

function toPreparedAccount(account: SaltEdgeAccountImportSource): PreparedSaltEdgeAccountImport {
  return {
    saltEdgeAccountId: account.id,
    name: account.name,
    nature: account.nature,
    balance: account.balance,
    currencyCode: account.currency_code,
    iban: account.extra?.iban,
  }
}
