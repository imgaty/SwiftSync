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
    FormDialogContent,
    FormDialogHeader,
} from "@/components/form-dialog"
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
import { PiggyBank, Target, AlertTriangle, TrendingUp, Plus } from "lucide-react"

const BUDGET_CATEGORIES = [
    { tag: "food", category: "Food", color: "#f97316", pt: "Alimentação", en: "Food" },
    { tag: "transport", category: "Transport", color: "#3b82f6", pt: "Transportes", en: "Transport" },
    { tag: "bills", category: "Bills", color: "#ef4444", pt: "Contas", en: "Bills" },
    { tag: "entertainment", category: "Entertainment", color: "#8b5cf6", pt: "Entretenimento", en: "Entertainment" },
    { tag: "shopping", category: "Shopping", color: "#ec4899", pt: "Compras", en: "Shopping" },
    { tag: "health", category: "Health", color: "#06b6d4", pt: "Saúde", en: "Health" },
    { tag: "education", category: "Education", color: "#6366f1", pt: "Educação", en: "Education" },
    { tag: "savings", category: "Savings", color: "#22c55e", pt: "Poupança", en: "Savings" },
    { tag: "other", category: "Other", color: "#737373", pt: "Outros", en: "Other" },
]

const defaultCategory = BUDGET_CATEGORIES[0]

