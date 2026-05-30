//
//  page.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Renders the /Goals route in Argent, composing page-level layout, data dependencies, and
//  feature components for that user-facing screen.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { queryKeys, apiFetch } from "@/lib/query-keys"
import { PageShell, PageHeader, StatCards, PageSection } from "@/components/page-framework"
import { EmptyState } from "@/components/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Dialog } from "@/components/ui/dialog"
import {
    FormDialogActions,
    FormDialogContent,
    FormDialogHeader,
} from "@/components/form-dialog"
import {
    Target,
    Plus,
    Pencil,
    Trash2,
    TrendingUp,
    PiggyBank,
    Plane,
    Shield,
    ShoppingBag,
    Check,
} from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { useCurrency } from "@/components/currency-provider"
import { getTranslations } from "@/lib/translation-utils"
import { PRISM } from "@/lib/PRISM"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface FinancialGoal {
    id: string
    name: string
    targetAmount: number
    currentAmount: number
    deadline: string | null
    category: string
    color: string
    status: string
    percentage: number
    createdAt: string
}

const categoryIcons: Record<string, React.ElementType> = {
    savings: PiggyBank,
    emergency: Shield,
    investment: TrendingUp,
    purchase: ShoppingBag,
    travel: Plane,
    other: Target,
}

const categoryColors: Record<string, string> = {
    savings: "#22c55e",
    emergency: "#ef4444",
    investment: "#6366f1",
    purchase: "#f59e0b",
    travel: "#3b82f6",
    other: "#8b5cf6",
}

