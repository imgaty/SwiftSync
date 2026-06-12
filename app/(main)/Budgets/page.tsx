//
//  page.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Renders the /Budgets route in Argent, composing page-level layout, data dependencies,
//  and feature components for that user-facing screen.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { PageShell, PageHeader, StatCards, PageSection } from "@/components/page-framework"
import { BudgetTable, Budget } from "@/components/budget-table"
import { EmptyState } from "@/components/empty-state"
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
import { getTranslations } from "@/lib/translation-utils"
import { PiggyBank, Target, AlertTriangle, TrendingUp, Plus } from "lucide-react"

const BUDGET_CATEGORIES = [
    { tag: "food", category: "Food", color: "#f97316" },
    { tag: "transport", category: "Transport", color: "#3b82f6" },
    { tag: "bills", category: "Bills", color: "#ef4444" },
    { tag: "entertainment", category: "Entertainment", color: "#8b5cf6" },
    { tag: "shopping", category: "Shopping", color: "#ec4899" },
    { tag: "health", category: "Health", color: "#06b6d4" },
    { tag: "education", category: "Education", color: "#6366f1" },
    { tag: "savings", category: "Savings", color: "#22c55e" },
    { tag: "other", category: "Other", color: "#737373" },
]

const defaultCategory = BUDGET_CATEGORIES[0]

