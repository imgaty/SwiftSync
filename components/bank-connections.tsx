//
//  bank-connections.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Implements the Bank connections React component for Argent, encapsulating reusable
//  interface structure, state handling, and presentation logic for feature screens.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import { motion, AnimatePresence } from "framer-motion"
import {
    Building2,
    Plus,
    Trash2,
    RefreshCw,
    Loader2,
    AlertCircle,
    ChevronDown,
    Unplug,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { notify } from "@/lib/notify"
import { useLanguage } from "@/components/language-provider"
import { UDS } from "@/lib/UDS"
import { getTranslations } from "@/lib/translation-utils"

interface BankConnection {
    id: string
    providerCode: string
    providerName: string
    status: string
    countryCode: string
    createdAt: string
    updatedAt: string
}

export function BankConnections() {
    const queryClient = useQueryClient()
    const { t } = useLanguage()
    const bk = getTranslations(t, "bank_connections")
    const common = getTranslations(t, "common")
    const { data: connections = [], isLoading, error: fetchError } = useQuery({
        queryKey: queryKeys.bankConnections,
        queryFn: async ({ signal }) => {
            const res = await fetch("/api/bank/connections", {
                credentials: "include",
                signal,
            })
            if (!res.ok) {
                if (res.status === 401) return []
                throw new Error("Failed to fetch connections")
            }
            const data = await res.json()
            return (data.connections || []) as BankConnection[]
        },
        staleTime: 2 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
    })
    const [isConnecting, setIsConnecting] = React.useState(false)
    const [disconnectingId, setDisconnectingId] = React.useState<string | null>(null)
    const [confirmDisconnect, setConfirmDisconnect] = React.useState<BankConnection | null>(null)
    const [expanded, setExpanded] = React.useState(true)
    const error = fetchError ? (fetchError instanceof Error ? fetchError.message : (bk.failed_load_connections || "Failed to load connections")) : ""

    const handleConnect = async () => {
        setIsConnecting(true)
        try {
            const returnTo = `${window.location.origin}/Accounts/callback`
            const res = await fetch("/api/bank/connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ returnTo, action: "connect" }),
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || (bk.failed_connect_session || "Failed to create connect session"))
            }
            const { connectUrl } = await res.json()
            window.location.href = connectUrl
        } catch (err) {
            notify.error({ title: bk.connection_failed || "Connection failed", message: err instanceof Error ? err.message : "" })
            setIsConnecting(false)
        }
    }

    const handleDisconnect = async (connection: BankConnection) => {
        setDisconnectingId(connection.id)
        try {
            const res = await fetch(`/api/bank/connections/${connection.id}`, {
                method: "DELETE",
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || (bk.failed_disconnect || "Failed to disconnect"))
            }
            // Invalidate both bank connections and finance data caches
            queryClient.invalidateQueries({ queryKey: queryKeys.bankConnections })
            queryClient.invalidateQueries({ queryKey: queryKeys.financeData })
            notify.success({ title: (bk.disconnected_from || "Disconnected from %name").replace("%name", connection.providerName) })
        } catch (err) {
            notify.error({ title: bk.failed_disconnect || "Failed to disconnect", message: err instanceof Error ? err.message : "" })
        } finally {
            setDisconnectingId(null)
            setConfirmDisconnect(null)
        }
    }

    const handleRefresh = async (connectionId: string) => {
        try {
            // First try to sync data directly from Salt Edge
            const syncRes = await fetch(`/api/bank/connections/${connectionId}/sync`, {
                method: "POST",
            })
            if (syncRes.ok) {
                const result = await syncRes.json()
                notify.success({
                    title: (bk.synced_message || "Synced %accounts account(s) and %transactions new transaction(s)").replace("%accounts", result.accountsSynced).replace("%transactions", result.newTransactions),
                })
                queryClient.invalidateQueries({ queryKey: queryKeys.bankConnections })
                queryClient.invalidateQueries({ queryKey: queryKeys.financeData })
                return
            }

            // If sync fails (e.g. expired connection), redirect to Salt Edge to re-authorize
            const returnTo = `${window.location.origin}/Accounts/callback`
            const res = await fetch("/api/bank/connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ returnTo, action: "refresh", connectionId }),
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || (bk.failed_refresh_session || "Failed to create refresh session"))
            }
            const { connectUrl } = await res.json()
            window.location.href = connectUrl
        } catch (err) {
            notify.error({ title: bk.refresh_failed || "Refresh failed", message: err instanceof Error ? err.message : "" })
        }
    }

    // Don't render anything while loading or if there's an error with no connections
    if (isLoading) {
        return (
            <div className={`${UDS.panelSurface} p-4`}>
                <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center sq-lg bg-primary/10">
                        <Building2 className="size-4 text-primary" />
                    </div>
                    <div className="space-y-1.5">
                        <div className="h-4 w-32 animate-pulse sq uds-bg-subtle" />
                        <div className="h-3 w-48 animate-pulse sq uds-bg-subtle" />
                    </div>
                </div>
            </div>
        )
    }

    const statusColor = (status: string) => {
        switch (status) {
            case "active":
                return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
            case "inactive":
                return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
            default:
                return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
        }
    }

    return (
        <>
            <div className={UDS.panelSurface}>
                {/* Header */}
                <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpanded(!expanded)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpanded(!expanded) } }}
                    className={`${UDS.itemHover} flex w-full cursor-pointer items-center justify-between p-4 text-left transition-colors`}
                >
                    <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center sq-lg bg-primary/10">
                            <Building2 className="size-4 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold">{bk.title || "Bank Connections"}</h3>
                            <p className="text-xs text-neutral-400">
                                {connections.length === 0
                                    ? (bk.no_banks || "No banks connected yet")
                                    : (bk.banks_connected || "%count bank(s) connected").replace("%count", String(connections.length))}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="glass"
                            disabled={isConnecting}
                            onClick={(e) => {
                                e.stopPropagation()
                                handleConnect()
                            }}
                        >
                            {isConnecting ? (
                                <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                                <Plus className="size-3.5" />
                            )}
                            {bk.connect_bank || "Connect Bank"}
                        </Button>
                        <ChevronDown
                            className={`size-4 text-neutral-400 transition-transform duration-200 ${
                                expanded ? "rotate-180" : ""
                            }`}
                        />
                    </div>
                </div>

                {/* Connections list */}
                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <div className="border-t px-4 pb-4">
                                {error && (
                                    <div className={`mt-3 flex items-center gap-2 sq-lg bg-red-500/10 px-3 py-2 text-sm ${UDS.destructiveText}`}>
                                        <AlertCircle className="size-4 shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                {connections.length === 0 ? (
                                    <div className="py-8 text-center">
                                        <Unplug className="mx-auto size-8 text-neutral-400/40" />
                                        <p className="mt-2 text-sm text-neutral-400">
                                            {bk.no_connections_yet || "No bank connections yet"}
                                        </p>
                                        <p className="text-xs text-neutral-400/70">
                                            {bk.connect_desc || "Connect your bank to automatically import accounts and transactions"}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="mt-3 space-y-2">
                                        {connections.map((conn) => (
                                            <div
                                                key={conn.id}
                                                className={`${UDS.inlineSurface} flex items-center justify-between p-3`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`${UDS.inlineSurface} flex size-9 items-center justify-center`}>
                                                        <Building2 className="size-4 text-neutral-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium">{conn.providerName}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <Badge
                                                                variant="outline"
                                                                className={`text-[10px] px-1.5 py-0 ${statusColor(conn.status)}`}
                                                            >
                                                                {conn.status}
                                                            </Badge>
                                                            <span className="text-[10px] text-neutral-400 uppercase">
                                                                {conn.countryCode}
                                                            </span>
                                                            <span className="text-[10px] text-neutral-400">
                                                                Connected {new Date(conn.createdAt).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="size-8 p-0"
                                                        title={bk.refresh_connection || "Refresh connection"}
                                                        onClick={() => handleRefresh(conn.id)}
                                                    >
                                                        <RefreshCw className="size-3.5" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className={`size-8 p-0 ${UDS.destructiveHover}`}
                                                        title={bk.disconnect_bank || "Disconnect bank"}
                                                        onClick={() => setConfirmDisconnect(conn)}
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Confirm disconnect dialog */}
            <Dialog open={!!confirmDisconnect} onOpenChange={(open) => !open && setConfirmDisconnect(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{bk.disconnect_title || "Disconnect Bank"}</DialogTitle>
                        <DialogDescription>
                            {(bk.disconnect_confirm || "Are you sure you want to disconnect %name? This will remove the connection to your bank. Your imported accounts and transactions will remain.").replace("%name", confirmDisconnect?.providerName || "")}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="glass" onClick={() => setConfirmDisconnect(null)}>
                            {common.cancel || "Cancel"}
                        </Button>
                        <Button
                            variant="solid-destructive"
                            disabled={!!disconnectingId}
                            onClick={() => confirmDisconnect && handleDisconnect(confirmDisconnect)}
                        >
                            {disconnectingId ? (
                                <>
                                    <Loader2 className="mr-2 size-4 animate-spin" />
                                    {bk.disconnecting || "Disconnecting..."}
                                </>
                            ) : (
                                <>
                                    <Unplug className="mr-2 size-4" />
                                    {bk.disconnect || "Disconnect"}
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
