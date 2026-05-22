"use client"

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { PageShell, PageHeader, StatCards, PageSection } from "@/components/page-framework"
import { BillsTable, Bill } from "@/components/bills-table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useLanguage } from "@/components/language-provider"
import { useCurrency } from "@/components/currency-provider"
import { useFinanceData } from "@/hooks/use-finance-data"
import { queryKeys } from "@/lib/query-keys"
import { Receipt, CalendarClock, AlertTriangle, CheckCircle2, Plus } from "lucide-react"

export default function BillsPage() {
    const { t } = useLanguage()
    const { formatCurrency } = useCurrency()
    const queryClient = useQueryClient()
    const f = t.finance || {}
    const { data, isLoading } = useFinanceData()
    const billsData = (data?.bills || []) as Bill[]
    const accounts = data?.accounts || []
    const isPt = (t.config?.locale || "en-US").startsWith("pt")

    const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
    const [editingBillId, setEditingBillId] = React.useState<string | null>(null)
    const [isSaving, setIsSaving] = React.useState(false)
    const [formData, setFormData] = React.useState({
        name: "",
        amount: "",
        dueDay: String(new Date().getDate()),
        frequency: "monthly",
        accountId: "",
        category: "utilities",
        autopay: false,
    })

    React.useEffect(() => {
        if (!formData.accountId && accounts.length > 0) {
            setFormData((prev) => ({ ...prev, accountId: accounts[0].id }))
        }
    }, [accounts, formData.accountId])

    const resetForm = React.useCallback(() => {
        setFormData({
            name: "",
            amount: "",
            dueDay: String(new Date().getDate()),
            frequency: "monthly",
            accountId: accounts[0]?.id || "",
            category: "utilities",
            autopay: false,
        })
    }, [accounts])

    async function handleCreateBill() {
        if (!formData.name || !formData.amount || !formData.dueDay || !formData.accountId || !formData.category) {
            toast.error(isPt ? "Preencha todos os campos obrigatórios." : "Please fill in all required fields.")
            return
        }

        setIsSaving(true)
        try {
            const isEditing = Boolean(editingBillId)
            const res = await fetch(isEditing ? `/api/bills/${editingBillId}` : "/api/bills", {
                method: isEditing ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name,
                    amount: Number(formData.amount),
                    tags: [formData.category],
                    dueDay: Number(formData.dueDay),
                    frequency: formData.frequency,
                    accountId: formData.accountId,
                    category: formData.category,
                    autopay: formData.autopay,
                }),
            })

            if (!res.ok) {
                const err = await res.json().catch(() => null)
                throw new Error(err?.error || (isEditing ? "Failed to update bill" : "Failed to create bill"))
            }

            await queryClient.invalidateQueries({ queryKey: queryKeys.financeData })
            toast.success(isPt
                ? (isEditing ? "Conta actualizada com sucesso." : "Conta adicionada com sucesso.")
                : (isEditing ? "Bill updated successfully." : "Bill added successfully."))
            setIsAddDialogOpen(false)
            setEditingBillId(null)
            resetForm()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : (isPt ? "Não foi possível guardar a conta." : "Could not save bill."))
        } finally {
            setIsSaving(false)
        }
    }

    function openEditDialog(bill: Bill) {
        setEditingBillId(bill.id)
        setFormData({
            name: bill.name,
            amount: String(bill.amount),
            dueDay: String(bill.dueDay),
            frequency: bill.frequency,
            accountId: bill.accountId,
            category: bill.category,
            autopay: Boolean(bill.autopay),
        })
        setIsAddDialogOpen(true)
    }

    async function handleDeleteBill(bill: Bill) {
        try {
            const res = await fetch(`/api/bills/${bill.id}`, { method: "DELETE" })
            if (!res.ok) throw new Error("Failed to delete bill")
            await queryClient.invalidateQueries({ queryKey: queryKeys.financeData })
            toast.success(isPt ? "Conta apagada." : "Bill deleted.")
        } catch (error) {
            toast.error(error instanceof Error ? error.message : (isPt ? "Não foi possível apagar." : "Could not delete."))
        }
    }

    // Compute stats from bills
    const stats = React.useMemo(() => {
        if (isLoading || billsData.length === 0) return []
        let totalMonthly = 0, totalYearly = 0, countMonthly = 0, countYearly = 0, overdue = 0, paid = 0
        for (const b of billsData) {
            if (b.frequency === "monthly") { totalMonthly += b.amount; countMonthly++ }
            else if (b.frequency === "yearly") { totalYearly += b.amount; countYearly++ }
            if (b.status === "overdue") overdue++
            else if (b.status === "paid") paid++
        }
        const fmt = (n: number) => formatCurrency(n)
        return [
            { label: "Monthly Total", value: fmt(totalMonthly), change: `${countMonthly} bills`, trend: "neutral" as const, icon: <Receipt className="h-4 w-4" /> },
            { label: "Yearly Total", value: fmt(totalYearly), change: `${countYearly} bills`, trend: "neutral" as const, icon: <CalendarClock className="h-4 w-4" /> },
            { label: "Overdue", value: String(overdue), change: overdue > 0 ? "Needs attention" : "All good", trend: overdue > 0 ? "down" as const : "up" as const, icon: <AlertTriangle className="h-4 w-4" /> },
            { label: "Paid", value: String(paid), change: `of ${billsData.length} total`, trend: "up" as const, icon: <CheckCircle2 className="h-4 w-4" /> },
        ]
    }, [billsData, isLoading, formatCurrency])

    return (
        <PageShell>
            <PageHeader
                breadcrumbs={[
                    { label: t.sidebar_dashboard || "Dashboard", href: "/" },
                    { label: f.bills || "Bills", href: "/Bills" },
                ]}
                isLoading={isLoading}
                actions={
                    <Button
                        onClick={() => setIsAddDialogOpen(true)}
                        title={isPt ? "Nova conta a pagar" : "Add bill"}
                    >
                        <Plus />
                    </Button>
                }
            />


            <StatCards stats={stats} isLoading={isLoading} />

            <PageSection stagger={3}>
                <BillsTable
                    data={billsData}
                    isLoading={isLoading}
                    onAddBill={() => setIsAddDialogOpen(true)}
                    onEditBill={openEditDialog}
                    onDeleteBill={handleDeleteBill}
                />
            </PageSection>

            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
                setIsAddDialogOpen(open)
                if (!open) { setEditingBillId(null); resetForm() }
            }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingBillId ? (isPt ? "Editar conta a pagar" : "Edit bill") : (isPt ? "Adicionar conta a pagar" : "Add bill")}</DialogTitle>
                        <DialogDescription>
                            {accounts.length > 0
                                ? (isPt ? "Crie uma nova despesa recorrente e associe-a a uma conta." : "Create a new recurring expense and link it to an account.")
                                : (isPt ? "Ligue primeiro uma conta na página Accounts para poder associar a despesa." : "Connect an account first on the Accounts page so the bill can be assigned.")}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label htmlFor="bill-name">{isPt ? "Nome" : "Name"}</Label>
                            <Input id="bill-name" value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} placeholder={isPt ? "Ex.: Internet" : "e.g. Internet"} />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-2">
                                <Label htmlFor="bill-amount">{isPt ? "Valor" : "Amount"}</Label>
                                <Input id="bill-amount" type="number" min="0" step="0.01" value={formData.amount} onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="bill-dueDay">{isPt ? "Dia de vencimento" : "Due day"}</Label>
                                <Input id="bill-dueDay" type="number" min="1" max="31" value={formData.dueDay} onChange={(e) => setFormData((prev) => ({ ...prev, dueDay: e.target.value }))} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-2">
                                <Label>{isPt ? "Frequência" : "Frequency"}</Label>
                                <Select value={formData.frequency} onValueChange={(value) => setFormData((prev) => ({ ...prev, frequency: value }))}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="weekly">{isPt ? "Semanal" : "Weekly"}</SelectItem>
                                        <SelectItem value="monthly">{isPt ? "Mensal" : "Monthly"}</SelectItem>
                                        <SelectItem value="yearly">{isPt ? "Anual" : "Yearly"}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>{isPt ? "Categoria" : "Category"}</Label>
                                <Select value={formData.category} onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="utilities">{isPt ? "Serviços" : "Utilities"}</SelectItem>
                                        <SelectItem value="housing">{isPt ? "Habitação" : "Housing"}</SelectItem>
                                        <SelectItem value="insurance">{isPt ? "Seguro" : "Insurance"}</SelectItem>
                                        <SelectItem value="subscriptions">{isPt ? "Subscrições" : "Subscriptions"}</SelectItem>
                                        <SelectItem value="services">{isPt ? "Serviços gerais" : "Services"}</SelectItem>
                                        <SelectItem value="health">{isPt ? "Saúde" : "Health"}</SelectItem>
                                        <SelectItem value="other">{isPt ? "Outros" : "Other"}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>{isPt ? "Conta associada" : "Linked account"}</Label>
                            <Select value={formData.accountId} onValueChange={(value) => setFormData((prev) => ({ ...prev, accountId: value }))} disabled={accounts.length === 0}>
                                <SelectTrigger>
                                    <SelectValue placeholder={isPt ? "Escolha uma conta" : "Choose an account"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {accounts.map((account) => (
                                        <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <label className="flex items-center gap-2 text-sm text-neutral-400">
                            <Checkbox checked={formData.autopay} onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, autopay: checked === true }))} />
                            {isPt ? "Pagamento automático" : "Autopay enabled"}
                        </label>
                    </div>

                    <DialogFooter>
                        <Button variant="glass" onClick={() => setIsAddDialogOpen(false)}>{isPt ? "Cancelar" : "Cancel"}</Button>
                        <Button onClick={handleCreateBill} disabled={isSaving || accounts.length === 0}>
                            {isSaving
                                ? (isPt ? "A guardar..." : "Saving...")
                                : editingBillId
                                    ? (isPt ? "Guardar" : "Save")
                                    : (isPt ? "Adicionar" : "Add bill")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </PageShell>
    )
}
