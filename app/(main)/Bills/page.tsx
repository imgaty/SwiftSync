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
import { getTranslations } from "@/lib/translation-utils"
import { Receipt, CalendarClock, AlertTriangle, CheckCircle2, Plus } from "lucide-react"

export default function BillsPage() {
    const { t } = useLanguage()
    const { formatCurrency } = useCurrency()
    const queryClient = useQueryClient()
    const f = t.finance || {}
    const pageCopy = getTranslations(t, "bills_page")
    const common = getTranslations(t, "common")
    const statLabels = getTranslations(t, "stat_labels")
    const frequencyLabels = getTranslations(pageCopy, "frequency")
    const categoryLabels = getTranslations(pageCopy, "categories")
    const { data, isLoading } = useFinanceData()
    const billsData = React.useMemo(() => (data?.bills ?? []) as Bill[], [data?.bills])
    const accounts = React.useMemo(() => data?.accounts ?? [], [data?.accounts])
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
                toast.error(pageCopy.error_name_required || "Enter a name.")
                return
            }
            setBillStep(1)
            return
        }

        if (billStep === 1) {
            const amount = Number(formData.amount)
            const dueDay = Number(formData.dueDay)
            if (!Number.isFinite(amount) || amount <= 0) {
                toast.error(pageCopy.error_amount_positive || "Enter an amount greater than zero.")
                return
            }
            if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
                toast.error(pageCopy.error_due_day_range || "Enter a day between 1 and 31.")
                return
            }
            setBillStep(2)
            return
        }

        if (billStep === 2) setBillStep(3)
    }, [billStep, formData.amount, formData.dueDay, formData.name, pageCopy])

    async function handleCreateBill() {
        if (!formData.name || !formData.amount || !formData.dueDay || !formData.accountId || !formData.category) {
            toast.error(pageCopy.error_required_fields || "Please fill in all required fields.")
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
            toast.success(isEditing ? pageCopy.updated || "Bill updated successfully." : pageCopy.created || "Bill added successfully.")
            setIsAddDialogOpen(false)
            setEditingBillId(null)
            resetForm()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : pageCopy.error_save || "Could not save bill.")
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
            toast.success(pageCopy.deleted || "Bill deleted.")
        } catch (error) {
            toast.error(error instanceof Error ? error.message : pageCopy.error_delete || "Could not delete.")
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
            toast.success(pageCopy.marked_paid || "Bill marked as paid.")
        } catch (error) {
            toast.error(error instanceof Error ? error.message : pageCopy.error_update || "Could not update bill.")
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
            { label: statLabels.monthly_total || "Monthly Total", value: fmt(totalMonthly), change: (statLabels.bills_count || "{count} bills").replace("{count}", String(countMonthly)), trend: "neutral" as const, icon: <Receipt className="size-4" /> },
            { label: statLabels.yearly_total || "Yearly Total", value: fmt(totalYearly), change: (statLabels.bills_count || "{count} bills").replace("{count}", String(countYearly)), trend: "neutral" as const, icon: <CalendarClock className="size-4" /> },
            { label: statLabels.overdue || "Overdue", value: String(overdue), change: overdue > 0 ? statLabels.needs_attention || "Needs attention" : statLabels.all_good || "All good", trend: overdue > 0 ? "down" as const : "up" as const, icon: <AlertTriangle className="size-4" /> },
            { label: statLabels.paid || "Paid", value: String(paid), change: (statLabels.of_total || "of {count} total").replace("{count}", String(billsData.length)), trend: "up" as const, icon: <CheckCircle2 className="size-4" /> },
        ]
    }, [billsData, isLoading, formatCurrency, statLabels])

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
                        title={pageCopy.add_bill || "Add bill"}
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
                    title={pageCopy.empty_title || "Nothing to show here yet"}
                    description={pageCopy.empty_description || "Add recurring bills to stay on top of payments."}
                    action={{
                        label: pageCopy.add_bill || "Add bill",
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
                        title={editingBillId ? (pageCopy.edit_bill || "Edit bill") : (pageCopy.add_bill || "Add bill")}
                        description={
                            billStep === 0
                                ? (pageCopy.step_name || "Start with the recurring expense name.")
                                : billStep === 1
                                    ? (pageCopy.step_amount || "Set the amount and due day.")
                                    : billStep === 2
                                        ? (pageCopy.step_classify || "Classify the frequency and category.")
                                        : accounts.length > 0
                                            ? (pageCopy.step_account || "Link the bill to an account.")
                                            : (pageCopy.step_connect_account || "Connect an account first on the Accounts page.")}
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
                                    <Label htmlFor="bill-name">{common.name || "Name"}</Label>
                                    <Input id="bill-name" value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} placeholder={pageCopy.name_placeholder || "e.g. Internet"} autoFocus />
                                </div>
                            </FormDialogBody>
                        )}

                        {billStep === 1 && (
                            <FormDialogBody key="bill-amount">
                                <div className="grid gap-2">
                                    <Label htmlFor="bill-amount">{pageCopy.amount || "Amount"}</Label>
                                    <Input id="bill-amount" type="number" min="0" step="0.01" value={formData.amount} onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))} autoFocus />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="bill-dueDay">{pageCopy.due_day || "Due day"}</Label>
                                    <Input id="bill-dueDay" type="number" min="1" max="31" value={formData.dueDay} onChange={(e) => setFormData((prev) => ({ ...prev, dueDay: e.target.value }))} />
                                </div>
                            </FormDialogBody>
                        )}

                        {billStep === 2 && (
                            <FormDialogBody key="bill-classify">
                                <Select value={formData.frequency} onValueChange={(value) => setFormData((prev) => ({ ...prev, frequency: value }))}>
                                    <FormSelectTrigger label={pageCopy.frequency_label || "Frequency"}>
                                        <SelectValue />
                                    </FormSelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="weekly">{frequencyLabels.weekly || "Weekly"}</SelectItem>
                                        <SelectItem value="monthly">{frequencyLabels.monthly || "Monthly"}</SelectItem>
                                        <SelectItem value="yearly">{frequencyLabels.yearly || "Yearly"}</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={formData.category} onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}>
                                    <FormSelectTrigger label={pageCopy.category || "Category"}>
                                        <SelectValue />
                                    </FormSelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="utilities">{categoryLabels.utilities || "Utilities"}</SelectItem>
                                        <SelectItem value="housing">{categoryLabels.housing || "Housing"}</SelectItem>
                                        <SelectItem value="insurance">{categoryLabels.insurance || "Insurance"}</SelectItem>
                                        <SelectItem value="subscriptions">{categoryLabels.subscriptions || "Subscriptions"}</SelectItem>
                                        <SelectItem value="services">{categoryLabels.services || "Services"}</SelectItem>
                                        <SelectItem value="health">{categoryLabels.health || "Health"}</SelectItem>
                                        <SelectItem value="other">{categoryLabels.other || "Other"}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormDialogBody>
                        )}

                        {billStep === 3 && (
                            <FormDialogBody key="bill-account">
                                <Select value={formData.accountId} onValueChange={(value) => setFormData((prev) => ({ ...prev, accountId: value }))} disabled={accounts.length === 0}>
                                    <FormSelectTrigger label={pageCopy.linked_account || "Linked account"}>
                                        <SelectValue placeholder={pageCopy.choose_account || "Choose an account"} />
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
                                        {pageCopy.autopay || "Autopay enabled"}
                                    </span>
                                </label>
                            </FormDialogBody>
                        )}

                        <FormDialogActions>
                            <Button type="submit" variant="solid" size="lg" className="w-full" disabled={isSaving || (billStep === 3 && accounts.length === 0)}>
                                {billStep < 3
                                    ? (common.continue || "Continue")
                                    : isSaving
                                        ? (common.saving || "Saving...")
                                        : editingBillId
                                            ? (common.save || "Save")
                                            : (pageCopy.add_bill || "Add bill")}
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
                                {billStep === 0 ? (common.cancel || "Cancel") : (common.back || "Back")}
                            </Button>
                        </FormDialogActions>
                        <FormDialogStepIndicator current={billStep} total={4} />
                    </form>
                </FormDialogContent>
            </Dialog>
        </PageShell>
    )
}
