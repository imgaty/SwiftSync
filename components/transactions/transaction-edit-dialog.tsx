//
//  transaction-edit-dialog.tsx
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Implements the Transaction edit dialog transaction component for Argent, supporting
//  transaction review, tagging, editing, and related money-management workflows.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

// Create / edit a transaction. Same dialog handles both — pass `initial` for
// edit (PUT /api/transactions/[id]), omit it for create (POST /api/transactions).
//
// Uses the existing TagPicker so tags get the full color/icon UX, and on
// creation lets PACE auto-tag the rest by sending no `tags` field (the API
// runs the structured rule evaluator + legacy PACE).

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"

import { notify } from "@/lib/notify"
import { queryKeys } from "@/lib/query-keys"
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
import { DatePicker } from "@/components/date-picker"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectValue,
} from "@/components/ui/select"
import { TagPicker } from "@/components/tag-picker"
import { useLanguage } from "@/components/language-provider"
import type { Account, Transaction } from "@/lib/types"
import { UDS } from "@/lib/UDS"

interface TransactionEditDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** Provide for edit; omit for create. */
    initial?: Transaction | null
    /** All accounts in scope — used for the account picker. */
    accounts: Account[]
    /** Called after a successful save. */
    onSaved?: () => void
}

const todayISO = () => new Date().toISOString().slice(0, 10)

