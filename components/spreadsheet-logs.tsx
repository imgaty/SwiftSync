//
//  spreadsheet-logs.tsx
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Implements the Spreadsheet logs React component for Argent, encapsulating reusable
//  interface structure, state handling, and presentation logic for feature screens.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import { ArrowLeft, History, Loader2, FileSpreadsheet, Pencil, Plus, Trash2, Type, Table } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/query-keys"
import type { SpreadsheetDocument, SpreadsheetLog } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/language-provider"
import { getTranslations } from "@/lib/translation-utils"
import { UDS } from "@/lib/UDS"
import { cn } from "@/lib/utils"

/* ─── Action icon mapping ──────────────────────────────────────────── */
function actionIcon(action: string) {
    switch (action) {
        case "created": return <Plus className="size-3.5" />
        case "renamed": return <Pencil className="size-3.5" />
        case "cell_edit": return <Type className="size-3.5" />
        case "content_update": return <Table className="size-3.5" />
        case "sheet_added": return <Plus className="size-3.5" />
        case "sheet_deleted": return <Trash2 className="size-3.5" />
        default: return <History className="size-3.5" />
    }
}

function actionLabel(action: string) {
    switch (action) {
        case "created": return "Created"
        case "renamed": return "Renamed"
        case "cell_edit": return "Cell edited"
        case "content_update": return "Content updated"
        case "sheet_added": return "Sheet added"
        case "sheet_deleted": return "Sheet deleted"
        case "sheet_renamed": return "Sheet renamed"
        case "formatting": return "Formatting changed"
        case "row_col_change": return "Row/column changed"
        default: return action
    }
}

function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "Just now"
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`

    return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
        hour: "2-digit",
        minute: "2-digit",
    })
}

/* ─── Main component ──────────────────────────────────────────────── */
export function SpreadsheetLogs({
    doc,
    onBack,
}: {
    doc: SpreadsheetDocument
    onBack: () => void
}) {
    const { t } = useLanguage()
    const sp = getTranslations(t, "spreadsheets")

    const { data: logs, isLoading } = useQuery({
        queryKey: ["spreadsheet-logs", doc.id],
        queryFn: () => apiFetch<SpreadsheetLog[]>(`/api/spreadsheets/${doc.id}/logs`),
        staleTime: 30_000,
    })

    return (
        <div className="flex flex-col items-center w-full min-h-[calc(100vh-220px)] py-8 px-4">
            {/* Header */}
            <div className="w-full max-w-lg mb-6">
                <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 mb-4 -ml-2 text-neutral-400">
                    <ArrowLeft className="size-3.5" />
                    {sp.back || "Back"}
                </Button>

                <div className="flex items-center gap-3 mb-1">
                    <div className="flex size-10 items-center justify-center sq-normal bg-primary/10">
                        <FileSpreadsheet className="size-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-lg font-bold tracking-tight truncate">{doc.name}</h1>
                        <p className="text-xs text-neutral-400">{sp.change_log || "Change log"}</p>
                    </div>
                </div>
            </div>

            {/* Log list */}
            <div className="w-full max-w-lg">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="size-6 animate-spin text-neutral-400" />
                    </div>
                ) : !logs || logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
                        <History className="size-10 mb-3 opacity-40" />
                        <p className="text-sm">{sp.no_logs || "No changes recorded yet"}</p>
                    </div>
                ) : (
                    <div className="relative">
                        {/* Timeline line */}
                        <div className={cn("absolute bottom-2 left-[19px] top-2", UDS.separatorVertical)} />

                        <div className="flex flex-col gap-0">
                            {logs.map((log, i) => (
                                <div key={log.id} className="relative flex items-start gap-3 py-3">
                                    {/* Timeline dot */}
                                    <div className={`relative z-10 flex size-10 shrink-0 items-center justify-center ${i === 0 ? "sq-full border border-primary/20 bg-primary/10 text-primary" : `${UDS.pillSurface} text-neutral-400`}`}>
                                        {actionIcon(log.action)}
                                    </div>

                                    {/* Content */}
                                    <div className="min-w-0 flex-1 pt-0.5">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                                                {actionLabel(log.action)}
                                            </span>
                                            <span className="text-xs text-neutral-400">
                                                {formatDate(log.createdAt)}
                                            </span>
                                        </div>
                                        {log.summary && (
                                            <p className="text-xs text-neutral-400 mt-0.5 truncate">
                                                {log.summary}
                                            </p>
                                        )}
                                        {log.user && (
                                            <p className="text-xs text-neutral-400/70 mt-0.5">
                                                {log.user.name || log.user.email}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
