//
//  rules-panel.tsx
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Implements the Rules panel React component for Argent, encapsulating reusable interface
//  structure, state handling, and presentation logic for feature screens.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

// Settings → Rules panel.
//
// Lists structured Rules and lets users create/edit/delete them. Each rule
// holds a list of filters (AND-combined) and a list of tag slugs to add when
// the rule matches. The filter shape comes from lib/rule-evaluator.ts —
// the list of allowed (field, op) pairs lives there too.

import * as React from "react"
import { Plus, Trash2, Pencil, X } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AnimatedToggle } from "@/components/ui/animated-toggle"
import { Dialog } from "@/components/ui/dialog"
import {
    FormDialogActions,
    FormDialogContent,
    FormDialogHeader,
} from "@/components/form-dialog"

import { SectionHeader, SettingsSection, SettingsDivider } from "./primitives"
import {
    OPS_BY_FIELD,
    type RuleField,
    type RuleOp,
    type RuleFilter,
} from "@/lib/PACE"
import { UDS } from "@/lib/UDS"

// ---------------------------------------------------------------------------
// Types & labels
// ---------------------------------------------------------------------------

interface ApiRule {
    id: string
    name: string
    enabled: boolean
    filters: RuleFilter[]
    addTagSlugs: string[]
    priority: number
    createdAt: string
    updatedAt: string
}

const FIELDS: RuleField[] = ["counterparty", "description", "amount", "type"]

const FIELD_LABELS: Record<RuleField, string> = {
    counterparty: "Counterparty",
    description: "Description",
    amount: "Amount",
    type: "Type",
}

const OP_LABELS: Record<RuleOp, string> = {
    eq: "is",
    neq: "is not",
    contains: "contains",
    notContains: "does not contain",
    in: "is one of",
    gt: "greater than",
    gte: "at least",
    lt: "less than",
    lte: "at most",
    between: "between",
}

// Sane defaults for a new filter so the value type matches op.
function defaultValueFor(field: RuleField, op: RuleOp): unknown {
    if (field === "type") return "out"
    if (field === "amount") {
        if (op === "between") return [0, 0]
        return 0
    }
    if (op === "in") return []
    return ""
}

function newFilter(): RuleFilter {
    return { field: "counterparty", op: "eq", value: "" }
}

// Human-readable summary of a single filter.
function describeFilter(f: RuleFilter): string {
    const fieldLabel = FIELD_LABELS[f.field] ?? f.field
    const opLabel = OP_LABELS[f.op] ?? f.op
    const v = f.value
    let valLabel = ""
    if (Array.isArray(v)) {
        valLabel = v.length === 2 && f.op === "between"
            ? `${v[0]} and ${v[1]}`
            : v.join(", ")
    } else if (typeof v === "number" || typeof v === "string") {
        valLabel = String(v)
    }
    return `${fieldLabel} ${opLabel} ${valLabel}`.trim()
}

// ---------------------------------------------------------------------------
// Filter row
// ---------------------------------------------------------------------------

