//
//  page.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Renders the /Accounts/callback route in Argent, composing page-level layout, data
//  dependencies, and feature components for that user-facing screen.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Loader2, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { queryKeys } from "@/lib/query-keys"
import { useLanguage } from "@/components/language-provider"
import { getTranslations } from "@/lib/translation-utils"
import { safeRedirectPath } from "@/lib/auth-redirect"

/**
 * Callback page after Salt Edge Connect widget.
 * URL: /Accounts/callback?connection_id=xxx
 *
 * This page:
 * 1. Reads the connection_id from URL params
 * 2. Fetches accounts from Salt Edge via that connection
 * 3. Imports them into the local database
 * 4. Redirects to /Accounts
 */
export default function BankCallbackPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { t } = useLanguage()
  const bc = getTranslations(t, "bank_callback")
  const [status, setStatus] = useState<"loading" | "importing" | "success" | "error">("loading")
  const [message, setMessage] = useState(bc.connecting || "Connecting to your bank...")
  const [importedCount, setImportedCount] = useState(0)
  const [errorMessage, setErrorMessage] = useState("")

  const connectionId = searchParams.get("connection_id")
  const errorClass = searchParams.get("error_class")
  const errorMsg = searchParams.get("error_message")
  const redirectTo = safeRedirectPath(searchParams.get("redirect"), "/Accounts")

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    let redirectTimer: ReturnType<typeof setTimeout> | null = null

    const safeSetStatus = (s: typeof status) => { if (!cancelled) setStatus(s) }
    const safeSetMessage = (m: string) => { if (!cancelled) setMessage(m) }
    const safeSetError = (m: string) => { if (!cancelled) setErrorMessage(m) }
    const safeSetImportedCount = (n: number) => { if (!cancelled) setImportedCount(n) }

    if (errorClass || errorMsg) {
      safeSetStatus("error")
      safeSetError(errorMsg || errorClass || (bc.bank_connection_failed || "Bank connection failed"))
      return () => { cancelled = true; controller.abort() }
    }

    if (!connectionId) {
      safeSetStatus("error")
      safeSetError(bc.no_connection_id || "No connection ID received from bank")
      return () => { cancelled = true; controller.abort() }
    }

    async function importAccounts() {
      try {
        safeSetStatus("loading")
        safeSetMessage(bc.fetching_accounts || "Fetching your accounts...")

        // First, get the accounts from Salt Edge connection
        const fetchRes = await fetch(`/api/bank/connections/${connectionId}/accounts`, { signal: controller.signal })
        if (!fetchRes.ok) {
          const err = await fetchRes.json()
          throw new Error(err.error || (bc.failed_fetch_accounts || "Failed to fetch accounts"))
        }

        const { accounts, connection } = await fetchRes.json()
        if (cancelled) return
        safeSetMessage((bc.found_accounts || "Found %count account(s) from %provider").replace("%count", accounts.length).replace("%provider", connection.providerName))

        // Import accounts into our database
        safeSetStatus("importing")
        safeSetMessage((bc.importing_accounts || "Importing %count account(s)...").replace("%count", accounts.length))

        const importRes = await fetch(`/api/bank/connections/${connectionId}/accounts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
          signal: controller.signal,
        })

        if (!importRes.ok) {
          const err = await importRes.json()
          throw new Error(err.error || (bc.failed_import_accounts || "Failed to import accounts"))
        }

        const { imported, transactionsImported } = await importRes.json()
        if (cancelled) return
        safeSetImportedCount(imported.length)
        safeSetStatus("success")
        safeSetMessage(
          (bc.success_message || "Successfully imported %count account(s)").replace("%count", String(imported.length)) +
          (transactionsImported ? ` ${(bc.and_transactions || "and %count transaction(s)").replace("%count", String(transactionsImported))}` : "") +
          `!`
        )

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.financeData }),
          queryClient.invalidateQueries({ queryKey: queryKeys.bankConnections }),
        ])

        if (cancelled) return
        // Auto-redirect after 2s
        redirectTimer = setTimeout(() => {
          router.refresh()
          router.push(redirectTo)
        }, 2000)
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === "AbortError")) return
        safeSetStatus("error")
        safeSetError(err instanceof Error ? err.message : (bc.failed_import_accounts || "Import failed"))
      }
    }

    importAccounts()

    return () => {
      cancelled = true
      controller.abort()
      if (redirectTimer) clearTimeout(redirectTimer)
    }
  }, [connectionId, errorClass, errorMsg, router, redirectTo, queryClient, bc])

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="mx-auto max-w-md text-center">
        {status === "loading" || status === "importing" ? (
          <div className="space-y-4">
            <Loader2 className="mx-auto size-12 animate-spin text-primary" />
            <h2 className="text-xl font-semibold">{message}</h2>
            <p className="text-sm text-neutral-400">
              {status === "loading"
                ? (bc.connecting_securely || "Connecting to your bank securely via Salt Edge...")
                : (bc.saving_data || "Saving your account data...")}
            </p>
          </div>
        ) : status === "success" ? (
          <div className="space-y-4">
            <CheckCircle2 className="mx-auto size-12 text-green-500" />
            <h2 className="text-xl font-semibold">{message}</h2>
            <p className="text-sm text-neutral-400">
              {importedCount} account{importedCount !== 1 ? "s" : ""} {bc.accounts_imported || "imported."}
              {bc.redirecting || "Redirecting to Accounts..."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AlertCircle className="mx-auto size-12 text-red-500" />
            <h2 className="text-xl font-semibold">{bc.connection_failed || "Connection Failed"}</h2>
            <p className="text-sm text-neutral-400">{errorMessage}</p>
            <Button asChild variant="glass">
              <Link href={redirectTo}>
                <ArrowLeft className="mr-2 size-4" />
                {bc.back_to_accounts || "Back to Accounts"}
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
