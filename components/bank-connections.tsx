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
    ExternalLink,
    Loader2,
    AlertCircle,
    CheckCircle2,
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
import { toast } from "sonner"

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
    const { data: connections = [], isLoading, error: fetchError } = useQuery({
        queryKey: queryKeys.bankConnections,
        queryFn: async () => {
            const res = await fetch("/api/bank/connections")
            if (!res.ok) {
                if (res.status === 401) return []
                throw new Error("Failed to fetch connections")
            }
            const data = await res.json()
            return (data.connections || []) as BankConnection[]
        },
    })
    const [isConnecting, setIsConnecting] = React.useState(false)
    const [disconnectingId, setDisconnectingId] = React.useState<string | null>(null)
    const [confirmDisconnect, setConfirmDisconnect] = React.useState<BankConnection | null>(null)
    const [expanded, setExpanded] = React.useState(true)
    const error = fetchError ? (fetchError instanceof Error ? fetchError.message : "Failed to load connections") : ""

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
                throw new Error(err.error || "Failed to create connect session")
            }
            const { connectUrl } = await res.json()
            window.location.href = connectUrl
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Connection failed")
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
                throw new Error(err.error || "Failed to disconnect")
            }
            // Invalidate both bank connections and finance data caches
            queryClient.invalidateQueries({ queryKey: queryKeys.bankConnections })
            queryClient.invalidateQueries({ queryKey: queryKeys.financeData })
            toast.success(`Disconnected from ${connection.providerName}`)
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to disconnect")
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
                toast.success(
                    `Synced ${result.accountsSynced} account(s) and ${result.newTransactions} new transaction(s)`
                )
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
                throw new Error(err.error || "Failed to create refresh session")
            }
            const { connectUrl } = await res.json()
            window.location.href = connectUrl
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Refresh failed")
        }
    }

    // Don't render anything while loading or if there's an error with no connections
    if (isLoading) {
        return (
            <div className="rounded-xl border bg-white dark:bg-neutral-950 p-4">
                <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                        <Building2 className="size-4 text-primary" />
                    </div>
                    <div className="space-y-1.5">
                        <div className="h-4 w-32 animate-pulse rounded bg-black/5 dark:bg-white/5" />
                        <div className="h-3 w-48 animate-pulse rounded bg-black/5 dark:bg-white/5" />
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
            <div className="rounded-xl border bg-white dark:bg-neutral-950">
                {/* Header */}
                <button
                    type="button"
                    onClick={() => setExpanded(!expanded)}
                    className="flex w-full items-center justify-between p-4 text-left hover:bg-black/5 dark:hover:bg-white/5/30 transition-colors rounded-xl cursor-pointer"
                >
                    <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                            <Building2 className="size-4 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold">Bank Connections</h3>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                {connections.length === 0
                                    ? "No banks connected yet"
                                    : `${connections.length} bank${connections.length !== 1 ? "s" : ""} connected`}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5 text-xs"
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
                            Connect Bank
                        </Button>
                        <ChevronDown
                            className={`size-4 text-neutral-500 dark:text-neutral-400 transition-transform duration-200 ${
                                expanded ? "rotate-180" : ""
                            }`}
                        />
                    </div>
                </button>

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
                                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
                                        <AlertCircle className="size-4 shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                {connections.length === 0 ? (
                                    <div className="py-8 text-center">
                                        <Unplug className="mx-auto size-8 text-neutral-500 dark:text-neutral-400/40" />
                                        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                                            No bank connections yet
                                        </p>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400/70">
                                            Connect your bank to automatically import accounts and transactions
                                        </p>
                                    </div>
                                ) : (
                                    <div className="mt-3 space-y-2">
                                        {connections.map((conn) => (
                                            <div
                                                key={conn.id}
                                                className="flex items-center justify-between rounded-lg border bg-background p-3"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="flex size-9 items-center justify-center rounded-lg bg-black/5 dark:bg-white/5">
                                                        <Building2 className="size-4 text-neutral-500 dark:text-neutral-400" />
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
                                                            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase">
                                                                {conn.countryCode}
                                                            </span>
                                                            <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                                                                Connected {new Date(conn.createdAt).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0"
                                                        title="Refresh connection"
                                                        onClick={() => handleRefresh(conn.id)}
                                                    >
                                                        <RefreshCw className="size-3.5" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                                        title="Disconnect bank"
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
                        <DialogTitle>Disconnect Bank</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to disconnect <strong>{confirmDisconnect?.providerName}</strong>?
                            This will remove the connection to your bank. Your imported accounts and transactions will remain.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmDisconnect(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={!!disconnectingId}
                            onClick={() => confirmDisconnect && handleDisconnect(confirmDisconnect)}
                        >
                            {disconnectingId ? (
                                <>
                                    <Loader2 className="mr-2 size-4 animate-spin" />
                                    Disconnecting...
                                </>
                            ) : (
                                <>
                                    <Unplug className="mr-2 size-4" />
                                    Disconnect
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
