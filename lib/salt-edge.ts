/**
 * Salt Edge Account Information API v6 Client
 * https://docs.saltedge.com/v6/
 *
 * This module provides a typed client for interacting with Salt Edge's
 * Open Banking API to connect bank accounts and fetch real financial data.
 */

const BASE_URL = process.env.SALT_EDGE_BASE_URL || "https://www.saltedge.com/api/v6"
const APP_ID = process.env.SALT_EDGE_APP_ID || ""
const SECRET = process.env.SALT_EDGE_SECRET || ""

// =============================================================================
// TYPES
// =============================================================================

export interface SaltEdgeCustomer {
  customer_id: string
  identifier: string
  blocked_at: string | null
  created_at: string
  updated_at: string
}

export interface SaltEdgeProvider {
  id: string
  code: string
  name: string
  mode: string // "oauth" | "web" | "api" | "file"
  status: string
  automatic_fetch: boolean
  country_code: string
  created_at: string
  updated_at: string
  logo_url: string
  home_url?: string
  login_url?: string
  instruction?: string
  max_consent_days?: number | null
  holder_info?: string[]
  identification_mode?: string
}

export interface SaltEdgeConnectSession {
  expires_at: string
  connect_url: string
  customer_id: string
}

export interface SaltEdgeConnection {
  id: string
  customer_id: string
  customer_identifier: string
  provider_code: string
  provider_name: string
  country_code: string
  status: string // "active" | "inactive" | "disabled"
  categorization: string
  categorization_vendor: string | null
  automatic_refresh: boolean
  next_refresh_possible_at: string | null
  created_at: string
  updated_at: string
  last_consent_id: string | null
  holder_info?: {
    names?: string[]
    emails?: string[]
    phone_numbers?: string[]
    addresses?: Array<{
      city?: string
      state?: string
      street?: string
      country_code?: string
      post_code?: string
    }>
  } | null
  last_attempt: {
    id: string
    consent_id: string
    api_mode: string
    api_version: string
    automatic_fetch: boolean
    categorize: boolean
    custom_fields: Record<string, string>
    automatic_refresh: boolean
    exclude_accounts: string[]
    fetch_from_date: string
    fetch_to_date: string
    fetch_scopes: string[]
    finished: boolean
    finished_recent: boolean
    include_natures: string[] | null
    interactive: boolean
    locale: string
    partial: boolean
    show_consent_confirmation: boolean
    store_credentials: boolean
    user_present: boolean
    created_at: string
    updated_at: string
    success_at: string | null
    fail_at: string | null
    fail_error_class: string | null
    fail_message: string | null
    last_stage: {
      id: string
      name: string
      created_at: string
      updated_at: string
    }
  } | null
}

export interface SaltEdgeAccount {
  id: string
  name: string
  nature: string // "account" | "card" | "bonus" | "credit_card" | "debit_card" | "ewallet" | "insurance" | "investment" | "loan" | "mortgage" | "savings"
  balance: number
  currency_code: string
  connection_id: string
  created_at: string
  updated_at: string
  extra: {
    iban?: string
    card_type?: string
    account_name?: string
    account_number?: string
    sort_code?: string
    client_name?: string
    cards?: string[]
    swift?: string
    status?: string
    [key: string]: unknown
  }
}

export interface SaltEdgeTransaction {
  id: string
  duplicated: boolean
  mode: string
  status: string // "posted" | "pending"
  made_on: string // ISO date
  amount: number
  currency_code: string
  description: string
  category: string
  account_id: string
  created_at: string
  updated_at: string
  extra: {
    merchant_id?: string
    original_amount?: number
    original_currency_code?: string
    posting_date?: string
    time?: string
    type?: string
    payee?: string
    payer?: string
    [key: string]: unknown
  }
}

interface SaltEdgeApiResponse<T> {
  data: T
  meta?: {
    next_id?: string
    next_page?: string
  }
}

