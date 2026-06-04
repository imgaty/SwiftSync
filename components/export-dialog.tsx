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
import { UDS } from "@/lib/UDS"
import { cn } from "@/lib/utils"

interface ExportDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
    const { language } = useLanguage()
    const [format, setFormat] = React.useState("csv")
    const [entity, setEntity] = React.useState("transactions")
    const [startDate, setStartDate] = React.useState("")
    const [endDate, setEndDate] = React.useState("")
    const [stepIndex, setStepIndex] = React.useState(0)
    const [isExporting, setIsExporting] = React.useState(false)
    const totalSteps = entity === "transactions" ? 3 : 2
    const isFinalStep = stepIndex === totalSteps - 1

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
                title: language === "pt" ? "Exportação concluída" : "Export completed",
                message: `${entity} · ${format.toUpperCase()}`,
            })
            onOpenChange(false)
        } catch {
            notify.error({
                title: language === "pt" ? "Erro na exportação" : "Export failed",
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
                    title={language === "pt" ? "Exportar Dados" : "Export Data"}
                    description={
                        stepIndex === 0
                            ? (language === "pt" ? "Escolha o conjunto de dados." : "Choose the data set.")
                            : stepIndex === 1
                                ? (language === "pt" ? "Escolha o formato do ficheiro." : "Choose the file format.")
                                : (language === "pt" ? "Filtre por intervalo de datas." : "Filter by date range.")}
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
                                <FormSelectTrigger label={language === "pt" ? "Dados a exportar" : "Data to export"}>
                                    <SelectValue />
                                </FormSelectTrigger>
                                <SelectContent>
                                    <SelectItem value="transactions">{language === "pt" ? "Transações" : "Transactions"}</SelectItem>
                                    <SelectItem value="bills">{language === "pt" ? "Contas" : "Bills"}</SelectItem>
                                    <SelectItem value="budgets">{language === "pt" ? "Orçamentos" : "Budgets"}</SelectItem>
                                    <SelectItem value="accounts">{language === "pt" ? "Contas Bancárias" : "Accounts"}</SelectItem>
                                    <SelectItem value="backup">{language === "pt" ? "Backup Completo" : "Full Backup"}</SelectItem>
                                    <SelectItem value="all">{language === "pt" ? "Relatório Completo" : "Full Report"}</SelectItem>
                                </SelectContent>
                            </Select>
                        </FormDialogBody>
                    )}

                    {stepIndex === 1 && (
                        <FormDialogBody key="export-format">
                            <div>
                                <Label>{language === "pt" ? "Formato" : "Format"}</Label>
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
                                <Label>{language === "pt" ? "Data início" : "Start date"}</Label>
                                <DatePicker
                                    value={startDate}
                                    onChange={setStartDate}
                                    locale={language}
                                    placeholder={language === "pt" ? "Data início" : "Start date"}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>{language === "pt" ? "Data fim" : "End date"}</Label>
                                <DatePicker
                                    value={endDate}
                                    onChange={setEndDate}
                                    locale={language}
                                    placeholder={language === "pt" ? "Data fim" : "End date"}
                                />
                            </div>
                        </FormDialogBody>
                    )}

                    <FormDialogActions>
                        <Button type="submit" variant="solid" size="lg" className="w-full" disabled={isExporting}>
                            {isFinalStep && <Download className="size-4 mr-2" />}
                            {!isFinalStep
                                ? (language === "pt" ? "Continuar" : "Continue")
                                : isExporting
                                ? (language === "pt" ? "A exportar..." : "Exporting...")
                                : (language === "pt" ? "Exportar" : "Export")}
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
                            {stepIndex === 0 ? (language === "pt" ? "Cancelar" : "Cancel") : (language === "pt" ? "Voltar" : "Back")}
                        </Button>
                    </FormDialogActions>
                    <FormDialogStepIndicator current={stepIndex} total={totalSteps} />
                </form>
            </FormDialogContent>
        </Dialog>
    )
}
