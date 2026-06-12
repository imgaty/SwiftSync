//
//  export-dialog.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Implements the Export dialog React component for Argent, encapsulating reusable
//  interface structure, state handling, and presentation logic for feature screens.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import { Download, FileSpreadsheet, FileJson } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import {
    FormDialogActions,
    FormDialogBody,
    FormDialogContent,
    FormDialogHeader,
    FormSelectTrigger,
    FormDialogStepIndicator,
} from "@/components/form-dialog"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/components/date-picker"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectValue,
} from "@/components/ui/select"
import { useLanguage } from "@/components/language-provider"
import { notify } from "@/lib/notify"
import { getTranslations } from "@/lib/translation-utils"
import { UDS } from "@/lib/UDS"
import { cn } from "@/lib/utils"

interface ExportDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
    const { t, language } = useLanguage()
    const [format, setFormat] = React.useState("csv")
    const [entity, setEntity] = React.useState("transactions")
    const [startDate, setStartDate] = React.useState("")
    const [endDate, setEndDate] = React.useState("")
    const [stepIndex, setStepIndex] = React.useState(0)
    const [isExporting, setIsExporting] = React.useState(false)
    const totalSteps = entity === "transactions" ? 3 : 2
    const isFinalStep = stepIndex === totalSteps - 1
    const copy = getTranslations(t, "export_dialog")
    const common = getTranslations(t, "common")
    const finance = getTranslations(t, "finance")

    React.useEffect(() => {
        if (open) setStepIndex(0)
    }, [open])

    React.useEffect(() => {
        if (entity === "backup") setFormat("json")
    }, [entity])

    const handleExport = async () => {
        setIsExporting(true)
        try {
            const params = new URLSearchParams({ format, entity })
            if (startDate) params.set("start", startDate)
            if (endDate) params.set("end", endDate)

            const res = await fetch(`/api/export?${params}`)
            if (!res.ok) throw new Error("Export failed")

            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `argent_${entity}_${new Date().toISOString().slice(0, 10)}.${format}`
            document.body.appendChild(a)
            a.click()
            a.remove()
            URL.revokeObjectURL(url)

            notify.success({
                title: copy.completed || "Export completed",
                message: `${entity} · ${format.toUpperCase()}`,
            })
            onOpenChange(false)
        } catch {
            notify.error({
                title: copy.failed || "Export failed",
                message: `${entity} · ${format.toUpperCase()}`,
            })
        } finally {
            setIsExporting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <FormDialogContent maxWidth="430px" stableSize height="560px">
                <FormDialogHeader
                    icon={
                        <div className={cn(UDS.iconSurface, "mb-1 flex size-14 items-center justify-center text-primary")}>
                            <Download className="size-6" />
                        </div>
                    }
                    title={copy.title || "Export Data"}
                    description={
                        stepIndex === 0
                            ? (copy.choose_data_set || "Choose the data set.")
                            : stepIndex === 1
                                ? (copy.choose_file_format || "Choose the file format.")
                                : (copy.filter_by_date_range || "Filter by date range.")}
                />

                <form
                    onSubmit={(e) => {
                        e.preventDefault()
                        if (!isFinalStep) {
                            setStepIndex((step) => Math.min(step + 1, totalSteps - 1))
                            return
                        }
                        handleExport()
                    }}
                    className="flex flex-col gap-4"
                >
                    {stepIndex === 0 && (
                        <FormDialogBody key="export-data">
                            <Select value={entity} onValueChange={(value) => { setEntity(value); if (value === "backup") setFormat("json"); setStepIndex(0) }}>
                                <FormSelectTrigger label={copy.data_to_export || "Data to export"}>
                                    <SelectValue />
                                </FormSelectTrigger>
                                <SelectContent>
                                    <SelectItem value="transactions">{finance.transactions || "Transactions"}</SelectItem>
                                    <SelectItem value="bills">{finance.bills || "Bills"}</SelectItem>
                                    <SelectItem value="budgets">{finance.budgets || "Budgets"}</SelectItem>
                                    <SelectItem value="accounts">{finance.accounts || "Accounts"}</SelectItem>
                                    <SelectItem value="backup">{copy.full_backup || "Full Backup"}</SelectItem>
                                    <SelectItem value="all">{copy.full_report || "Full Report"}</SelectItem>
                                </SelectContent>
                            </Select>
                        </FormDialogBody>
                    )}

                    {stepIndex === 1 && (
                        <FormDialogBody key="export-format">
                            <div>
                                <Label>{copy.format || "Format"}</Label>
                                <div className="mt-1.5 grid grid-cols-2 gap-2">
                                    <Button
                                        type="button"
                                        variant={format === "csv" ? "solid" : "glass"}
                                        onClick={() => setFormat("csv")}
                                        disabled={entity === "backup"}
                                        className="justify-start"
                                    >
                                        <FileSpreadsheet className="size-4 mr-2" />
                                        CSV
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={format === "json" ? "solid" : "glass"}
                                        onClick={() => setFormat("json")}
                                        className="justify-start"
                                    >
                                        <FileJson className="size-4 mr-2" />
                                        JSON
                                    </Button>
                                </div>
                            </div>
                        </FormDialogBody>
                    )}

                    {stepIndex === 2 && entity === "transactions" && (
                        <FormDialogBody key="export-dates">
                            <div className="space-y-1.5">
                                <Label>{copy.start_date || "Start date"}</Label>
                                <DatePicker
                                    value={startDate}
                                    onChange={setStartDate}
                                    locale={language}
                                    placeholder={copy.start_date || "Start date"}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>{copy.end_date || "End date"}</Label>
                                <DatePicker
                                    value={endDate}
                                    onChange={setEndDate}
                                    locale={language}
                                    placeholder={copy.end_date || "End date"}
                                />
                            </div>
                        </FormDialogBody>
                    )}

                    <FormDialogActions>
                        <Button type="submit" variant="solid" size="lg" className="w-full" disabled={isExporting}>
                            {isFinalStep && <Download className="size-4 mr-2" />}
                            {!isFinalStep
                                ? (common.continue || "Continue")
                                : isExporting
                                ? (copy.exporting || "Exporting...")
                                : (common.export || "Export")}
                        </Button>
                        <Button
                            type="button"
                            variant="glass"
                            size="lg"
                            className="w-full"
                            onClick={() => {
                                if (stepIndex === 0) {
                                    onOpenChange(false)
                                    return
                                }
                                setStepIndex((step) => Math.max(step - 1, 0))
                            }}
                            disabled={isExporting}
                        >
                            {stepIndex === 0 ? (common.cancel || "Cancel") : (common.back || "Back")}
                        </Button>
                    </FormDialogActions>
                    <FormDialogStepIndicator current={stepIndex} total={totalSteps} />
                </form>
            </FormDialogContent>
        </Dialog>
    )
}
