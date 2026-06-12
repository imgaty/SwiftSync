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
import { DatePicker } from "@/components/date-picker"
import { TabSwitcher, TabSwitcherItem } from "@/components/ui/tab-switcher"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectValue,
} from "@/components/ui/select"
import { Dialog } from "@/components/ui/dialog"
import {
    FormDialogActions,
    FormDialogBody,
    FormDialogContent,
    FormDialogHeader,
    FormSelectTrigger,
    FormDialogStepIndicator,
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
    Wallet,
} from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { useCurrency } from "@/components/currency-provider"
import { getTranslations } from "@/lib/translation-utils"
import { UDS } from "@/lib/UDS"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface GoalLinkedAccount {
    id: string
    name: string
    type: string
    institution: string
    balance: number
    currency: string
    color: string
    status: string
    reference: string
}

interface GoalBankAccount {
    id: string
    name: string
    type: string
    institution: string
    balance: number
    currency: string
    color: string
    isActive: boolean
}

type GoalTargetMode = "total" | "additional"

interface FinancialGoal {
    id: string
    accountId: string | null
    name: string
    targetAmount: number
    currentAmount: number
    balanceAmount: number
    baselineAmount: number
    targetMode: GoalTargetMode
    targetTotalAmount: number
    remainingAmount: number
    deadline: string | null
    category: string
    color: string
    status: string
    percentage: number
    linkedAccount: GoalBankAccount | null
    accounts: GoalLinkedAccount[]
    createdAt: string
}

interface GoalFormData {
    name: string
    accountId: string
    targetAmount: string
    currentAmount: string
    baselineAmount: string
    targetMode: GoalTargetMode
    deadline: string
    category: string
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
    const { language, t } = useLanguage()
    const { formatCurrency } = useCurrency()
    const g = getTranslations(t, "goals_page")
    const settings = getTranslations(t, "settings")
    const common = getTranslations(t, "common")
    const queryClient = useQueryClient()
    const [showDialog, setShowDialog] = React.useState(false)
    const { data: goals = [], isLoading } = useQuery({
        queryKey: queryKeys.goals,
        queryFn: () => apiFetch<FinancialGoal[]>("/api/goals"),
    })
    const { data: bankAccounts = [], isLoading: accountsLoading } = useQuery({
        queryKey: queryKeys.accounts,
        queryFn: () => apiFetch<GoalBankAccount[]>("/api/accounts"),
    })
    const [editingGoal, setEditingGoal] = React.useState<FinancialGoal | null>(null)
    const [goalStep, setGoalStep] = React.useState(0)
    const [isSaving, setIsSaving] = React.useState(false)
    const [formData, setFormData] = React.useState<GoalFormData>({
        name: "",
        accountId: "",
        targetAmount: "",
        currentAmount: "0",
        baselineAmount: "0",
        targetMode: "total",
        deadline: "",
        category: "savings",
    })

    React.useEffect(() => {
        if (showDialog) setGoalStep(0)
    }, [showDialog])

    const displayedCurrentAmount = React.useMemo(() => {
        const amount = Number(formData.currentAmount)
        return Number.isFinite(amount) ? amount : 0
    }, [formData.currentAmount])

    const displayedBaselineAmount = React.useMemo(() => {
        const amount = Number(formData.baselineAmount)
        return Number.isFinite(amount) ? amount : 0
    }, [formData.baselineAmount])

    const displayedTargetAmount = React.useMemo(() => {
        const amount = Number(formData.targetAmount)
        return Number.isFinite(amount) ? amount : 0
    }, [formData.targetAmount])

    const displayedProgressAmount = formData.targetMode === "additional"
        ? Math.max(0, displayedCurrentAmount - displayedBaselineAmount)
        : displayedCurrentAmount
    const displayedTargetTotalAmount = formData.targetMode === "additional"
        ? displayedBaselineAmount + displayedTargetAmount
        : displayedTargetAmount

    const defaultAccount = React.useMemo(
        () => bankAccounts.find((account) => account.isActive) ?? bankAccounts[0] ?? null,
        [bankAccounts],
    )

    const selectedBankAccount = React.useMemo(
        () => bankAccounts.find((account) => account.id === formData.accountId) ?? null,
        [bankAccounts, formData.accountId],
    )

    const resetForm = React.useCallback((account: GoalBankAccount | null = defaultAccount) => {
        const balance = account ? String(account.balance) : "0"
        setFormData({
            name: "",
            accountId: account?.id ?? "",
            targetAmount: "",
            currentAmount: balance,
            baselineAmount: "0",
            targetMode: "total",
            deadline: "",
            category: "savings",
        })
    }, [defaultAccount])