export default function GoalsPage() {
    const { t } = useLanguage()
    const { formatCurrency } = useCurrency()
    const g = getTranslations(t, "goals_page")
    const settings = getTranslations(t, "settings")
    const common = getTranslations(t, "common")
    const queryClient = useQueryClient()
    const { data: goals = [], isLoading } = useQuery({
        queryKey: queryKeys.goals,
        queryFn: () => apiFetch<FinancialGoal[]>("/api/goals"),
    })
    const [showDialog, setShowDialog] = React.useState(false)
    const [editingGoal, setEditingGoal] = React.useState<FinancialGoal | null>(null)
    const [isSaving, setIsSaving] = React.useState(false)
    const [formData, setFormData] = React.useState({
        name: "",
        targetAmount: "",
        currentAmount: "0",
        deadline: "",
        category: "savings",
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (isSaving) return
        const body = {
            name: formData.name,
            targetAmount: parseFloat(formData.targetAmount),
            currentAmount: parseFloat(formData.currentAmount),
            deadline: formData.deadline || null,
            category: formData.category,
            color: categoryColors[formData.category] || "#6366f1",
        }

        setIsSaving(true)
        try {
            const url = editingGoal ? `/api/goals/${editingGoal.id}` : "/api/goals"
            const method = editingGoal ? "PUT" : "POST"
            const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })

            if (res.ok) {
                toast.success(editingGoal
                    ? (g.goal_updated || "Goal updated")
                    : (g.goal_created || "Goal created")
                )
                setShowDialog(false)
                setEditingGoal(null)
                setFormData({ name: "", targetAmount: "", currentAmount: "0", deadline: "", category: "savings" })
                queryClient.invalidateQueries({ queryKey: queryKeys.goals })
            } else {
                const err = await res.json()
                toast.error(err.error)
            }
        } catch {
            toast.error(g.error_saving || "Error saving goal")
        } finally {
            setIsSaving(false)
        }
    }

    const deleteGoal = async (id: string) => {
        try {
            const res = await fetch(`/api/goals/${id}`, { method: "DELETE" })
            if (res.ok) {
                toast.success(g.goal_deleted || "Goal deleted")
                queryClient.invalidateQueries({ queryKey: queryKeys.goals })
            }
        } catch {
            toast.error(g.error_deleting || "Error deleting")
        }
    }

    const updateAmount = async (goal: FinancialGoal, amount: number) => {
        try {
            const res = await fetch(`/api/goals/${goal.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentAmount: amount }),
            })
            if (res.ok) {
                toast.success(g.amount_updated || "Amount updated")
                queryClient.invalidateQueries({ queryKey: queryKeys.goals })
            }
        } catch {
            toast.error(g.error_deleting || "Error")
        }
    }

    const openEdit = (goal: FinancialGoal) => {
        setEditingGoal(goal)
        setFormData({
            name: goal.name,
            targetAmount: String(goal.targetAmount),
            currentAmount: String(goal.currentAmount),
            deadline: goal.deadline || "",
            category: goal.category,
        })
        setShowDialog(true)
    }

    const openNew = () => {
        setEditingGoal(null)
        setFormData({ name: "", targetAmount: "", currentAmount: "0", deadline: "", category: "savings" })
        setShowDialog(true)
    }

    // Stats (memoized to avoid recalculation on dialog interactions)
    const { activeGoals, totalTarget, totalSaved, overallProgress } = React.useMemo(() => {
        const active = goals.filter((g) => g.status === "active")
        let target = 0, saved = 0
        for (const g of active) { target += g.targetAmount; saved += g.currentAmount }
        return {
            activeGoals: active,
            totalTarget: target,
            totalSaved: saved,
            overallProgress: target > 0 ? Math.round((saved / target) * 100) : 0,
        }
    }, [goals])
    const hasGoals = goals.length > 0

    return (
        <PageShell className="gap-4 p-3 md:p-4">
            <PageHeader
                breadcrumbs={[
                    { label: t.sidebar_dashboard || "Dashboard", href: "/" },
                    { label: g.title || "Financial Goals", href: "/Goals" },
                ]}
                isLoading={isLoading}
                actions={
                    <Button onClick={openNew} title={g.new_goal || "New Goal"}>
                        <Plus />
                    </Button>
                }
            />



            {(isLoading || hasGoals) && (
                <StatCards
                    stats={[
                        { label: g.active_goals || "Active Goals", value: String(activeGoals.length), icon: <Target className="h-4 w-4" /> },
                        { label: g.total_target || "Total Target", value: formatCurrency(totalTarget), icon: <TrendingUp className="h-4 w-4" /> },
                        { label: g.total_saved || "Total Saved", value: formatCurrency(totalSaved), trend: "up" as const, icon: <PiggyBank className="h-4 w-4" /> },
                        { label: g.overall_progress || "Overall Progress", value: `${overallProgress}%`, icon: <Check className="h-4 w-4" /> },
                    ]}
                    isLoading={isLoading}
                />
            )}

            <PageSection stagger={3} fill>
                {isLoading ? (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className={cn(PRISM.cardSurface, "p-5")}>
                                <Skeleton className="h-40 rounded-2xl" />
                            </div>
                        ))}
                    </div>
                ) : !hasGoals ? (
                    <EmptyState
                        variant="no-events"
                        placement="page"
                        title={g.no_goals || "No financial goals"}
                        description={g.no_goals_desc || "Create your first goal to get started"}
                        icon={<Target className="size-8" />}
                        action={{
                            label: g.create_goal || "Create Goal",
                            onClick: openNew,
                            icon: <Plus className="size-4" />,
                        }}
                    />
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {goals.map((goal) => {
                            const Icon = categoryIcons[goal.category] || Target
                            const isCompleted = goal.status === "completed"
                            const progress = Math.min(100, Math.max(0, goal.percentage))
                            const remaining = Math.max(0, goal.targetAmount - goal.currentAmount)

                            return (
                                <article
                                    key={goal.id}
                                    className={cn(
                                        PRISM.cardSurface,
                                        "flex min-h-[280px] flex-col justify-between p-4 transition-all duration-200",
                                        isCompleted && "opacity-75",
                                    )}
                                >
                                    <div>
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <div
                                                    className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border bg-[var(--surface-elevated)]"
                                                    style={{ color: goal.color }}
                                                >
                                                    <Icon className="size-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h2 className="truncate text-base font-semibold leading-tight tracking-tight">{goal.name}</h2>
                                                    <p className="mt-1 truncate text-xs text-muted-foreground">
                                                        {goal.deadline
                                                            ? `${g.deadline || "Deadline"}: ${new Date(goal.deadline).toLocaleDateString(t.config?.locale || "en-US")}`
                                                            : (g.no_deadline || "No deadline")}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex shrink-0 items-center gap-1">
                                                {isCompleted && (
                                                    <Badge variant="secondary" className="gap-1 text-green-600">
                                                        <Check className="size-3" />
                                                        {g.done || "Done"}
                                                    </Badge>
                                                )}
                                                <Button variant="ghost" size="icon-sm" onClick={() => openEdit(goal)} aria-label={g.edit_goal || "Edit Goal"}>
                                                    <Pencil className="size-3.5" />
                                                </Button>
                                                <Button variant="ghost-destructive" size="icon-sm" onClick={() => deleteGoal(goal.id)} aria-label={common.delete || "Delete"}>
                                                    <Trash2 className="size-3.5" />
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="mt-6 rounded-2xl border border-border bg-[var(--surface-elevated)] p-3">
                                            <div className="flex items-end justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="text-[11px] font-medium text-muted-foreground">{g.total_saved || "Total Saved"}</p>
                                                    <p className="mt-1 truncate text-2xl font-semibold leading-none tracking-tight tabular-nums">
                                                        {formatCurrency(goal.currentAmount)}
                                                    </p>
                                                </div>
                                                <div className="shrink-0 text-right">
                                                    <p className="text-[11px] font-medium text-muted-foreground">{g.total_target || "Total Target"}</p>
                                                    <p className="mt-1 text-sm font-semibold tabular-nums">{formatCurrency(goal.targetAmount)}</p>
                                                </div>
                                            </div>

                                            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{ width: `${progress}%`, backgroundColor: goal.color }}
                                                />
                                            </div>

                                            <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                                                <span className="font-semibold tabular-nums" style={{ color: goal.color }}>
                                                    {progress}%
                                                </span>
                                                <span className="truncate text-muted-foreground">
                                                    {isCompleted ? (g.done || "Done") : `${formatCurrency(remaining)} ${g.remaining || "remaining"}`}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {!isCompleted && (
                                        <div className="mt-4 grid grid-cols-3 gap-1.5">
                                            {[10, 50, 100].map((amt) => (
                                                <Button
                                                    key={amt}
                                                    variant="glass"
                                                    size="sm"
                                                    className="min-w-0 px-2 text-xs"
                                                    onClick={() => updateAmount(goal, goal.currentAmount + amt)}
                                                >
                                                    +{formatCurrency(amt)}
                                                </Button>
                                            ))}
                                        </div>
                                    )}
                                </article>
                            )
                        })}
                    </div>
                )}
            </PageSection>

            {/* Create/Edit Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <FormDialogContent maxWidth="430px">
                    <FormDialogHeader
                        title={editingGoal
                            ? (g.edit_goal || "Edit Goal")
                            : (g.new_financial_goal || "New Financial Goal")}
                        description={g.set_savings_target || "Set your savings target"}
                    />
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div>
                            <Input
                                label={settings.name || "Name"}
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder={g.goal_name_placeholder || "E.g. Holiday 2027"}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <Input
                                    label={g.target_amount || "Target (€)"}
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.targetAmount}
                                    onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <Input
                                    label={g.current_amount || "Current (€)"}
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.currentAmount}
                                    onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <Input
                                label={g.deadline || "Deadline"}
                                type="date"
                                value={formData.deadline}
                                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label>{g.category || "Category"}</Label>
                            <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="savings">{g.cat_savings || "Savings"}</SelectItem>
                                    <SelectItem value="emergency">{g.cat_emergency || "Emergency"}</SelectItem>
                                    <SelectItem value="investment">{g.cat_investment || "Investment"}</SelectItem>
                                    <SelectItem value="purchase">{g.cat_purchase || "Purchase"}</SelectItem>
                                    <SelectItem value="travel">{g.cat_travel || "Travel"}</SelectItem>
                                    <SelectItem value="other">{g.cat_other || "Other"}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <FormDialogActions>
                            <Button type="submit" variant="solid" size="lg" className="w-full" disabled={isSaving}>
                                {isSaving
                                    ? (common.saving || "Saving...")
                                    : editingGoal
                                        ? (common.save || "Save")
                                        : (common.create || "Create")}
                            </Button>
                            <Button type="button" variant="glass" size="lg" className="w-full" onClick={() => setShowDialog(false)}>
                                {common.cancel || "Cancel"}
                            </Button>
                        </FormDialogActions>
                    </form>
                </FormDialogContent>
            </Dialog>
        </PageShell>
    )
}
