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
    FormDialogContent,
    FormDialogHeader,
} from "@/components/form-dialog"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/components/date-picker"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useLanguage } from "@/components/language-provider"
import { notify } from "@/lib/notify"

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
    const [isExporting, setIsExporting] = React.useState(false)

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
            <FormDialogContent maxWidth="430px">
                <FormDialogHeader
                    icon={
                        <div className="mb-1 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Download className="size-6" />
                        </div>
                    }
                    title={language === "pt" ? "Exportar Dados" : "Export Data"}
                    description={language === "pt"
                        ? "Exporte os seus dados financeiros em CSV ou JSON"
                        : "Export your financial data as CSV or JSON"}
                />

                <form
                    onSubmit={(e) => {
                        e.preventDefault()
                        handleExport()
                    }}
                    className="flex flex-col gap-4"
                >
                    <div>
                        <Label>{language === "pt" ? "Dados a exportar" : "Data to export"}</Label>
                        <Select value={entity} onValueChange={setEntity}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="transactions">{language === "pt" ? "Transações" : "Transactions"}</SelectItem>
                                <SelectItem value="bills">{language === "pt" ? "Contas" : "Bills"}</SelectItem>
                                <SelectItem value="budgets">{language === "pt" ? "Orçamentos" : "Budgets"}</SelectItem>
                                <SelectItem value="accounts">{language === "pt" ? "Contas Bancárias" : "Accounts"}</SelectItem>
                                <SelectItem value="all">{language === "pt" ? "Relatório Completo" : "Full Report"}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label>{language === "pt" ? "Formato" : "Format"}</Label>
                        <div className="grid grid-cols-2 gap-2 mt-1.5">
                            <Button
                                type="button"
                                variant={format === "csv" ? "solid" : "glass"}
                                onClick={() => setFormat("csv")}
                                className="justify-start"
                            >
                                <FileSpreadsheet className="h-4 w-4 mr-2" />
                                CSV
                            </Button>
                            <Button
                                type="button"
                                variant={format === "json" ? "solid" : "glass"}
                                onClick={() => setFormat("json")}
                                className="justify-start"
                            >
                                <FileJson className="h-4 w-4 mr-2" />
                                JSON
                            </Button>
                        </div>
                    </div>

                    {entity === "transactions" && (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                        </div>
                    )}

                    <FormDialogActions>
                        <Button type="submit" variant="solid" size="lg" className="w-full" disabled={isExporting}>
                            <Download className="h-4 w-4 mr-2" />
                            {isExporting
                                ? (language === "pt" ? "A exportar..." : "Exporting...")
                                : (language === "pt" ? "Exportar" : "Export")}
                        </Button>
                        <Button type="button" variant="glass" size="lg" className="w-full" onClick={() => onOpenChange(false)}>
                            {language === "pt" ? "Cancelar" : "Cancel"}
                        </Button>
                    </FormDialogActions>
                </form>
            </FormDialogContent>
        </Dialog>
    )
}