export function TransactionEditDialog({
    open,
    onOpenChange,
    initial,
    accounts,
    onSaved,
}: TransactionEditDialogProps) {
    const qc = useQueryClient()
    const { language } = useLanguage()
    const isEditing = !!initial

    const [date, setDate] = React.useState(todayISO())
    const [type, setType] = React.useState<"in" | "out">("out")
    const [amount, setAmount] = React.useState("")
    const [description, setDescription] = React.useState("")
    const [accountId, setAccountId] = React.useState<string>("")
    const [tags, setTags] = React.useState<string[]>([])
    const [stepIndex, setStepIndex] = React.useState(0)
    const [submitting, setSubmitting] = React.useState(false)

    // Reset form whenever the dialog opens or the source transaction changes.
    React.useEffect(() => {
        if (!open) return
        if (initial) {
            setDate(initial.date)
            setType(initial.type)
            setAmount(String(initial.amount))
            setDescription(initial.description)
            setAccountId(initial.accountId)
            setTags(initial.tags ?? [])
        } else {
            setDate(todayISO())
            setType("out")
            setAmount("")
            setDescription("")
            setAccountId(accounts[0]?.id ?? "")
            setTags([])
        }
        setStepIndex(0)
    }, [open, initial, accounts])

    const handleNext = React.useCallback(() => {
        if (stepIndex === 0) {
            const amt = Number(amount)
            if (!Number.isFinite(amt) || amt <= 0) {
                notify.error({ title: "Invalid amount", message: "Enter a positive number.", transient: true })
                return
            }
            setStepIndex(1)
            return
        }

        if (stepIndex === 1) {
            if (!description.trim()) {
                notify.error({ title: "Description required", transient: true })
                return
            }
            setStepIndex(2)
            return
        }

        if (stepIndex === 2) {
            if (!accountId) {
                notify.error({ title: "Pick an account", transient: true })
                return
            }
            setStepIndex(3)
        }
    }, [accountId, amount, description, stepIndex])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const amt = Number(amount)
        if (!Number.isFinite(amt) || amt <= 0) {
            notify.error({ title: "Invalid amount", message: "Enter a positive number.", transient: true })
            return
        }
        if (!description.trim()) {
            notify.error({ title: "Description required", transient: true })
            return
        }
        if (!accountId) {
            notify.error({ title: "Pick an account", transient: true })
            return
        }

        setSubmitting(true)
        try {
            const body: Record<string, unknown> = {
                date,
                type,
                amount: amt,
                description: description.trim(),
                accountId,
            }
            // Only send tags if the user explicitly set some — letting an empty
            // array through on create would skip the auto-tagger.
            if (tags.length > 0) body.tags = tags
            // On edit, always send tags (even empty) so the user can clear them.
            if (isEditing) body.tags = tags

            const url = isEditing
                ? `/api/transactions/${initial!.id}`
                : "/api/transactions"
            const method = isEditing ? "PUT" : "POST"

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err?.error || `Failed (${res.status})`)
            }

            qc.invalidateQueries({ queryKey: queryKeys.financeData })
            notify.success({
                title: isEditing ? "Transaction updated" : "Transaction added",
                message: `${type === "in" ? "+" : "-"}${amt.toFixed(2)} · ${description.trim().slice(0, 60)}`,
            })
            onSaved?.()
            onOpenChange(false)
        } catch (err) {
            notify.error({
                title: isEditing ? "Failed to update" : "Failed to add",
                message: err instanceof Error ? err.message : "Unknown error",
            })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <FormDialogContent maxWidth="430px" stableSize>
                <FormDialogHeader
                    title={isEditing ? "Edit transaction" : "New transaction"}
                    description={
                        stepIndex === 0
                            ? "Set the transaction type and amount."
                            : stepIndex === 1
                                ? "Add the merchant or transaction description."
                                : stepIndex === 2
                                    ? "Choose when it happened and which account it belongs to."
                                    : isEditing
                                        ? "Review tags before saving."
                                        : "Tags will be auto-assigned by PACE if you leave them empty."}
                />

                <form
                    onSubmit={(e) => {
                        if (stepIndex < 3) {
                            e.preventDefault()
                            handleNext()
                            return
                        }
                        handleSubmit(e)
                    }}
                    className="flex flex-col gap-4"
                >
                        {/* Type + Amount */}
                        {stepIndex === 0 && (
                            <FormDialogBody key="transaction-amount">
                                <Select value={type} onValueChange={(v) => setType(v as "in" | "out")}>
                                    <FormSelectTrigger label="Type">
                                        <SelectValue />
                                    </FormSelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="out">Expense</SelectItem>
                                        <SelectItem value="in">Income</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Input
                                    label="Amount"
                                    type="number"
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    inputClassName="tabular-nums"
                                    autoFocus
                                />
                            </FormDialogBody>
                        )}

                        {/* Description */}
                        {stepIndex === 1 && (
                            <FormDialogBody key="transaction-description">
                                <Input
                                    label="Description"
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="e.g. Continente Lisboa"
                                    maxLength={200}
                                    autoFocus
                                />
                            </FormDialogBody>
                        )}

                        {/* Date + Account */}
                        {stepIndex === 2 && (
                            <FormDialogBody key="transaction-account">
                                <DatePicker
                                    value={date}
                                    onChange={setDate}
                                    locale={language}
                                    placeholder="Date"
                                />
                                <Select value={accountId} onValueChange={setAccountId}>
                                    <FormSelectTrigger label="Account">
                                        <SelectValue placeholder="Select..." />
                                    </FormSelectTrigger>
                                    <SelectContent>
                                        {accounts.length === 0 ? (
                                            <div className="px-2 py-1.5 text-xs text-neutral-400">
                                                No accounts
                                            </div>
                                        ) : (
                                            accounts.map((a) => (
                                                <SelectItem key={a.id} value={a.id}>
                                                    <span className="flex items-center gap-2">
                                                        <span
                                                            className="size-2 shrink-0 sq-full"
                                                            style={{ backgroundColor: a.color }}
                                                        />
                                                        {a.name}
                                                    </span>
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </FormDialogBody>
                        )}

                        {/* Tags */}
                        {stepIndex === 3 && (
                            <FormDialogBody key="transaction-tags">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] text-neutral-400">Tags</label>
                                    <div className={`${UDS.controlSurface} px-2 py-1.5`}>
                                        <TagPicker value={tags} onChange={setTags} />
                                    </div>
                                    {!isEditing && tags.length === 0 && (
                                        <p className="text-xs text-neutral-400">
                                            Leave empty to auto-categorize.
                                        </p>
                                    )}
                                </div>
                            </FormDialogBody>
                        )}

                        <FormDialogActions>
                            <Button type="submit" variant="solid" size="lg" className="w-full" disabled={submitting}>
                                {stepIndex < 3 ? "Continue" : submitting ? "Saving..." : isEditing ? "Save" : "Create"}
                            </Button>
                            <Button
                                type="button"
                                variant="glass"
                                size="lg"
                                className="w-full"
                                onClick={() => {
                                    if (stepIndex === 0) {
                                        onOpenChange(false)
                                        return
                                    }
                                    setStepIndex((step) => Math.max(step - 1, 0))
                                }}
                                disabled={submitting}
                            >
                                {stepIndex === 0 ? "Cancel" : "Back"}
                            </Button>
                        </FormDialogActions>
                        <FormDialogStepIndicator current={stepIndex} total={4} />
                    </form>
            </FormDialogContent>
        </Dialog>
    )
}
