//
//  import-dialog.tsx
//  Argent
//
//  Created by Codex on 03 June 2026.
//  Description: Implements the Import dialog for Argent data backups and current export files.
//
"use client"

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, CheckCircle2, Database, FileJson, Loader2, Upload } from "lucide-react"

import {
    FormDialogActions,
    FormDialogBody,
    FormDialogContent,
    FormDialogHeader,
    FormDialogStepIndicator,
} from "@/components/form-dialog"
import { useLanguage } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { notify } from "@/lib/notify"
import { queryKeys } from "@/lib/query-keys"
import { getTranslations } from "@/lib/translation-utils"
import { cn } from "@/lib/utils"
import { UDS } from "@/lib/UDS"

type ImportDomain =
    | "accounts"
    | "tags"
    | "transactions"
    | "bills"
    | "budgets"
    | "goals"
    | "rules"
    | "paceRules"
    | "spreadsheets"

type ImportCounts = Record<ImportDomain, {
    received: number
    created: number
    skipped: number
    errors: number
}>

type ImportResponse = {
    dryRun: boolean
    detectedFormat: {
        kind: "backup" | "current_export"
        entity?: ImportDomain
        source: "json" | "csv"
    }
    counts: ImportCounts
    warnings: string[]
    errors: Array<{
        entity: ImportDomain | "file"
        row?: number
        message: string
    }>
}

type ImportCopy = {
    format: string
    warnings: string
    errors: string
    created: string
    skipped: string
    received: string
    data: string
    argentBackup: string
    currentExport: string
    noImportableRows: string
    row: string
}

const DOMAIN_ORDER: ImportDomain[] = [
    "accounts",
    "tags",
    "transactions",
    "bills",
    "budgets",
    "goals",
    "rules",
    "paceRules",
    "spreadsheets",
]

