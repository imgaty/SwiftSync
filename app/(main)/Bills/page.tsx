//
//  page.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Renders the /Bills route in Argent, composing page-level layout, data dependencies, and
//  feature components for that user-facing screen.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { PageShell, PageHeader, StatCards, PageSection } from "@/components/page-framework"
import { BillsTable, Bill } from "@/components/bills-table"
import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog } from "@/components/ui/dialog"
import {
    FormDialogActions,
    FormDialogBody,
    FormDialogContent,
    FormDialogHeader,
    FormSelectTrigger,
    FormDialogStepIndicator,
} from "@/components/form-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectValue,
} from "@/components/ui/select"
import { useLanguage } from "@/components/language-provider"
import { useCurrency } from "@/components/currency-provider"
import { useFinanceData } from "@/hooks/use-finance-data"
import { queryKeys } from "@/lib/query-keys"
import { UDS } from "@/lib/UDS"
import { Receipt, CalendarClock, AlertTriangle, CheckCircle2, Plus } from "lucide-react"

export default function BillsPage() {
    const { t } = useLanguage()
    const { formatCurrency } = useCurrency()
    const queryClient = useQueryClient()
    const f = t.finance || {}
    const { data, isLoading } = useFinanceData()
    const billsData = React.useMemo(() => (data?.bills ?? []) as Bill[], [data?.bills])
    const accounts = React.useMemo(() => data?.accounts ?? [], [data?.accounts])
    const isPt = (t.config?.locale || "en-US").startsWith("pt")
    const hasBills = billsData.length > 0

    const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
    const [editingBillId, setEditingBillId] = React.useState<string | null>(null)
    const [billStep, setBillStep] = React.useState(0)
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
        setBillStep(0)
    }, [accounts])

    const handleBillNext = React.useCallback(() => {
        if (billStep === 0) {
            if (!formData.name.trim()) {
                toast.error(isPt ? "Introduza um nome." : "Enter a name.")
                return
            }
            setBillStep(1)
            return
        }

        if (billStep === 1) {
            const amount = Number(formData.amount)
            const dueDay = Number(formData.dueDay)
            if (!Number.isFinite(amount) || amount <= 0) {
                toast.error(isPt ? "Introduza um valor maior do que zero." : "Enter an amount greater than zero.")
                return
            }
            if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
                toast.error(isPt ? "Introduza um dia entre 1 e 31." : "Enter a day between 1 and 31.")
                return
            }
            setBillStep(2)
            return
        }

        if (billStep === 2) setBillStep(3)
    }, [billStep, formData.amount, formData.dueDay, formData.name, isPt])

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
        setBillStep(0)
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

    async function handleMarkPaid(bill: Bill) {
        try {
            const res = await fetch(`/api/bills/${bill.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "paid" }),
            })
            if (!res.ok) {
                const err = await res.json().catch(() => null)
                throw new Error(err?.error || "Failed to mark bill as paid")
            }
            await queryClient.invalidateQueries({ queryKey: queryKeys.financeData })
            toast.success(isPt ? "Conta marcada como paga." : "Bill marked as paid.")
        } catch (error) {
            toast.error(error instanceof Error ? error.message : (isPt ? "Não foi possível atualizar." : "Could not update bill."))
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
            { label: "Monthly Total", value: fmt(totalMonthly), change: `${countMonthly} bills`, trend: "neutral" as const, icon: <Receipt className="size-4" /> },
            { label: "Yearly Total", value: fmt(totalYearly), change: `${countYearly} bills`, trend: "neutral" as const, icon: <CalendarClock className="size-4" /> },
            { label: "Overdue", value: String(overdue), change: overdue > 0 ? "Needs attention" : "All good", trend: overdue > 0 ? "down" as const : "up" as const, icon: <AlertTriangle className="size-4" /> },
            { label: "Paid", value: String(paid), change: `of ${billsData.length} total`, trend: "up" as const, icon: <CheckCircle2 className="size-4" /> },
        ]
    }, [billsData, isLoading, formatCurrency])

    return (
        <PageShell className="gap-4 p-3 md:p-4">
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


            {isLoading ? (
                <>
                    <StatCards stats={stats} isLoading />
                    <PageSection stagger={3} fill>
                        <BillsTable
                            data={billsData}
                            isLoading
                            onAddBill={() => setIsAddDialogOpen(true)}
                            onEditBill={openEditDialog}
                            onDeleteBill={handleDeleteBill}
                            onMarkPaid={handleMarkPaid}
                        />
                    </PageSection>
                </>
            ) : !hasBills ? (
                <EmptyState
                    variant="no-bills"
                    placement="page"
                    title={isPt ? "Nada para mostrar aqui" : "Nothing to show here yet"}
                    description={isPt ? "Adicione contas recorrentes para acompanhar pagamentos." : "Add recurring bills to stay on top of payments."}
                    action={{
                        label: isPt ? "Adicionar conta" : "Add bill",
                        onClick: () => setIsAddDialogOpen(true),
                        icon: <Plus className="size-4" />,
                    }}
                />
            ) : (
                <>
                    <StatCards stats={stats} isLoading={false} />
                    <PageSection stagger={3} fill>
                        <BillsTable
                            data={billsData}
                            isLoading={false}
                            onAddBill={() => setIsAddDialogOpen(true)}
                            onEditBill={openEditDialog}
                            onDeleteBill={handleDeleteBill}
                            onMarkPaid={handleMarkPaid}
                        />
                    </PageSection>
                </>
            )}

            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
                setIsAddDialogOpen(open)
                if (!open) { setEditingBillId(null); resetForm() }
            }}>
                <FormDialogContent stableSize>
                    <FormDialogHeader
                        title={editingBillId ? (isPt ? "Editar conta a pagar" : "Edit bill") : (isPt ? "Adicionar conta a pagar" : "Add bill")}
                        description={
                            billStep === 0
                                ? (isPt ? "Comece pelo nome da despesa recorrente." : "Start with the recurring expense name.")
                                : billStep === 1
                                    ? (isPt ? "Defina o valor e o dia de vencimento." : "Set the amount and due day.")
                                    : billStep === 2
                                        ? (isPt ? "Classifique a frequência e categoria." : "Classify the frequency and category.")
                                        : accounts.length > 0
                                            ? (isPt ? "Associe a despesa a uma conta." : "Link the bill to an account.")
                                            : (isPt ? "Ligue primeiro uma conta na página Accounts." : "Connect an account first on the Accounts page.")}
                    />

                    <form
                        onSubmit={(e) => {
                            e.preventDefault()
                            if (billStep < 3) {
                                handleBillNext()
                                return
                            }
                            handleCreateBill()
                        }}
                        className="flex flex-col gap-4"
                    >
                        {billStep === 0 && (
                            <FormDialogBody key="bill-name">
                                <div className="grid gap-2">
                                    <Label htmlFor="bill-name">{isPt ? "Nome" : "Name"}</Label>
                                    <Input id="bill-name" value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} placeholder={isPt ? "Ex.: Internet" : "e.g. Internet"} autoFocus />
                                </div>
                            </FormDialogBody>
                        )}

                        {billStep === 1 && (
                            <FormDialogBody key="bill-amount">
                                <div className="grid gap-2">
                                    <Label htmlFor="bill-amount">{isPt ? "Valor" : "Amount"}</Label>
                                    <Input id="bill-amount" type="number" min="0" step="0.01" value={formData.amount} onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))} autoFocus />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="bill-dueDay">{isPt ? "Dia de vencimento" : "Due day"}</Label>
                                    <Input id="bill-dueDay" type="number" min="1" max="31" value={formData.dueDay} onChange={(e) => setFormData((prev) => ({ ...prev, dueDay: e.target.value }))} />
                                </div>
                            </FormDialogBody>
                        )}

                        {billStep === 2 && (
                            <FormDialogBody key="bill-classify">
                                <Select value={formData.frequency} onValueChange={(value) => setFormData((prev) => ({ ...prev, frequency: value }))}>
                                    <FormSelectTrigger label={isPt ? "Frequência" : "Frequency"}>
                                        <SelectValue />
                                    </FormSelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="weekly">{isPt ? "Semanal" : "Weekly"}</SelectItem>
                                        <SelectItem value="monthly">{isPt ? "Mensal" : "Monthly"}</SelectItem>
                                        <SelectItem value="yearly">{isPt ? "Anual" : "Yearly"}</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={formData.category} onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}>
                                    <FormSelectTrigger label={isPt ? "Categoria" : "Category"}>
                                        <SelectValue />
                                    </FormSelectTrigger>
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
                            </FormDialogBody>
                        )}

                        {billStep === 3 && (
                            <FormDialogBody key="bill-account">
                                <Select value={formData.accountId} onValueChange={(value) => setFormData((prev) => ({ ...prev, accountId: value }))} disabled={accounts.length === 0}>
                                    <FormSelectTrigger label={isPt ? "Conta associada" : "Linked account"}>
                                        <SelectValue placeholder={isPt ? "Escolha uma conta" : "Choose an account"} />
                                    </FormSelectTrigger>
                                    <SelectContent>
                                        {accounts.map((account) => (
                                            <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <label className={`${UDS.surface} ${UDS.itemHover} group flex cursor-pointer select-none items-center justify-center gap-2 px-3 py-2.5 transition-colors`}>
                                    <Checkbox checked={formData.autopay} onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, autopay: checked === true }))} />
                                    <span className="text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                                        {isPt ? "Pagamento automático" : "Autopay enabled"}
                                    </span>
                                </label>
                            </FormDialogBody>
                        )}

                        <FormDialogActions>
                            <Button type="submit" variant="solid" size="lg" className="w-full" disabled={isSaving || (billStep === 3 && accounts.length === 0)}>
                                {billStep < 3
                                    ? (isPt ? "Continuar" : "Continue")
                                    : isSaving
                                        ? (isPt ? "A guardar..." : "Saving...")
                                        : editingBillId
                                            ? (isPt ? "Guardar" : "Save")
                                            : (isPt ? "Adicionar" : "Add bill")}
                            </Button>
                            <Button
                                type="button"
                                variant="glass"
                                size="lg"
                                className="w-full"
                                onClick={() => {
                                    if (billStep === 0) {
                                        setIsAddDialogOpen(false)
                                        return
                                    }
                                    setBillStep((step) => Math.max(step - 1, 0))
                                }}
                                disabled={isSaving}
                            >
                                {billStep === 0 ? (isPt ? "Cancelar" : "Cancel") : (isPt ? "Voltar" : "Back")}
                            </Button>
                        </FormDialogActions>
                        <FormDialogStepIndicator current={billStep} total={4} />
                    </form>
                </FormDialogContent>
            </Dialog>
        </PageShell>
    )
}
