"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Loader2, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { queryKeys } from "@/lib/query-keys"

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
  const [status, setStatus] = useState<"loading" | "importing" | "success" | "error">("loading")
  const [message, setMessage] = useState("Connecting to your bank...")
  const [importedCount, setImportedCount] = useState(0)
  const [errorMessage, setErrorMessage] = useState("")

  const connectionId = searchParams.get("connection_id")
  const errorClass = searchParams.get("error_class")
  const errorMsg = searchParams.get("error_message")
  const redirectTo = searchParams.get("redirect") || "/Accounts"

  useEffect(() => {
    if (errorClass || errorMsg) {
      setStatus("error")
      setErrorMessage(errorMsg || errorClass || "Bank connection failed")
      return
    }

    if (!connectionId) {
      setStatus("error")
      setErrorMessage("No connection ID received from bank")
      return
    }

    async function importAccounts() {
      try {
        setStatus("loading")
        setMessage("Fetching your accounts...")

        // First, get the accounts from Salt Edge connection
        const fetchRes = await fetch(`/api/bank/connections/${connectionId}/accounts`)
        if (!fetchRes.ok) {
          const err = await fetchRes.json()
          throw new Error(err.error || "Failed to fetch accounts")
        }

        const { accounts, connection } = await fetchRes.json()
        setMessage(`Found ${accounts.length} account(s) from ${connection.providerName}`)

        // Import accounts into our database
        setStatus("importing")
        setMessage(`Importing ${accounts.length} account(s)...`)

        const importRes = await fetch(`/api/bank/connections/${connectionId}/accounts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        })

        if (!importRes.ok) {
          const err = await importRes.json()
          throw new Error(err.error || "Failed to import accounts")
        }

        const { imported, transactionsImported } = await importRes.json()
        setImportedCount(imported.length)
        setStatus("success")
        setMessage(
          `Successfully imported ${imported.length} account(s)` +
          (transactionsImported ? ` and ${transactionsImported} transaction(s)` : "") +
          `!`
        )

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.financeData }),
          queryClient.invalidateQueries({ queryKey: queryKeys.bankConnections }),
        ])

        // Auto-redirect after 2s
        setTimeout(() => {
          router.refresh()
          router.push(redirectTo)
        }, 2000)
      } catch (err) {
        setStatus("error")
        setErrorMessage(err instanceof Error ? err.message : "Import failed")
      }
    }

    importAccounts()
  }, [connectionId, errorClass, errorMsg, router, redirectTo, queryClient])

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="mx-auto max-w-md text-center">
        {status === "loading" || status === "importing" ? (
          <div className="space-y-4">
            <Loader2 className="mx-auto size-12 animate-spin text-primary" />
            <h2 className="text-xl font-semibold">{message}</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {status === "loading"
                ? "Connecting to your bank securely via Salt Edge..."
                : "Saving your account data..."}
            </p>
          </div>
        ) : status === "success" ? (
          <div className="space-y-4">
            <CheckCircle2 className="mx-auto size-12 text-green-500" />
            <h2 className="text-xl font-semibold">{message}</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {importedCount} account{importedCount !== 1 ? "s" : ""} imported.
              Redirecting to Accounts...
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AlertCircle className="mx-auto size-12 text-red-500" />
            <h2 className="text-xl font-semibold">Connection Failed</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{errorMessage}</p>
            <Button onClick={() => router.push(redirectTo)} variant="outline">
              <ArrowLeft className="mr-2 size-4" />
              Back to Accounts
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
