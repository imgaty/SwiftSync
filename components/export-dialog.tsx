"use client"

import * as React from "react"
import { Download, FileSpreadsheet, FileJson, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/date-picker"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useLanguage } from "@/components/language-provider"
import { toast } from "sonner"

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
            a.download = `swiftsync_${entity}_${new Date().toISOString().slice(0, 10)}.${format}`
            document.body.appendChild(a)
            a.click()
            a.remove()
            URL.revokeObjectURL(url)

            toast.success(language === "pt" ? "Exportação concluída" : "Export completed")
            onOpenChange(false)
        } catch {
            toast.error(language === "pt" ? "Erro na exportação" : "Export failed")
        } finally {
            setIsExporting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Download className="h-5 w-5" />
                        {language === "pt" ? "Exportar Dados" : "Export Data"}
                    </DialogTitle>
                    <DialogDescription>
                        {language === "pt"
                            ? "Exporte os seus dados financeiros em CSV ou JSON"
                            : "Export your financial data as CSV or JSON"}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
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
                                variant={format === "csv" ? "default" : "outline"}
                                onClick={() => setFormat("csv")}
                                className="justify-start"
                            >
                                <FileSpreadsheet className="h-4 w-4 mr-2" />
                                CSV
                            </Button>
                            <Button
                                type="button"
                                variant={format === "json" ? "default" : "outline"}
                                onClick={() => setFormat("json")}
                                className="justify-start"
                            >
                                <FileJson className="h-4 w-4 mr-2" />
                                JSON
                            </Button>
                        </div>
                    </div>

                    {entity === "transactions" && (
                        <div className="grid grid-cols-2 gap-4">
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

                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            {language === "pt" ? "Cancelar" : "Cancel"}
                        </Button>
                        <Button onClick={handleExport} disabled={isExporting}>
                            <Download className="h-4 w-4 mr-2" />
                            {isExporting
                                ? (language === "pt" ? "A exportar..." : "Exporting...")
                                : (language === "pt" ? "Exportar" : "Export")}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