interface SaltEdgeErrorResponse {
  error: {
    class: string
    message: string
    documentation_url?: string
  }
  request?: {
    id: string
    [key: string]: unknown
  }
}

// =============================================================================
// CORE API CLIENT
// =============================================================================

class SaltEdgeError extends Error {
  errorClass: string
  statusCode: number

  constructor(message: string, errorClass: string, statusCode: number) {
    super(message)
    this.name = "SaltEdgeError"
    this.errorClass = errorClass
    this.statusCode = statusCode
  }
}

async function saltEdgeRequest<T>(
  endpoint: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE"
    body?: Record<string, unknown>
    params?: Record<string, string>
  } = {}
): Promise<T> {
  const { method = "GET", body, params } = options

  let url = `${BASE_URL}${endpoint}`
  if (params) {
    const searchParams = new URLSearchParams(params)
    url += `?${searchParams.toString()}`
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-type": "application/json",
    "App-id": APP_ID,
    Secret: SECRET,
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
  }

  if (body) {
    fetchOptions.body = JSON.stringify(body)
  }

  const response = await fetch(url, fetchOptions)

  if (!response.ok) {
    let errorMessage = `Salt Edge API error: ${response.status}`
    let errorClass = "Unknown"
    try {
      const errorBody = (await response.json()) as SaltEdgeErrorResponse
      if (errorBody.error) {
        errorMessage = errorBody.error.message
        errorClass = errorBody.error.class
      }
    } catch {
      // Failed to parse error body
    }
    throw new SaltEdgeError(errorMessage, errorClass, response.status)
  }

  const json = (await response.json()) as SaltEdgeApiResponse<T>
  return json.data
}

// =============================================================================
// CUSTOMERS
// =============================================================================

/**
 * Create a Salt Edge Customer for a user.
 * The identifier should be unique per user (we use the user's DB id).
 */
export async function createCustomer(identifier: string): Promise<SaltEdgeCustomer> {
  return saltEdgeRequest<SaltEdgeCustomer>("/customers", {
    method: "POST",
    body: {
      data: {
        identifier,
      },
    },
  })
}

/**
 * List customers, optionally filtering by identifier.
 */
export async function listCustomers(identifier?: string): Promise<SaltEdgeCustomer[]> {
  const params: Record<string, string> = {}
  if (identifier) params.identifier = identifier
  return saltEdgeRequest<SaltEdgeCustomer[]>("/customers", { params })
}

/**
 * Get or create a Salt Edge customer for a given user ID.
 * Returns the customer ID to use in connect sessions.
 */
export async function getOrCreateCustomer(userId: string): Promise<string> {
  try {
    // Try to find existing customer
    const customers = await listCustomers(userId)
    if (customers.length > 0) {
      return customers[0].customer_id
    }
  } catch {
    // Customer list might fail, try creating
  }

  // Create new customer
  const customer = await createCustomer(userId)
  return customer.customer_id
}

// =============================================================================
// PROVIDERS
// =============================================================================

/**
 * List available bank providers, optionally filtered by country.
 * For pending/test apps, use includeSandboxes=true for testing with fake providers.
 */
export async function listProviders(options?: {
  countryCode?: string
  mode?: string
  includeSandboxes?: boolean
  includeAisFields?: boolean
  includeCredentialsFields?: boolean
  excludeInactive?: boolean
  fromId?: string
}): Promise<SaltEdgeProvider[]> {
  const params: Record<string, string> = {}
  if (options?.countryCode) params.country_code = options.countryCode
  if (options?.mode) params.mode = options.mode
  if (options?.includeSandboxes !== undefined) params.include_sandboxes = String(options.includeSandboxes)
  if (options?.includeAisFields) params.include_ais_fields = "true"
  if (options?.includeCredentialsFields) params.include_credentials_fields = "true"
  if (options?.excludeInactive) params.exclude_inactive = "true"
  if (options?.fromId) params.from_id = options.fromId

  return saltEdgeRequest<SaltEdgeProvider[]>("/providers", { params })
}