export default function BudgetsPage() {
    const { t } = useLanguage()
    const { formatCurrency } = useCurrency()
    const queryClient = useQueryClient()
    const f = t.finance || {}
    const isPt = (t.config?.locale || "en-US").startsWith("pt")
    const { data, isLoading } = useFinanceData()
    const budgetsData = React.useMemo(() => (data?.budgets ?? []) as Budget[], [data?.budgets])
    const hasBudgets = budgetsData.length > 0
    const accountsCount = data?.accounts?.length ?? 0
    const transactionsCount = data?.transactions?.length ?? 0
    const [dialogOpen, setDialogOpen] = React.useState(false)
    const [editingBudgetId, setEditingBudgetId] = React.useState<string | null>(null)
    const [isSaving, setIsSaving] = React.useState(false)
    const [formData, setFormData] = React.useState({
        tag: defaultCategory.tag,
        category: defaultCategory.category,
        limit: "",
        color: defaultCategory.color,
    })

    const openNewBudget = React.useCallback(() => {
        setEditingBudgetId(null)
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
            toast.error(isPt ? "Introduza um limite maior do que zero." : "Enter a limit greater than zero.")
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
            toast.success(isPt
                ? (isEditing ? "Orçamento atualizado." : "Orçamento criado.")
                : (isEditing ? "Budget updated." : "Budget created."))
            setDialogOpen(false)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : (isPt ? "Não foi possível guardar." : "Could not save budget."))
        } finally {
            setIsSaving(false)
        }
    }, [editingBudgetId, formData, isPt, queryClient])

    const handleDeleteBudget = React.useCallback(async (budget: Budget) => {
        if (!budget.id) return
        try {
            const res = await fetch(`/api/budgets/${budget.id}`, { method: "DELETE" })
            if (!res.ok) {
                const err = await res.json().catch(() => null)
                throw new Error(err?.error || "Failed to delete budget")
            }
            await queryClient.invalidateQueries({ queryKey: queryKeys.financeData })
            toast.success(isPt ? "Orçamento apagado." : "Budget deleted.")
        } catch (error) {
            toast.error(error instanceof Error ? error.message : (isPt ? "Não foi possível apagar." : "Could not delete budget."))
        }
    }, [isPt, queryClient])

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
            { label: "Total Budget", value: fmt(totalBudget), change: `${budgetsData.length} categories`, trend: "neutral" as const, icon: <Target className="h-4 w-4" /> },
            { label: "Total Spent", value: fmt(totalSpent), change: `${overallPercent}% used`, trend: overallPercent > 90 ? "down" as const : "up" as const, icon: <PiggyBank className="h-4 w-4" /> },
            { label: "Remaining", value: fmt(remaining), change: remaining >= 0 ? "Under budget" : "Over budget", trend: remaining >= 0 ? "up" as const : "down" as const, icon: <TrendingUp className="h-4 w-4" /> },
            { label: "Over Budget", value: String(overBudget), change: `${onTrack} on track`, trend: overBudget > 0 ? "down" as const : "up" as const, icon: <AlertTriangle className="h-4 w-4" /> },
        ]
    }, [budgetsData, isLoading, formatCurrency])

    return (
        <PageShell className="gap-4 p-3 md:p-4">
            <PageHeader
                breadcrumbs={[
                    { label: t.sidebar_dashboard || "Dashboard", href: "/" },
                    { label: f.budgets || "Budgets", href: "/Budgets" },
                ]}
                isLoading={isLoading}
                actions={
                    <Button onClick={openNewBudget} title={isPt ? "Novo orçamento" : "Add budget"}>
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
                    title={isPt ? "Nada para mostrar aqui" : "Nothing to show here yet"}
                    description={
                        accountsCount === 0
                            ? (isPt
                                ? "Ligue uma conta primeiro — os orçamentos fazem mais sentido quando já existe atividade financeira para acompanhar."
                                : "Connect an account first — budgets make more sense once there is financial activity to track.")
                            : transactionsCount === 0
                                ? (isPt
                                    ? "Os orçamentos dependem do histórico de transações. Assim que houver movimento, poderá começar a organizar limites por categoria."
                                    : "Budgets rely on transaction history. Once activity starts flowing in, you can organize limits by category.")
                                : (isPt
                                    ? "Ainda não há orçamentos configurados. Reveja as suas transações para começar a planear limites por categoria."
                                    : "You have no budgets set up yet. Review your transactions to start planning category limits.")}
                    action={
                        accountsCount === 0
                            ? {
                                label: isPt ? "Ligar conta" : "Connect account",
                                href: "/Accounts",
                            }
                            : transactionsCount === 0
                                ? {
                                    label: isPt ? "Ver transações" : "Review transactions",
                                    href: "/Transactions",
                                }
                                : {
                                    label: isPt ? "Criar orçamento" : "Create budget",
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
                <FormDialogContent>
                    <FormDialogHeader
                        title={editingBudgetId
                            ? (isPt ? "Editar orçamento" : "Edit budget")
                            : (isPt ? "Novo orçamento" : "New budget")}
                        description={isPt
                            ? "Defina um limite mensal por categoria."
                            : "Set a monthly limit for a category."}
                    />

                    <form
                        onSubmit={(e) => {
                            e.preventDefault()
                            handleSaveBudget()
                        }}
                        className="flex flex-col gap-4"
                    >
                        <div className="grid gap-2">
                            <Label>{isPt ? "Categoria" : "Category"}</Label>
                            <Select value={formData.tag} onValueChange={handleCategoryChange}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {BUDGET_CATEGORIES.map((item) => (
                                        <SelectItem key={item.tag} value={item.tag}>
                                            {isPt ? item.pt : item.en}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="budget-limit">{isPt ? "Limite mensal" : "Monthly limit"}</Label>
                            <Input
                                id="budget-limit"
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.limit}
                                onChange={(e) => setFormData((prev) => ({ ...prev, limit: e.target.value }))}
                                placeholder="0.00"
                            />
                        </div>

                        <FormDialogActions>
                            <Button type="submit" variant="solid" size="lg" className="w-full" disabled={isSaving}>
                                {isSaving
                                    ? (isPt ? "A guardar..." : "Saving...")
                                    : editingBudgetId
                                        ? (isPt ? "Guardar" : "Save")
                                        : (isPt ? "Criar" : "Create")}
                            </Button>
                            <Button type="button" variant="glass" size="lg" className="w-full" onClick={() => setDialogOpen(false)}>
                                {isPt ? "Cancelar" : "Cancel"}
                            </Button>
                        </FormDialogActions>
                    </form>
                </FormDialogContent>
            </Dialog>
        </PageShell>
    )
}
