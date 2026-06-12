//
//  bank-callback-importer.tsx
//  Argent
//
//  Created by Codex on 07 June 2026.
//  Description: Imports bank accounts after Salt Edge redirects back to Argent.
//
"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Loader2, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { queryKeys } from "@/lib/query-keys"
import { useLanguage } from "@/components/language-provider"
import { getTranslations } from "@/lib/translation-utils"
import { safeRedirectPath } from "@/lib/auth-redirect"

type CallbackStatus = "loading" | "importing" | "success" | "error"

export function BankCallbackImporter({
  defaultRedirect = "/Accounts",
  errorBackHref,
  errorBackLabel,
  redirectingLabel,
}: {
  defaultRedirect?: string
  errorBackHref?: string
  errorBackLabel?: string
  redirectingLabel?: string
}) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { t } = useLanguage()
  const bc = getTranslations(t, "bank_callback")
  const [status, setStatus] = useState<CallbackStatus>("loading")
  const [message, setMessage] = useState("Connecting to your bank...")
  const [importedCount, setImportedCount] = useState(0)
  const [errorMessage, setErrorMessage] = useState("")
  const labelsRef = useRef({
    bankConnectionFailed: "Bank connection failed",
    noConnectionId: "No connection ID received from bank",
    importingAccounts: "Importing your accounts...",
    failedImportAccounts: "Failed to import accounts",
    successMessage: "Successfully imported %count account(s)",
    andTransactions: "and %count transaction(s)",
  })

  labelsRef.current = {
    bankConnectionFailed: bc.bank_connection_failed || "Bank connection failed",
    noConnectionId: bc.no_connection_id || "No connection ID received from bank",
    importingAccounts: "Importing your accounts...",
    failedImportAccounts: bc.failed_import_accounts || "Failed to import accounts",
    successMessage: bc.success_message || "Successfully imported %count account(s)",
    andTransactions: bc.and_transactions || "and %count transaction(s)",
  }

  const connectionId = searchParams.get("connection_id")
  const errorClass = searchParams.get("error_class")
  const errorMsg = searchParams.get("error_message")
  const redirectTo = safeRedirectPath(searchParams.get("redirect"), defaultRedirect)
  const resolvedErrorBackHref = errorBackHref || redirectTo
  const resolvedErrorBackLabel = errorBackLabel || bc.back_to_accounts || "Back to Accounts"

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    let redirectTimer: ReturnType<typeof setTimeout> | null = null
    const labels = labelsRef.current

    const safeSetStatus = (s: CallbackStatus) => { if (!cancelled) setStatus(s) }
    const safeSetMessage = (m: string) => { if (!cancelled) setMessage(m) }
    const safeSetError = (m: string) => { if (!cancelled) setErrorMessage(m) }
    const safeSetImportedCount = (n: number) => { if (!cancelled) setImportedCount(n) }

    if (errorClass || errorMsg) {
      safeSetStatus("error")
      safeSetError(errorMsg || errorClass || labels.bankConnectionFailed)
      return () => { cancelled = true; controller.abort() }
    }

    if (!connectionId) {
      safeSetStatus("error")
      safeSetError(labels.noConnectionId)
      return () => { cancelled = true; controller.abort() }
    }

    async function importAccounts() {
      try {
        safeSetStatus("importing")
        safeSetMessage(labels.importingAccounts)

        const importRes = await fetch(`/api/bank/connections/${connectionId}/accounts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
          signal: controller.signal,
        })

        if (!importRes.ok) {
          const err = await importRes.json()
          throw new Error(err.error || labels.failedImportAccounts)
        }

        const { imported, transactionsImported } = await importRes.json()
        if (cancelled) return

        if (!Array.isArray(imported) || imported.length === 0) {
          throw new Error("No bank accounts were imported. Please connect a bank account to continue.")
        }

        safeSetImportedCount(imported.length)
        safeSetStatus("success")
        safeSetMessage(
          labels.successMessage.replace("%count", String(imported.length)) +
          (transactionsImported ? ` ${labels.andTransactions.replace("%count", String(transactionsImported))}` : "") +
          "!"
        )

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.financeData }),
          queryClient.invalidateQueries({ queryKey: queryKeys.bankConnections }),
        ])

        if (cancelled) return
        redirectTimer = setTimeout(() => {
          router.refresh()
          router.push(redirectTo)
        }, 2000)
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === "AbortError")) return
        safeSetStatus("error")
        safeSetError(err instanceof Error ? err.message : labels.failedImportAccounts)
      }
    }

    importAccounts()

    return () => {
      cancelled = true
      controller.abort()
      if (redirectTimer) clearTimeout(redirectTimer)
    }
  }, [connectionId, errorClass, errorMsg, router, redirectTo, queryClient])

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
              {redirectingLabel || bc.redirecting || "Redirecting..."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AlertCircle className="mx-auto size-12 text-red-500" />
            <h2 className="text-xl font-semibold">{bc.connection_failed || "Connection Failed"}</h2>
            <p className="text-sm text-neutral-400">{errorMessage}</p>
            <Button asChild variant="glass">
              <Link href={resolvedErrorBackHref}>
                <ArrowLeft className="mr-2 size-4" />
                {resolvedErrorBackLabel}
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