/**
 * Get a specific provider by code.
 */
export async function getProvider(providerCode: string): Promise<SaltEdgeProvider> {
  return saltEdgeRequest<SaltEdgeProvider>(`/providers/${providerCode}`)
}

// =============================================================================
// CONNECT SESSIONS
// =============================================================================

/**
 * Create a Connect Session to redirect the user to Salt Edge Connect.
 * Returns a connect_url that the user should visit to authorize the bank connection.
 */
export async function createConnectSession(options: {
  customerId: string
  returnTo: string
  providerCode?: string
  consentFromDate?: string
  consentPeriodDays?: number
  dailyRefresh?: boolean
  includeFakeProviders?: boolean
  allowedCountries?: string[]
}): Promise<SaltEdgeConnectSession> {
  const {
    customerId,
    returnTo,
    providerCode,
    consentFromDate,
    consentPeriodDays = 90,
    dailyRefresh = false,
    includeFakeProviders = true,
    allowedCountries,
  } = options

  const data: Record<string, unknown> = {
    customer_id: customerId,
    consent: {
      from_date: consentFromDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      period_days: consentPeriodDays,
      scopes: ["accounts", "transactions"],
    },
    attempt: {
      return_to: returnTo,
      fetch_scopes: ["accounts", "balance", "transactions"],
    },
    automatic_refresh: dailyRefresh,
    return_connection_id: true,
    return_error_class: true,
    include_fake_providers: includeFakeProviders,
  }

  // Optional top-level params
  if (providerCode) data.provider_code = providerCode
  if (allowedCountries) data.allowed_countries = allowedCountries

  return saltEdgeRequest<SaltEdgeConnectSession>("/connections/connect", {
    method: "POST",
    body: { data },
  })
}

/**
 * Create a Reconnect Session for an existing connection.
 */
export async function createReconnectSession(options: {
  connectionId: string
  returnTo: string
  consentPeriodDays?: number
  automaticRefresh?: boolean
}): Promise<SaltEdgeConnectSession> {
  const {
    connectionId,
    returnTo,
    consentPeriodDays = 90,
    automaticRefresh = false,
  } = options

  return saltEdgeRequest<SaltEdgeConnectSession>(`/connections/${connectionId}/reconnect`, {
    method: "POST",
    body: {
      data: {
        consent: {
          period_days: consentPeriodDays,
          scopes: ["accounts", "transactions"],
        },
        attempt: {
          return_to: returnTo,
          fetch_scopes: ["accounts", "balance", "transactions"],
        },
        automatic_refresh: automaticRefresh,
        return_connection_id: true,
      },
    },
  })
}

/**
 * Create a Refresh Session for an existing connection.
 */
export async function createRefreshSession(options: {
  connectionId: string
  returnTo: string
  automaticRefresh?: boolean
  showWidget?: boolean
}): Promise<SaltEdgeConnectSession> {
  const { connectionId, returnTo, automaticRefresh = false, showWidget = true } = options

  return saltEdgeRequest<SaltEdgeConnectSession>(`/connections/${connectionId}/refresh`, {
    method: "POST",
    body: {
      data: {
        attempt: {
          return_to: returnTo,
          fetch_scopes: ["accounts", "balance", "transactions"],
        },
        automatic_refresh: automaticRefresh,
        show_widget: showWidget,
        return_connection_id: true,
      },
    },
  })
}

// =============================================================================
// CONNECTIONS
// =============================================================================

/**
 * List all connections for a customer.
 */
export async function listConnections(customerId: string): Promise<SaltEdgeConnection[]> {
  return saltEdgeRequest<SaltEdgeConnection[]>("/connections", {
    params: { customer_id: customerId },
  })
}

/**
 * Get a specific connection.
 */