    const updateTargetMode = React.useCallback((targetMode: GoalTargetMode) => {
        setFormData((current) => ({
            ...current,
            targetMode,
            baselineAmount: targetMode === "additional" ? current.currentAmount : "0",
        }))
    }, [])

    const updateLinkedAccount = React.useCallback((accountId: string) => {
        const account = bankAccounts.find((item) => item.id === accountId)
        setFormData((current) => {
            const nextBalance = account ? String(account.balance) : current.currentAmount
            return {
                ...current,
                accountId,
                currentAmount: editingGoal ? current.currentAmount : nextBalance,
                baselineAmount: current.targetMode === "additional"
                    ? (editingGoal ? current.baselineAmount : nextBalance)
                    : "0",
            }
        })
    }, [bankAccounts, editingGoal])

    React.useEffect(() => {
        if (!showDialog || editingGoal || formData.accountId || !defaultAccount) return
        resetForm(defaultAccount)
    }, [defaultAccount, editingGoal, formData.accountId, resetForm, showDialog])

    const handleGoalNext = React.useCallback(() => {
        if (goalStep === 0) {
            if (!formData.name.trim()) {
                toast.error(settings.name || "Name is required")
                return
            }
            if (!formData.accountId) {
                toast.error(g.account_required || "Pick an account")
                return
            }
            setGoalStep(1)
            return
        }

        if (goalStep === 1) {
            const targetAmount = Number(formData.targetAmount)
            const currentAmount = Number(formData.currentAmount)
            if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
                toast.error(g.target_amount || "Enter a target amount")
                return
            }
            if (!Number.isFinite(currentAmount) || currentAmount < 0) {
                toast.error(g.current_amount || "Enter a current amount")
                return
            }
            const baselineAmount = Number(formData.baselineAmount)
            if (!Number.isFinite(baselineAmount) || baselineAmount < 0) {
                toast.error(g.current_amount || "Enter a current amount")
                return
            }
            setGoalStep(2)
        }
    }, [formData.accountId, formData.baselineAmount, formData.currentAmount, formData.name, formData.targetAmount, g, goalStep, settings.name])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (isSaving) return
        const body = {
            name: formData.name,
            accountId: formData.accountId,
            targetAmount: parseFloat(formData.targetAmount),
            currentAmount: parseFloat(formData.currentAmount),
            baselineAmount: formData.targetMode === "additional" ? parseFloat(formData.baselineAmount) : 0,
            targetMode: formData.targetMode,
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
                resetForm()
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
            accountId: goal.accountId || goal.linkedAccount?.id || "",
            targetAmount: String(goal.targetAmount),
            currentAmount: String(goal.balanceAmount),
            baselineAmount: String(goal.baselineAmount),
            targetMode: goal.targetMode,
            deadline: goal.deadline || "",
            category: goal.category,
        })
        setGoalStep(0)
        setShowDialog(true)
    }

    const openNew = () => {
        setEditingGoal(null)
        resetForm()
        setGoalStep(0)
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
        <PageShell className="gap-4 p-3 pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:p-4 md:pb-4">
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
                        { label: g.active_goals || "Active Goals", value: String(activeGoals.length), icon: <Target className="size-4" /> },
                        { label: g.total_target || "Total Target", value: formatCurrency(totalTarget), icon: <TrendingUp className="size-4" /> },
                        { label: g.total_saved || "Total Saved", value: formatCurrency(totalSaved), trend: "up" as const, icon: <PiggyBank className="size-4" /> },
                        { label: g.overall_progress || "Overall Progress", value: `${overallProgress}%`, icon: <Check className="size-4" /> },
                    ]}
                    isLoading={isLoading}
                />
            )}

            <PageSection stagger={3}>
                {isLoading ? (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className={cn(UDS.cardSurface, "p-5")}>
                                <Skeleton className="h-40 sq-big" />
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
                            const remaining = goal.remainingAmount ?? Math.max(0, goal.targetAmount - goal.currentAmount)
                            const linkedAccount = goal.linkedAccount
                            const goalAccount = goal.accounts?.[0]
                            const currentLabel = goal.targetMode === "additional"
                                ? (g.additional_saved || "Additional saved")
                                : (g.total_saved || "Total Saved")
                            const targetLabel = goal.targetMode === "additional"
                                ? (g.additional_target || "Additional target")
                                : (g.total_target || "Total Target")

                            return (
                                <article
                                    key={goal.id}
                                    className={cn(
                                        UDS.cardSurface,
                                        "flex min-h-[280px] flex-col justify-between p-4 transition-all duration-200",
                                        isCompleted && "opacity-75",
                                    )}
                                >
                                    <div>
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <div
                                                    className={`${UDS.iconSurface} flex size-10 shrink-0 items-center justify-center`}
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
                                                    {linkedAccount && (
                                                        <p className="mt-1 truncate text-xs text-muted-foreground">
                                                            {linkedAccount.name} · {linkedAccount.institution}
                                                        </p>
                                                    )}
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

                                        <div className={`${UDS.largeTileSurface} mt-6 p-3`}>
                                            <div className="flex items-end justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="text-xs font-medium text-muted-foreground">{currentLabel}</p>
                                                    <p className="mt-1 truncate text-2xl font-semibold leading-none tracking-tight tabular-nums">
                                                        {formatCurrency(goal.currentAmount)}
                                                    </p>
                                                </div>
                                                <div className="shrink-0 text-right">
                                                    <p className="text-xs font-medium text-muted-foreground">{targetLabel}</p>
                                                    <p className="mt-1 text-sm font-semibold tabular-nums">{formatCurrency(goal.targetAmount)}</p>
                                                </div>
                                            </div>

                                            {goal.targetMode === "additional" && (
                                                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                                                    <span>{g.target_balance || "Target balance"}</span>
                                                    <span className="font-medium tabular-nums text-foreground">{formatCurrency(goal.targetTotalAmount)}</span>
                                                </div>
                                            )}

                                            <div className={cn("mt-4 h-2 overflow-hidden sq-full", UDS.subtleFill)}>
                                                <div
                                                    className="h-full sq-full transition-all duration-500"
                                                    style={{ width: `${progress}%`, backgroundColor: goal.color }}
                                                />
                                            </div>

                                            <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                                                <span className="font-semibold tabular-nums" style={{ color: goal.color }}>
                                                    {progress}%
                                                </span>
                                                <span className="truncate text-muted-foreground">
                                                    {isCompleted ? (
                                                        g.done || "Done"
                                                    ) : (
                                                        <>
                                                            <span className="tabular-nums">{formatCurrency(remaining)}</span> {g.remaining || "remaining"}
                                                        </>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {goalAccount && (
                                        <div className="mt-4 flex min-h-8 items-center gap-2 overflow-hidden text-xs text-muted-foreground">
                                            <Wallet className="size-3.5 shrink-0" />
                                            <span className="truncate">
                                                {(g.goal_account || "Goal account")}: {goalAccount.reference}
                                            </span>
                                        </div>
                                    )}

                                    {!isCompleted && (
                                        <div className="mt-4 grid grid-cols-3 gap-1.5">
                                            {[10, 50, 100].map((amt) => (
                                                <Button
                                                    key={amt}
                                                    variant="glass"
                                                    size="sm"
                                                    className="min-w-0 px-2 text-xs tabular-nums"
                                                    onClick={() => updateAmount(goal, goal.balanceAmount + amt)}
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
                <FormDialogContent>
                    <FormDialogHeader
                        title={editingGoal
                            ? (g.edit_goal || "Edit Goal")
                            : (g.new_financial_goal || "New Financial Goal")}
                        description={
                            goalStep === 0
                                ? (g.goal_account_step || "Name the goal and pick its account.")
                                : goalStep === 1
                                    ? (g.set_savings_target || "Set your savings target")
                                    : (g.category || "Choose timing and category")
                        }
                    />

                    <form
                        onSubmit={(e) => {
                            if (goalStep < 2) {
                                e.preventDefault()
                                handleGoalNext()
                                return
                            }
                            handleSubmit(e)
                        }}
                        className="flex flex-col gap-4"
                    >
                        {goalStep === 0 && (
                            <FormDialogBody key="goal-name">
                                <Input
                                    label={settings.name || "Name"}
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder={g.goal_name_placeholder || "E.g. Holiday 2027"}
                                    autoFocus
                                    required
                                />
                                <Select value={formData.accountId} onValueChange={updateLinkedAccount}>
                                    <FormSelectTrigger label={g.linked_account || "Linked account"}>
                                        <SelectValue placeholder={accountsLoading ? (common.loading || "Loading...") : (g.select_account || "Select account")} />
                                    </FormSelectTrigger>
                                    <SelectContent>
                                        {bankAccounts.length === 0 ? (
                                            <div className="px-2 py-1.5 text-xs text-neutral-400">
                                                {g.no_accounts || "No accounts"}
                                            </div>
                                        ) : (
                                            bankAccounts.map((account) => (
                                                <SelectItem key={account.id} value={account.id}>
                                                    <span className="flex min-w-0 items-center gap-2">
                                                        <span
                                                            className="size-2 shrink-0 sq-full"
                                                            style={{ backgroundColor: account.color }}
                                                        />
                                                        <span className="truncate">{account.name}</span>
                                                    </span>
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </FormDialogBody>
                        )}

                        {goalStep === 1 && (
                            <FormDialogBody key="goal-amounts">
                                <div className="flex flex-col gap-2">
                                    <span className="text-xs font-medium text-muted-foreground">{g.target_type || "Target type"}</span>
                                    <TabSwitcher ariaLabel={g.target_type || "Target type"} fullWidth className="[&>button]:flex-1">
                                        <TabSwitcherItem
                                            isActive={formData.targetMode === "total"}
                                            onClick={() => updateTargetMode("total")}
                                        >
                                            {g.total || "Total"}
                                        </TabSwitcherItem>
                                        <TabSwitcherItem
                                            isActive={formData.targetMode === "additional"}
                                            onClick={() => updateTargetMode("additional")}
                                        >
                                            {g.additional || "Additional"}
                                        </TabSwitcherItem>
                                    </TabSwitcher>
                                </div>
                                <Input
                                    label={formData.targetMode === "additional"
                                        ? (g.additional_target || "Additional target (€)")
                                        : (g.target_amount || "Target (€)")}
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.targetAmount}
                                    onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                                    autoFocus
                                    required
                                />
                                <div className="flex flex-col gap-2">
                                    <Input
                                        label={selectedBankAccount
                                            ? `${g.current_amount || "Current amount"} · ${selectedBankAccount.name}`
                                            : (g.current_amount || "Current amount (€)")}
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.currentAmount}
                                        onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
                                    />

                                    <div className={`${UDS.tileSurface} grid grid-cols-2 gap-3 px-3 py-2 text-sm`}>
                                        <div className="min-w-0">
                                            <p className="truncate text-xs text-muted-foreground">
                                                {formData.targetMode === "additional"
                                                    ? (g.additional_saved || "Additional saved")
                                                    : (g.total_saved || "Total Saved")}
                                            </p>
                                            <p className="mt-1 truncate font-semibold tabular-nums">{formatCurrency(displayedProgressAmount)}</p>
                                        </div>
                                        <div className="min-w-0 text-right">
                                            <p className="truncate text-xs text-muted-foreground">{g.target_balance || "Target balance"}</p>
                                            <p className="mt-1 truncate font-semibold tabular-nums">{formatCurrency(displayedTargetTotalAmount)}</p>
                                        </div>
                                    </div>
                                </div>
                            </FormDialogBody>
                        )}

                        {goalStep === 2 && (
                            <FormDialogBody key="goal-details">
                                <DatePicker
                                    value={formData.deadline}
                                    onChange={(deadline) => setFormData({ ...formData, deadline })}
                                    locale={language}
                                    placeholder={g.deadline || "Deadline"}
                                />
                                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                                    <FormSelectTrigger label={g.category || "Category"}>
                                        <SelectValue />
                                    </FormSelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="savings">{g.cat_savings || "Savings"}</SelectItem>
                                        <SelectItem value="emergency">{g.cat_emergency || "Emergency"}</SelectItem>
                                        <SelectItem value="investment">{g.cat_investment || "Investment"}</SelectItem>
                                        <SelectItem value="purchase">{g.cat_purchase || "Purchase"}</SelectItem>
                                        <SelectItem value="travel">{g.cat_travel || "Travel"}</SelectItem>
                                        <SelectItem value="other">{g.cat_other || "Other"}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormDialogBody>
                        )}

                        <FormDialogActions>
                            <Button type="submit" variant="solid" size="lg" className="w-full" disabled={isSaving}>
                                {goalStep < 2
                                    ? (common.continue || "Continue")
                                    : isSaving
                                    ? (common.saving || "Saving...")
                                    : editingGoal
                                        ? (common.save || "Save")
                                        : (common.create || "Create")}
                            </Button>
                            <Button
                                type="button"
                                variant="glass"
                                size="lg"
                                className="w-full"
                                onClick={() => {
                                    if (goalStep === 0) {
                                        setShowDialog(false)
                                        return
                                    }
                                    setGoalStep((step) => Math.max(step - 1, 0))
                                }}
                                disabled={isSaving}
                            >
                                {goalStep === 0 ? (common.cancel || "Cancel") : (common.back || "Back")}
                            </Button>
                        </FormDialogActions>
                        <FormDialogStepIndicator current={goalStep} total={3} />
                    </form>
                </FormDialogContent>
            </Dialog>
        </PageShell>
    )
}
