"use client"

import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { queryKeys, apiFetch } from "@/lib/query-keys"
import { PageShell, PageHeader, PageTitle, StatCards, PageSection } from "@/components/page-framework"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
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
    Briefcase,
    MoreHorizontal,
    Check,
} from "lucide-react"
import { useLanguage } from "@/components/language-provider"
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
    const { t, language } = useLanguage()
    const queryClient = useQueryClient()
    const { data: goals = [], isLoading } = useQuery({
        queryKey: queryKeys.goals,
        queryFn: () => apiFetch<FinancialGoal[]>("/api/goals"),
    })
    const [showDialog, setShowDialog] = React.useState(false)
    const [editingGoal, setEditingGoal] = React.useState<FinancialGoal | null>(null)
    const [formData, setFormData] = React.useState({
        name: "",
        targetAmount: "",
        currentAmount: "0",
        deadline: "",
        category: "savings",
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const body = {
            name: formData.name,
            targetAmount: parseFloat(formData.targetAmount),
            currentAmount: parseFloat(formData.currentAmount),
            deadline: formData.deadline || null,
            category: formData.category,
            color: categoryColors[formData.category] || "#6366f1",
        }

        try {
            const url = editingGoal ? `/api/goals/${editingGoal.id}` : "/api/goals"
            const method = editingGoal ? "PUT" : "POST"
            const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })

            if (res.ok) {
                toast.success(editingGoal
                    ? (language === "pt" ? "Meta atualizada" : "Goal updated")
                    : (language === "pt" ? "Meta criada" : "Goal created")
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
            toast.error(language === "pt" ? "Erro ao guardar meta" : "Error saving goal")
        }
    }

    const deleteGoal = async (id: string) => {
        try {
            const res = await fetch(`/api/goals/${id}`, { method: "DELETE" })
            if (res.ok) {
                toast.success(language === "pt" ? "Meta eliminada" : "Goal deleted")
                queryClient.invalidateQueries({ queryKey: queryKeys.goals })
            }
        } catch {
            toast.error(language === "pt" ? "Erro ao eliminar" : "Error deleting")
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
                toast.success(language === "pt" ? "Valor atualizado" : "Amount updated")
                queryClient.invalidateQueries({ queryKey: queryKeys.goals })
            }
        } catch {
            toast.error(language === "pt" ? "Erro" : "Error")
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

    // Stats
    const activeGoals = goals.filter((g) => g.status === "active")
    const completedGoals = goals.filter((g) => g.status === "completed")
    const totalTarget = activeGoals.reduce((s, g) => s + g.targetAmount, 0)
    const totalSaved = activeGoals.reduce((s, g) => s + g.currentAmount, 0)
    const overallProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0

    return (
        <PageShell>
            <PageHeader
                breadcrumbs={[
                    { label: t.sidebar_dashboard || "Dashboard", href: "/" },
                    { label: language === "pt" ? "Metas Financeiras" : "Financial Goals", href: "/Goals" },
                ]}
                isLoading={isLoading}
                actions={
                    <Button onClick={openNew} size="sm" className="rounded-xl">
                        <Plus className="h-4 w-4 mr-1" />
                        {language === "pt" ? "Nova Meta" : "New Goal"}
                    </Button>
                }
            />

            <PageTitle
                title={language === "pt" ? "Metas Financeiras" : "Financial Goals"}
                description={language === "pt" ? "Defina e acompanhe os seus objetivos de poupança" : "Set and track your savings goals"}
                isLoading={isLoading}
                icon={<Target className="h-5 w-5" />}
            />

            <StatCards
                stats={[
                    { label: language === "pt" ? "Metas Ativas" : "Active Goals", value: String(activeGoals.length), icon: <Target className="h-4 w-4" /> },
                    { label: language === "pt" ? "Total Alvo" : "Total Target", value: `€${totalTarget.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`, icon: <TrendingUp className="h-4 w-4" /> },
                    { label: language === "pt" ? "Total Poupado" : "Total Saved", value: `€${totalSaved.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`, trend: "up" as const, icon: <PiggyBank className="h-4 w-4" /> },
                    { label: language === "pt" ? "Progresso Global" : "Overall Progress", value: `${overallProgress}%`, icon: <Check className="h-4 w-4" /> },
                ]}
                isLoading={isLoading}
            />

            {/* Goals Grid */}
            <PageSection stagger={3}>
            {isLoading ? (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <Card key={i}><CardContent className="p-6"><Skeleton className="h-40" /></CardContent></Card>
                    ))}
                </div>
            ) : goals.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Target className="h-12 w-12 text-neutral-500 dark:text-neutral-400 mb-4" />
                        <h3 className="text-lg font-medium">
                            {language === "pt" ? "Sem metas financeiras" : "No financial goals"}
                        </h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                            {language === "pt" ? "Crie a sua primeira meta para começar" : "Create your first goal to get started"}
                        </p>
                        <Button onClick={openNew}>
                            <Plus className="h-4 w-4 mr-1" />
                            {language === "pt" ? "Criar Meta" : "Create Goal"}
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {goals.map((goal) => {
                        const Icon = categoryIcons[goal.category] || Target
                        const isCompleted = goal.status === "completed"
                        return (
                            <Card key={goal.id} className={isCompleted ? "opacity-75" : ""}>
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 rounded-lg" style={{ backgroundColor: `${goal.color}20` }}>
                                                <Icon className="h-4 w-4" style={{ color: goal.color }} />
                                            </div>
                                            <div>
                                                <CardTitle className="text-base">{goal.name}</CardTitle>
                                                <CardDescription className="text-xs">
                                                    {goal.deadline
                                                        ? `${language === "pt" ? "Prazo:" : "Deadline:"} ${new Date(goal.deadline).toLocaleDateString(language === "pt" ? "pt-PT" : "en-US")}`
                                                        : (language === "pt" ? "Sem prazo" : "No deadline")}
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            {isCompleted && <Badge variant="secondary" className="text-green-600"><Check className="h-3 w-3 mr-1" />{language === "pt" ? "Concluída" : "Done"}</Badge>}
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(goal)}>
                                                <Pencil className="h-3 w-3" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => deleteGoal(goal.id)}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-neutral-500 dark:text-neutral-400">
                                            €{goal.currentAmount.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}
                                        </span>
                                        <span className="font-medium">
                                            €{goal.targetAmount.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="h-3 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${Math.min(100, goal.percentage)}%`,
                                                backgroundColor: goal.color,
                                            }}
                                        />
                                    </div>
                                    <div className="text-center text-sm font-medium" style={{ color: goal.color }}>
                                        {goal.percentage}%
                                    </div>

                                    {/* Quick add amount */}
                                    {!isCompleted && (
                                        <div className="flex gap-1 mt-2">
                                            {[10, 50, 100].map((amt) => (
                                                <Button
                                                    key={amt}
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1 text-xs"
                                                    onClick={() => updateAmount(goal, goal.currentAmount + amt)}
                                                >
                                                    +€{amt}
                                                </Button>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}

            </PageSection>

            {/* Create/Edit Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editingGoal
                                ? (language === "pt" ? "Editar Meta" : "Edit Goal")
                                : (language === "pt" ? "Nova Meta Financeira" : "New Financial Goal")}
                        </DialogTitle>
                        <DialogDescription>
                            {language === "pt"
                                ? "Defina o seu objetivo de poupança"
                                : "Set your savings target"}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Input
                                label={language === "pt" ? "Nome" : "Name"}
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder={language === "pt" ? "Ex: Férias 2027" : "E.g. Holiday 2027"}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Input
                                    label={language === "pt" ? "Valor Alvo (€)" : "Target (€)"}
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
                                    label={language === "pt" ? "Valor Atual (€)" : "Current (€)"}
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
                                label={language === "pt" ? "Prazo" : "Deadline"}
                                type="date"
                                value={formData.deadline}
                                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label>{language === "pt" ? "Categoria" : "Category"}</Label>
                            <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="savings">{language === "pt" ? "Poupança" : "Savings"}</SelectItem>
                                    <SelectItem value="emergency">{language === "pt" ? "Emergência" : "Emergency"}</SelectItem>
                                    <SelectItem value="investment">{language === "pt" ? "Investimento" : "Investment"}</SelectItem>
                                    <SelectItem value="purchase">{language === "pt" ? "Compra" : "Purchase"}</SelectItem>
                                    <SelectItem value="travel">{language === "pt" ? "Viagem" : "Travel"}</SelectItem>
                                    <SelectItem value="other">{language === "pt" ? "Outro" : "Other"}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                                {language === "pt" ? "Cancelar" : "Cancel"}
                            </Button>
                            <Button type="submit">
                                {editingGoal
                                    ? (language === "pt" ? "Guardar" : "Save")
                                    : (language === "pt" ? "Criar" : "Create")}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </PageShell>
    )
}