export async function getConnection(connectionId: string): Promise<SaltEdgeConnection> {
  return saltEdgeRequest<SaltEdgeConnection>(`/connections/${connectionId}`)
}

/**
 * Remove a connection.
 */
export async function removeConnection(connectionId: string): Promise<{ id: string; removed: boolean }> {
  return saltEdgeRequest<{ id: string; removed: boolean }>(`/connections/${connectionId}`, {
    method: "DELETE",
  })
}

// =============================================================================
// ACCOUNTS
// =============================================================================

/**
 * List all accounts for a connection.
 */
export async function listAccounts(connectionId: string): Promise<SaltEdgeAccount[]> {
  return saltEdgeRequest<SaltEdgeAccount[]>("/accounts", {
    params: { connection_id: connectionId },
  })
}

/**
 * List all accounts for a customer (across all connections).
 */
export async function listAccountsByCustomer(customerId: string): Promise<SaltEdgeAccount[]> {
  return saltEdgeRequest<SaltEdgeAccount[]>("/accounts", {
    params: { customer_id: customerId },
  })
}

// =============================================================================
// TRANSACTIONS
// =============================================================================

/**
 * List transactions for a connection, optionally filtered by account.
 */
export async function listTransactions(options: {
  connectionId: string
  accountId?: string
  fromId?: string
}): Promise<SaltEdgeTransaction[]> {
  const params: Record<string, string> = {
    connection_id: options.connectionId,
  }
  if (options.accountId) params.account_id = options.accountId
  if (options.fromId) params.from_id = options.fromId

  return saltEdgeRequest<SaltEdgeTransaction[]>("/transactions", { params })
}

/**
 * List pending transactions for a connection.
 */
export async function listPendingTransactions(options: {
  connectionId: string
  accountId?: string
}): Promise<SaltEdgeTransaction[]> {
  const params: Record<string, string> = {
    connection_id: options.connectionId,
    pending: "true",
  }
  if (options.accountId) params.account_id = options.accountId

  return saltEdgeRequest<SaltEdgeTransaction[]>("/transactions", { params })
}

// =============================================================================
// HOLDER INFO
// =============================================================================

export interface HolderInfo {
  names?: string[]
  emails?: string[]
  phone_numbers?: string[]
  addresses?: Array<{
    city?: string
    state?: string
    street?: string
    country_code?: string
    post_code?: string
  }>
}

/**
 * Get holder info for a connection.
 * In v6, holder info is returned as part of the connection show endpoint
 * when include_holder_info=true is passed.
 */
export async function getHolderInfo(connectionId: string): Promise<HolderInfo | null> {
  const connection = await saltEdgeRequest<SaltEdgeConnection>(`/connections/${connectionId}`, {
    params: { include_holder_info: "true" },
  })
  return connection.holder_info || null
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Map Salt Edge account nature to our account type.
 */
export function mapNatureToAccountType(nature: string): string {
  const mapping: Record<string, string> = {
    account: "checking",
    bonus: "savings",
    card: "credit_card",
    checking: "checking",
    credit_card: "credit_card",
    debit_card: "checking",
    ewallet: "digital_wallet",
    insurance: "savings",
    investment: "savings",
    loan: "loan",
    mortgage: "loan",
    savings: "savings",
  }
  return mapping[nature] || "checking"
}

/**
 * Generate a display color based on provider name.
 */
export function getProviderColor(providerCode: string): string {
  const colors = [
    "#3B82F6", "#10B981", "#8B5CF6", "#F59E0B",
    "#EF4444", "#06B6D4", "#EC4899", "#14B8A6",
    "#F97316", "#6366F1", "#84CC16", "#0EA5E9",
  ]
  let hash = 0
  for (const char of providerCode) {
    hash = char.charCodeAt(0) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

/**
 * Check if Salt Edge is properly configured.
 */
export function isSaltEdgeConfigured(): boolean {
  return !!(APP_ID && SECRET)
}