function FilterRow({
    filter,
    onChange,
    onRemove,
    canRemove,
}: {
    filter: RuleFilter
    onChange: (next: RuleFilter) => void
    onRemove: () => void
    canRemove: boolean
}) {
    const allowedOps = OPS_BY_FIELD[filter.field] ?? []
    const valueShouldBeArray =
        (filter.field === "amount" && filter.op === "between") ||
        filter.op === "in"

    return (
        <div className="flex items-start gap-2">
            {/* Field */}
            <Select
                value={filter.field}
                onValueChange={(v) => {
                    const nextField = v as RuleField
                    const fallbackOp = OPS_BY_FIELD[nextField][0]
                    const nextOp = OPS_BY_FIELD[nextField].includes(filter.op)
                        ? filter.op
                        : fallbackOp
                    onChange({
                        field: nextField,
                        op: nextOp,
                        value: defaultValueFor(nextField, nextOp),
                    })
                }}
            >
                <SelectTrigger className="w-[140px] shrink-0">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {FIELDS.map((f) => (
                        <SelectItem key={f} value={f}>
                            {FIELD_LABELS[f]}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Op */}
            <Select
                value={filter.op}
                onValueChange={(v) => {
                    const nextOp = v as RuleOp
                    // Reset value when switching to/from array-shaped ops to keep
                    // the value type consistent with the op.
                    const nextWantsArray =
                        (filter.field === "amount" && nextOp === "between") ||
                        nextOp === "in"
                    const valueOk = nextWantsArray === valueShouldBeArray
                    onChange({
                        ...filter,
                        op: nextOp,
                        value: valueOk ? filter.value : defaultValueFor(filter.field, nextOp),
                    })
                }}
            >
                <SelectTrigger className="w-[140px] shrink-0">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {allowedOps.map((op) => (
                        <SelectItem key={op} value={op}>
                            {OP_LABELS[op]}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Value */}
            <div className="flex-1 min-w-0">
                <FilterValueInput filter={filter} onChange={(value) => onChange({ ...filter, value })} />
            </div>

            <Button variant="ghost"
                type="button"
                onClick={onRemove}
                disabled={!canRemove}
                aria-label="Remove filter"
                className={cn(
                    "shrink-0 mt-1 p-1.5 sq-md text-neutral-400 transition-all duration-150",
                    canRemove
                        ? "hover:text-red-400 hover:bg-red-500/10"
                        : "opacity-30 pointer-events-none",
                )}
            >
                <X className="size-4" />
            </Button>
        </div>
    )
}

function FilterValueInput({
    filter,
    onChange,
}: {
    filter: RuleFilter
    onChange: (value: unknown) => void
}) {
    if (filter.field === "type") {
        const v = typeof filter.value === "string" ? filter.value : "out"
        return (
            <Select value={v} onValueChange={onChange}>
                <SelectTrigger>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="in">Income</SelectItem>
                    <SelectItem value="out">Expense</SelectItem>
                </SelectContent>
            </Select>
        )
    }

    if (filter.field === "amount") {
        if (filter.op === "between") {
            const pair: [number, number] =
                Array.isArray(filter.value) && filter.value.length === 2 && filter.value.every((n) => typeof n === "number")
                    ? (filter.value as [number, number])
                    : [0, 0]
            return (
                <div className="flex items-center gap-2">
                    <Input
                        type="number"
                        value={String(pair[0])}
                        onChange={(e) => onChange([Number(e.target.value) || 0, pair[1]])}
                        placeholder="min"
                    />
                    <span className="text-xs text-neutral-400">and</span>
                    <Input
                        type="number"
                        value={String(pair[1])}
                        onChange={(e) => onChange([pair[0], Number(e.target.value) || 0])}
                        placeholder="max"
                    />
                </div>
            )
        }
        return (
            <Input
                type="number"
                value={typeof filter.value === "number" ? String(filter.value) : ""}
                onChange={(e) => onChange(Number(e.target.value) || 0)}
                placeholder="0"
            />
        )
    }

    if (filter.op === "in") {
        const arr = Array.isArray(filter.value) ? (filter.value as string[]) : []
        return (
            <Input
                value={arr.join(", ")}
                onChange={(e) =>
                    onChange(
                        e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                    )
                }
                placeholder="continente, lidl, pingo doce"
            />
        )
    }

    return (
        <Input
            value={typeof filter.value === "string" ? filter.value : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={
                filter.field === "counterparty"
                    ? "e.g. continente"
                    : "e.g. salary"
            }
        />
    )
}

// ---------------------------------------------------------------------------
// Edit dialog
// ---------------------------------------------------------------------------

interface EditDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    initial: ApiRule | null
    onSaved: () => void
}

function EditDialog({ open, onOpenChange, initial, onSaved }: EditDialogProps) {
    const [name, setName] = React.useState("")
    const [enabled, setEnabled] = React.useState(true)
    const [filters, setFilters] = React.useState<RuleFilter[]>([])
    const [tagSlugsInput, setTagSlugsInput] = React.useState("")
    const [saving, setSaving] = React.useState(false)

    // Reset form when the dialog opens with a new rule (or fresh).
    React.useEffect(() => {
        if (!open) return
        if (initial) {
            setName(initial.name)
            setEnabled(initial.enabled)
            setFilters(initial.filters.length > 0 ? initial.filters : [newFilter()])
            setTagSlugsInput(initial.addTagSlugs.join(", "))
        } else {
            setName("")
            setEnabled(true)
            setFilters([newFilter()])
            setTagSlugsInput("")
        }
    }, [open, initial])

    const isEditing = initial !== null

    const handleSave = async () => {
        const tagSlugs = tagSlugsInput
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean)

        if (!name.trim()) {
            toast.error("Name is required")
            return
        }
        if (filters.length === 0) {
            toast.error("Add at least one filter")
            return
        }
        if (tagSlugs.length === 0) {
            toast.error("Add at least one tag slug")
            return
        }

        setSaving(true)
        try {
            const url = isEditing ? `/api/rules/${initial!.id}` : "/api/rules"
            const method = isEditing ? "PUT" : "POST"
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name.trim(),
                    enabled,
                    filters,
                    addTagSlugs: tagSlugs,
                }),
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err?.error || `Failed (${res.status})`)
            }
            toast.success(isEditing ? "Rule updated" : "Rule created")
            onSaved()
            onOpenChange(false)
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to save rule")
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <FormDialogContent maxWidth="520px">
                <FormDialogHeader
                    title={isEditing ? "Edit rule" : "New rule"}
                    description="Tag transactions automatically when all filters match."
                />

                <form
                    onSubmit={(e) => {
                        e.preventDefault()
                        handleSave()
                    }}
                    className="flex flex-col gap-5"
                >
                        {/* Name */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Name</label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Big purchases"
                                maxLength={100}
                            />
                        </div>

                        {/* Filters */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">Filters</label>
                                <span className="text-xs text-neutral-400">all must match</span>
                            </div>
                            <div className="space-y-2">
                                {filters.map((f, i) => (
                                    <FilterRow
                                        key={i}
                                        filter={f}
                                        canRemove={filters.length > 1}
                                        onChange={(next) =>
                                            setFilters((prev) => prev.map((p, idx) => (idx === i ? next : p)))
                                        }
                                        onRemove={() =>
                                            setFilters((prev) => prev.filter((_, idx) => idx !== i))
                                        }
                                    />
                                ))}
                            </div>
                            <Button variant="ghost"
                                type="button"
                                onClick={() => setFilters((prev) => [...prev, newFilter()])}
                                className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                            >
                                <Plus className="size-3.5" />
                                Add filter
                            </Button>
                        </div>

                        {/* Tags */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Tags to add</label>
                            <Input
                                value={tagSlugsInput}
                                onChange={(e) => setTagSlugsInput(e.target.value)}
                                placeholder="groceries, big_purchase"
                            />
                            <p className="text-xs text-neutral-400">
                                Comma-separated. Lowercase, digits, <code>-</code> and <code>_</code> only.
                            </p>
                        </div>

                        {/* Enabled */}
                        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-1.5">
                            <div className="space-y-0.5">
                                <p className="text-sm font-medium">Enabled</p>
                                <p className="text-xs text-neutral-400">Disabled rules do not run.</p>
                            </div>
                            <div className="flex h-7 items-center justify-end">
                                <AnimatedToggle checked={enabled} onCheckedChange={setEnabled} />
                            </div>
                        </div>

                    <FormDialogActions>
                        <Button type="submit" variant="solid" size="lg" className="w-full" disabled={saving}>
                            {saving ? "Saving…" : isEditing ? "Save" : "Create"}
                        </Button>
                        <Button
                            type="button"
                            variant="glass"
                            size="lg"
                            className="w-full"
                            onClick={() => onOpenChange(false)}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                    </FormDialogActions>
                </form>
            </FormDialogContent>
        </Dialog>
    )
}

// ---------------------------------------------------------------------------
// Rule row
// ---------------------------------------------------------------------------

function RuleRow({
    rule,
    onToggle,
    onEdit,
    onDelete,
}: {
    rule: ApiRule
    onToggle: (enabled: boolean) => void
    onEdit: () => void
    onDelete: () => void
}) {
    const summary = rule.filters.map(describeFilter).join("  ·  ")

    return (
        <div className={cn("flex items-center gap-3 border-t py-3 first:border-t-0", UDS.cardDivider)}>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{rule.name}</p>
                    <div className="flex gap-1">
                        {rule.addTagSlugs.map((slug) => (
                            <span
                                key={slug}
                                className={cn("px-1.5 py-0.5 text-xs text-neutral-400", UDS.pillSurface)}
                            >
                                {slug}
                            </span>
                        ))}
                    </div>
                </div>
                <p className="text-xs text-neutral-400 truncate mt-0.5">
                    {summary || <span className="italic">no filters</span>}
                </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
                <div className="flex h-7 w-11 items-center justify-center">
                    <AnimatedToggle checked={rule.enabled} onCheckedChange={onToggle} />
                </div>
                <Button variant="ghost"
                    size="icon"
                    type="button"
                    onClick={onEdit}
                    aria-label="Edit rule"
                    className={cn("sq-md text-neutral-400 transition-colors hover:text-black dark:hover:text-white", UDS.itemHover)}
                >
                    <Pencil className="size-4" />
                </Button>
                <Button variant="ghost"
                    size="icon"
                    type="button"
                    onClick={onDelete}
                    aria-label="Delete rule"
                    className="sq-md text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                    <Trash2 className="size-4" />
                </Button>
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Top-level panel
// ---------------------------------------------------------------------------

export function RulesPanel() {
    const [rules, setRules] = React.useState<ApiRule[] | null>(null)
    const [error, setError] = React.useState<string | null>(null)
    const [editOpen, setEditOpen] = React.useState(false)
    const [editing, setEditing] = React.useState<ApiRule | null>(null)

    const load = React.useCallback(async () => {
        setError(null)
        try {
            const res = await fetch("/api/rules")
            if (!res.ok) throw new Error(`Failed to load (${res.status})`)
            const data = await res.json()
            setRules(data.rules ?? [])
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load rules")
        }
    }, [])

    React.useEffect(() => {
        load()
    }, [load])

    const handleToggle = async (rule: ApiRule, enabled: boolean) => {
        // Optimistic update — revert on error.
        setRules((prev) =>
            prev ? prev.map((r) => (r.id === rule.id ? { ...r, enabled } : r)) : prev,
        )
        try {
            const res = await fetch(`/api/rules/${rule.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ enabled }),
            })
            if (!res.ok) throw new Error(`Failed (${res.status})`)
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to update")
            load()
        }
    }

    const handleDelete = async (rule: ApiRule) => {
        if (!window.confirm(`Delete rule “${rule.name}”?`)) return
        try {
            const res = await fetch(`/api/rules/${rule.id}`, { method: "DELETE" })
            if (!res.ok) throw new Error(`Failed (${res.status})`)
            toast.success("Rule deleted")
            load()
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to delete")
        }
    }

    return (
        <div className="space-y-4">
            <SectionHeader
                title="Rules"
                description="Tag transactions automatically using structured filters. Rules add tags on top of the auto-categorization layer."
            />

            <SettingsDivider />

            <SettingsSection
                title="Your rules"
                description={
                    rules === null
                        ? "Loading…"
                        : rules.length === 0
                            ? "No rules yet."
                            : `${rules.length} rule${rules.length === 1 ? "" : "s"}`
                }
            >
                {error && (
                    <p className="text-sm text-red-400">{error}</p>
                )}

                {rules && rules.length > 0 && (
                    <div className={`${UDS.inlineSurface} px-3`}>
                        {rules.map((r) => (
                            <RuleRow
                                key={r.id}
                                rule={r}
                                onToggle={(v) => handleToggle(r, v)}
                                onEdit={() => {
                                    setEditing(r)
                                    setEditOpen(true)
                                }}
                                onDelete={() => handleDelete(r)}
                            />
                        ))}
                    </div>
                )}

                <div>
                    <Button
                        onClick={() => {
                            setEditing(null)
                            setEditOpen(true)
                        }}
                        size="sm"
                    >
                        <Plus className="size-3.5 mr-1.5" />
                        New rule
                    </Button>
                </div>
            </SettingsSection>

            <EditDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                initial={editing}
                onSaved={load}
            />
        </div>
    )
}