interface ImportDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
    const queryClient = useQueryClient()
    const { t } = useLanguage()
    const [file, setFile] = React.useState<File | null>(null)
    const [stepIndex, setStepIndex] = React.useState(0)
    const [preview, setPreview] = React.useState<ImportResponse | null>(null)
    const [result, setResult] = React.useState<ImportResponse | null>(null)
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    React.useEffect(() => {
        if (!open) return
        setFile(null)
        setStepIndex(0)
        setPreview(null)
        setResult(null)
        setIsSubmitting(false)
    }, [open])

    const copy = React.useMemo(() => {
        const c = getTranslations(t, "import_dialog")
        const common = getTranslations(t, "common")
        return {
            title: c.title || "Import Data",
            chooseFile: c.choose_file || "Choose a JSON or CSV file.",
            previewImport: c.preview_import || "Preview what will be imported.",
            done: c.done || "Import completed.",
            chooseButton: c.choose_button || "Choose file",
            previewButton: c.preview_button || "Preview",
            importButton: c.import_button || "Import",
            importing: c.importing || "Importing...",
            previewing: c.previewing || "Analyzing...",
            close: common.close || "Close",
            back: common.back || "Back",
            cancel: common.cancel || "Cancel",
            noFileTitle: c.no_file_title || "No file selected",
            noFileMessage: c.no_file_message || "Choose a file to import.",
            previewFailed: c.preview_failed || "Import preview failed",
            importFailed: c.import_failed || "Import failed",
            importReady: c.import_ready || "Import ready",
            importReadyMessage: c.import_ready_message || "The preview found no blocking errors.",
            importDone: c.import_done || "Data imported",
            format: c.format || "Format",
            warnings: c.warnings || "Warnings",
            errors: c.errors || "Errors",
            created: c.created || "Created",
            skipped: c.skipped || "Skipped",
            received: c.received || "Received",
            fileSelected: c.file_selected || "Selected file",
            blockingErrors: c.blocking_errors || "Fix the errors before importing.",
            data: c.data || "Data",
            argentBackup: c.argent_backup || "Argent backup",
            currentExport: c.current_export || "Current export",
            noImportableRows: c.no_importable_rows || "No importable rows detected.",
            row: c.row || "row",
        }
    }, [t])

    async function submitImport(dryRun: boolean) {
        if (!file) {
            notify.error({ title: copy.noFileTitle, message: copy.noFileMessage })
            return
        }

        setIsSubmitting(true)
        try {
            const formData = new FormData()
            formData.set("file", file)
            formData.set("dryRun", dryRun ? "true" : "false")

            const res = await fetch("/api/import", {
                method: "POST",
                body: formData,
            })
            const body = await res.json().catch(() => null) as ImportResponse | { error?: string } | null
            if (!body || ("error" in body && body.error)) {
                throw new Error(body?.error || (dryRun ? copy.previewFailed : copy.importFailed))
            }

            const response = body as ImportResponse
            if (dryRun) {
                setPreview(response)
                setStepIndex(1)
                if (response.errors.length === 0) {
                    notify.success({ title: copy.importReady, message: copy.importReadyMessage })
                }
                return
            }

            if (!res.ok) {
                setPreview(response)
                setStepIndex(1)
                throw new Error(copy.blockingErrors)
            }

            setResult(response)
            setStepIndex(2)
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: queryKeys.financeData }),
                queryClient.invalidateQueries({ queryKey: queryKeys.accounts }),
                queryClient.invalidateQueries({ queryKey: queryKeys.transactions }),
                queryClient.invalidateQueries({ queryKey: queryKeys.budgets }),
                queryClient.invalidateQueries({ queryKey: queryKeys.bills }),
                queryClient.invalidateQueries({ queryKey: queryKeys.goals }),
                queryClient.invalidateQueries({ queryKey: queryKeys.spreadsheets }),
                queryClient.invalidateQueries({ queryKey: queryKeys.PACERules }),
            ])
            notify.success({ title: copy.importDone, message: formatTotals(response, copy.created, copy.skipped) })
        } catch (error) {
            notify.error({
                title: dryRun ? copy.previewFailed : copy.importFailed,
                message: error instanceof Error ? error.message : undefined,
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const summary = result || preview
    const totalSteps = 3

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <FormDialogContent maxWidth="520px" stableSize height="650px">
                <FormDialogHeader
                    icon={
                        <div className={cn(UDS.iconSurface, "mb-1 flex size-14 items-center justify-center text-primary")}>
                            {stepIndex === 2 ? <CheckCircle2 className="size-6" /> : <Upload className="size-6" />}
                        </div>
                    }
                    title={copy.title}
                    description={stepIndex === 0 ? copy.chooseFile : stepIndex === 1 ? copy.previewImport : copy.done}
                />

                <div className="flex min-h-0 flex-1 flex-col gap-4">
                    {stepIndex === 0 && (
                        <FormDialogBody key="import-file">
                            <div className={cn("flex min-h-[220px] flex-col items-center justify-center gap-4 border border-dashed p-6 text-center", UDS.inputSurface)}>
                                <FileJson className="size-10 text-primary" />
                                <div className="space-y-1">
                                    <p className="text-sm font-semibold">{copy.chooseFile}</p>
                                    {file ? (
                                        <p className={cn("text-xs", UDS.muted)}>
                                            {copy.fileSelected}: {file.name} · {formatBytes(file.size)}
                                        </p>
                                    ) : null}
                                </div>
                                <Button type="button" variant="glass" size="lg" asChild>
                                    <label htmlFor="argent-import-file">
                                        <Upload className="size-4" />
                                        {copy.chooseButton}
                                    </label>
                                </Button>
                                <input
                                    id="argent-import-file"
                                    type="file"
                                    accept=".json,.csv,application/json,text/csv"
                                    className="sr-only"
                                    onChange={(event) => {
                                        setFile(event.target.files?.[0] || null)
                                        setPreview(null)
                                        setResult(null)
                                    }}
                                />
                            </div>
                        </FormDialogBody>
                    )}

                    {stepIndex === 1 && preview && (
                        <FormDialogBody key="import-preview">
                            <SummaryPanel summary={preview} copy={copy} />
                        </FormDialogBody>
                    )}

                    {stepIndex === 2 && result && (
                        <FormDialogBody key="import-result">
                            <SummaryPanel summary={result} copy={copy} />
                        </FormDialogBody>
                    )}

                    <FormDialogActions>
                        {stepIndex === 0 && (
                            <>
                                <Button type="button" variant="solid" size="lg" className="w-full" disabled={!file || isSubmitting} onClick={() => submitImport(true)}>
                                    {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Database className="size-4" />}
                                    {isSubmitting ? copy.previewing : copy.previewButton}
                                </Button>
                                <Button type="button" variant="glass" size="lg" className="w-full" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
                                    {copy.cancel}
                                </Button>
                            </>
                        )}

                        {stepIndex === 1 && preview && (
                            <>
                                <Button type="button" variant="solid" size="lg" className="w-full" disabled={preview.errors.length > 0 || isSubmitting} onClick={() => submitImport(false)}>
                                    {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                                    {isSubmitting ? copy.importing : copy.importButton}
                                </Button>
                                <Button type="button" variant="glass" size="lg" className="w-full" disabled={isSubmitting} onClick={() => setStepIndex(0)}>
                                    {copy.back}
                                </Button>
                            </>
                        )}

                        {stepIndex === 2 && (
                            <Button type="button" variant="solid" size="lg" className="w-full" onClick={() => onOpenChange(false)}>
                                {copy.close}
                            </Button>
                        )}
                    </FormDialogActions>
                    <FormDialogStepIndicator current={stepIndex} total={totalSteps} />
                </div>

                {!summary ? null : (
                    <span className="sr-only" aria-live="polite">
                        {formatTotals(summary, copy.created, copy.skipped)}
                    </span>
                )}
            </FormDialogContent>
        </Dialog>
    )
}

function SummaryPanel({ summary, copy }: { summary: ImportResponse; copy: ImportCopy }) {
    const rows = DOMAIN_ORDER
        .map((domain) => ({ domain, ...summary.counts[domain] }))
        .filter((row) => row.received > 0 || row.created > 0 || row.skipped > 0 || row.errors > 0)

    return (
        <div className="space-y-4">
            <div className={cn("flex items-center justify-between gap-3 p-3", UDS.inlineSurface)}>
                <div>
                    <p className="text-sm font-semibold">{copy.format}</p>
                    <p className={cn("text-xs", UDS.muted)}>
                        {summary.detectedFormat.kind === "backup" ? copy.argentBackup : summary.detectedFormat.entity || copy.currentExport} · {summary.detectedFormat.source.toUpperCase()}
                    </p>
                </div>
                {summary.errors.length > 0 ? (
                    <AlertTriangle className="size-5 text-amber-500" />
                ) : (
                    <CheckCircle2 className="size-5 text-emerald-500" />
                )}
            </div>

            <div className="overflow-hidden sq-normal border border-border/60">
                <div className={cn("grid grid-cols-[1fr_70px_70px_70px] gap-2 px-3 py-2 text-xs font-semibold uppercase", UDS.subtleFill)}>
                    <span>{copy.data}</span>
                    <span className="text-right">{copy.received}</span>
                    <span className="text-right">{copy.created}</span>
                    <span className="text-right">{copy.skipped}</span>
                </div>
                {rows.length === 0 ? (
                    <div className={cn("px-3 py-4 text-sm", UDS.muted)}>{copy.noImportableRows}</div>
                ) : rows.map((row) => (
                    <div key={row.domain} className="grid grid-cols-[1fr_70px_70px_70px] gap-2 border-t border-border/60 px-3 py-2 text-sm">
                        <span className="capitalize">{row.domain.replace(/([A-Z])/g, " $1")}</span>
                        <span className="text-right tabular-nums">{row.received}</span>
                        <span className="text-right tabular-nums text-emerald-600 dark:text-emerald-300">{row.created}</span>
                        <span className={cn("text-right tabular-nums", UDS.muted)}>{row.skipped}</span>
                    </div>
                ))}
            </div>

            {summary.warnings.length > 0 && (
                <MessageList title={copy.warnings} messages={summary.warnings} tone="warning" />
            )}

            {summary.errors.length > 0 && (
                <MessageList
                    title={copy.errors}
                    messages={summary.errors.slice(0, 6).map((error) => `${error.entity}${error.row ? ` ${copy.row} ${error.row}` : ""}: ${error.message}`)}
                    tone="error"
                />
            )}
        </div>
    )
}

function MessageList({ title, messages, tone }: { title: string; messages: string[]; tone: "warning" | "error" }) {
    return (
        <div className={cn("space-y-2 p-3", tone === "error" ? UDS.destructiveAlert : UDS.inlineSurface)}>
            <p className="text-sm font-semibold">{title}</p>
            <ul className="space-y-1 text-xs leading-5">
                {messages.map((message, index) => (
                    <li key={`${message}-${index}`}>{message}</li>
                ))}
            </ul>
        </div>
    )
}

function formatTotals(summary: ImportResponse, createdLabel: string, skippedLabel: string) {
    const created = DOMAIN_ORDER.reduce((sum, domain) => sum + summary.counts[domain].created, 0)
    const skipped = DOMAIN_ORDER.reduce((sum, domain) => sum + summary.counts[domain].skipped, 0)
    return `${createdLabel}: ${created} · ${skippedLabel}: ${skipped}`
}

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