export default function BudgetsPage() {
    const { t } = useLanguage()
    const { formatCurrency } = useCurrency()
    const queryClient = useQueryClient()
    const f = t.finance || {}
    const pageCopy = getTranslations(t, "budgets_page")
    const common = getTranslations(t, "common")
    const statLabels = getTranslations(t, "stat_labels")
    const categories = getTranslations(pageCopy, "categories")
    const { data, isLoading } = useFinanceData()
    const budgetsData = React.useMemo(() => (data?.budgets ?? []) as Budget[], [data?.budgets])
    const hasBudgets = budgetsData.length > 0
    const accountsCount = data?.accounts?.length ?? 0
    const transactionsCount = data?.transactions?.length ?? 0
    const [dialogOpen, setDialogOpen] = React.useState(false)
    const [editingBudgetId, setEditingBudgetId] = React.useState<string | null>(null)
    const [budgetStep, setBudgetStep] = React.useState(0)
    const [isSaving, setIsSaving] = React.useState(false)
    const [formData, setFormData] = React.useState({
        tag: defaultCategory.tag,
        category: defaultCategory.category,
        limit: "",
        color: defaultCategory.color,
    })

    const openNewBudget = React.useCallback(() => {
        setEditingBudgetId(null)
        setBudgetStep(0)
        setFormData({
            tag: defaultCategory.tag,
            category: defaultCategory.category,
            limit: "",
            color: defaultCategory.color,
        })
        setDialogOpen(true)
    }, [])

    const openEditBudget = React.useCallback((budget: Budget) => {
        const category = BUDGET_CATEGORIES.find((item) => item.category === budget.category || item.tag === budget.tag)
        setEditingBudgetId(budget.id ?? null)
        setFormData({
            tag: budget.tag,
            category: budget.category,
            limit: String(budget.limit ?? budget.budgetAmount ?? ""),
            color: budget.color || category?.color || defaultCategory.color,
        })
        setBudgetStep(0)
        setDialogOpen(true)
    }, [])

    const handleCategoryChange = React.useCallback((tag: string) => {
        const selected = BUDGET_CATEGORIES.find((item) => item.tag === tag) ?? defaultCategory
        setFormData((prev) => ({
            ...prev,
            tag: selected.tag,
            category: selected.category,
            color: selected.color,
        }))
    }, [])

    const handleSaveBudget = React.useCallback(async () => {
        const limit = Number(formData.limit)
        if (!Number.isFinite(limit) || limit <= 0) {
            toast.error(pageCopy.error_limit_positive || "Enter a limit greater than zero.")
            return
        }

        setIsSaving(true)
        try {
            const isEditing = Boolean(editingBudgetId)
            const res = await fetch(isEditing ? `/api/budgets/${editingBudgetId}` : "/api/budgets", {
                method: isEditing ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tag: formData.tag,
                    category: formData.category,
                    limit,
                    color: formData.color,
                }),
            })

            if (!res.ok) {
                const err = await res.json().catch(() => null)
                throw new Error(err?.error || (isEditing ? "Failed to update budget" : "Failed to create budget"))
            }

            await queryClient.invalidateQueries({ queryKey: queryKeys.financeData })
            toast.success(isEditing ? pageCopy.updated || "Budget updated." : pageCopy.created || "Budget created.")
            setDialogOpen(false)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : pageCopy.error_save || "Could not save budget.")
        } finally {
            setIsSaving(false)
        }
    }, [editingBudgetId, formData, pageCopy, queryClient])

    const handleDeleteBudget = React.useCallback(async (budget: Budget) => {
        if (!budget.id) return
        try {
            const res = await fetch(`/api/budgets/${budget.id}`, { method: "DELETE" })
            if (!res.ok) {
                const err = await res.json().catch(() => null)
                throw new Error(err?.error || "Failed to delete budget")
            }
            await queryClient.invalidateQueries({ queryKey: queryKeys.financeData })
            toast.success(pageCopy.deleted || "Budget deleted.")
        } catch (error) {
            toast.error(error instanceof Error ? error.message : pageCopy.error_delete || "Could not delete budget.")
        }
    }, [pageCopy, queryClient])

    // Compute stats from budgets
    const stats = React.useMemo(() => {
        if (isLoading || budgetsData.length === 0) return []
        let totalBudget = 0, totalSpent = 0, overBudget = 0
        for (const b of budgetsData) {
            totalBudget += b.budgetAmount
            totalSpent += b.spentAmount
            if (b.status === "over_budget") overBudget++
        }
        const remaining = totalBudget - totalSpent
        const onTrack = budgetsData.length - overBudget
        const overallPercent = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0
        const fmt = (n: number) => formatCurrency(n)
        return [
            { label: statLabels.total_budget || "Total Budget", value: fmt(totalBudget), change: (statLabels.categories_count || "{count} categories").replace("{count}", String(budgetsData.length)), trend: "neutral" as const, icon: <Target className="size-4" /> },
            { label: statLabels.total_spent || "Total Spent", value: fmt(totalSpent), change: (statLabels.percent_used || "{percent}% used").replace("{percent}", String(overallPercent)), trend: overallPercent > 90 ? "down" as const : "up" as const, icon: <PiggyBank className="size-4" /> },
            { label: statLabels.remaining || "Remaining", value: fmt(remaining), change: remaining >= 0 ? statLabels.under_budget || "Under budget" : statLabels.over_budget || "Over budget", trend: remaining >= 0 ? "up" as const : "down" as const, icon: <TrendingUp className="size-4" /> },
            { label: statLabels.over_budget || "Over Budget", value: String(overBudget), change: (statLabels.on_track_count || "{count} on track").replace("{count}", String(onTrack)), trend: overBudget > 0 ? "down" as const : "up" as const, icon: <AlertTriangle className="size-4" /> },
        ]
    }, [budgetsData, isLoading, formatCurrency, statLabels])

    return (
        <PageShell className="gap-4 p-3 md:p-4">
            <PageHeader
                breadcrumbs={[
                    { label: t.sidebar_dashboard || "Dashboard", href: "/" },
                    { label: f.budgets || "Budgets", href: "/Budgets" },
                ]}
                isLoading={isLoading}
                actions={
                    <Button onClick={openNewBudget} title={pageCopy.add_budget || "Add budget"}>
                        <Plus />
                    </Button>
                }
            />

            {isLoading ? (
                <>
                    <StatCards stats={stats} isLoading />
                    <PageSection stagger={3} fill>
                        <BudgetTable
                            data={budgetsData}
                            isLoading
                            onAddBudget={openNewBudget}
                            onEditBudget={openEditBudget}
                            onDeleteBudget={handleDeleteBudget}
                        />
                    </PageSection>
                </>
            ) : !hasBudgets ? (
                <EmptyState
                    variant="no-budgets"
                    placement="page"
                    title={pageCopy.empty_title || "Nothing to show here yet"}
                    description={
                        accountsCount === 0
                            ? (pageCopy.empty_no_accounts || "Connect an account first — budgets make more sense once there is financial activity to track.")
                            : transactionsCount === 0
                                ? (pageCopy.empty_no_transactions || "Budgets rely on transaction history. Once activity starts flowing in, you can organize limits by category.")
                                : (pageCopy.empty_default || "You have no budgets set up yet. Review your transactions to start planning category limits.")}
                    action={
                        accountsCount === 0
                            ? {
                                label: pageCopy.connect_account || "Connect account",
                                href: "/Accounts",
                            }
                            : transactionsCount === 0
                                ? {
                                    label: pageCopy.review_transactions || "Review transactions",
                                    href: "/Transactions",
                                }
                                : {
                                    label: pageCopy.create_budget || "Create budget",
                                    onClick: openNewBudget,
                            }
                    }
                />
            ) : (
                <>
                    <StatCards stats={stats} isLoading={false} />
                    <PageSection stagger={3} fill>
                        <BudgetTable
                            data={budgetsData}
                            isLoading={false}
                            onAddBudget={openNewBudget}
                            onEditBudget={openEditBudget}
                            onDeleteBudget={handleDeleteBudget}
                        />
                    </PageSection>
                </>
            )}

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <FormDialogContent stableSize height="560px">
                    <FormDialogHeader
                        title={editingBudgetId
                            ? (pageCopy.edit_budget || "Edit budget")
                            : (pageCopy.new_budget || "New budget")}
                        description={budgetStep === 0
                            ? (pageCopy.choose_category || "Choose the category you want to track.")
                            : (pageCopy.set_monthly_limit || "Set a monthly limit for the month.")}
                    />

                    <form
                        onSubmit={(e) => {
                            e.preventDefault()
                            if (budgetStep === 0) {
                                setBudgetStep(1)
                                return
                            }
                            handleSaveBudget()
                        }}
                        className="flex flex-col gap-4"
                    >
                        {budgetStep === 0 && (
                            <FormDialogBody key="budget-category">
                                <Select value={formData.tag} onValueChange={handleCategoryChange}>
                                    <FormSelectTrigger label={pageCopy.category || "Category"}>
                                        <SelectValue />
                                    </FormSelectTrigger>
                                    <SelectContent>
                                        {BUDGET_CATEGORIES.map((item) => (
                                            <SelectItem key={item.tag} value={item.tag}>
                                                {categories[item.tag] || item.category}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormDialogBody>
                        )}

                        {budgetStep === 1 && (
                            <FormDialogBody key="budget-limit">
                                <div className="grid gap-2">
                                    <Label htmlFor="budget-limit">{pageCopy.monthly_limit || "Monthly limit"}</Label>
                                    <Input
                                        id="budget-limit"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.limit}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, limit: e.target.value }))}
                                        placeholder="0.00"
                                        autoFocus
                                    />
                                </div>
                            </FormDialogBody>
                        )}

                        <FormDialogActions>
                            <Button type="submit" variant="solid" size="lg" className="w-full" disabled={isSaving}>
                                {budgetStep === 0
                                    ? (common.continue || "Continue")
                                    : isSaving
                                    ? (common.saving || "Saving...")
                                    : editingBudgetId
                                        ? (common.save || "Save")
                                        : (common.create || "Create")}
                            </Button>
                            <Button
                                type="button"
                                variant="glass"
                                size="lg"
                                className="w-full"
                                onClick={() => {
                                    if (budgetStep === 0) {
                                        setDialogOpen(false)
                                        return
                                    }
                                    setBudgetStep(0)
                                }}
                                disabled={isSaving}
                            >
                                {budgetStep === 0 ? (common.cancel || "Cancel") : (common.back || "Back")}
                            </Button>
                        </FormDialogActions>
                        <FormDialogStepIndicator current={budgetStep} total={2} />
                    </form>
                </FormDialogContent>
            </Dialog>
        </PageShell>
    )
}
