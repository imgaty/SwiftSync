//
//  goal-account.ts
//  Argent
//
//  Created by Codex on 31 May 2026.
//  Description: Shared formatting helpers for financial goals and their virtual reserved accounts.
//

export type GoalWithReservedAccounts = {
  id: string
  accountId: string | null
  name: string
  targetAmount: unknown
  currentAmount: unknown
  baselineAmount: unknown
  targetMode: unknown
  deadline: Date | null
  category: string
  color: string
  status: string
  createdAt: Date
  bankAccount?: {
    id: string
    cardName: string
    accountType: string
    balance: unknown
    currency: string
    color: string
    isActive: boolean
    bank: { name: string }
  } | null
  accountLinks: Array<{
    id: string
    name: string
    balance: unknown
    currency: string
    status: string
    transferReference: string
    createdAt: Date
  }>
}

export type GoalTargetMode = "total" | "additional"

export function toAmount(value: unknown) {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : 0
}

export function normalizeGoalTargetMode(value: unknown): GoalTargetMode {
  return value === "additional" ? "additional" : "total"
}

export function goalProgressSnapshot(input: {
  targetAmount: unknown
  currentAmount: unknown
  baselineAmount: unknown
  targetMode: unknown
}) {
  const targetAmount = toAmount(input.targetAmount)
  const trackedAmount = toAmount(input.currentAmount)
  const targetMode = normalizeGoalTargetMode(input.targetMode)
  const baselineAmount = targetMode === "additional"
    ? Math.max(0, toAmount(input.baselineAmount))
    : 0
  const progressAmount = targetMode === "additional"
    ? Math.max(0, trackedAmount - baselineAmount)
    : trackedAmount

  return {
    targetMode,
    targetAmount,
    trackedAmount,
    baselineAmount,
    progressAmount,
    targetTotalAmount: targetMode === "additional" ? baselineAmount + targetAmount : targetAmount,
    remainingAmount: Math.max(0, targetAmount - progressAmount),
    percentage: targetAmount > 0 ? Math.round((progressAmount / targetAmount) * 100) : 0,
  }
}

export function goalStatusForProgress(status: string, progressAmount: number, targetAmount: number) {
  return status === "cancelled"
    ? "cancelled"
    : progressAmount >= targetAmount
      ? "completed"
      : "active"
}

export function goalAccountName(goalName: string) {
  return `${goalName} Goal Account`
}

export function goalTransferReference(goalId: string) {
  return `ARGENT-GOAL-${goalId.toUpperCase()}`
}

export function formatGoal(goal: GoalWithReservedAccounts) {
  const accounts = goal.accountLinks.map((account) => ({
    id: account.id,
    name: account.name,
    type: "goal_account",
    institution: "Argent",
    balance: toAmount(account.balance),
    currency: account.currency,
    color: goal.color,
    status: account.status,
    reference: account.transferReference,
    createdAt: account.createdAt.toISOString(),
  }))
  const accountAmount = accounts.reduce((sum, account) => sum + account.balance, 0)
  const trackedAmount = accounts.length > 0 ? accountAmount : toAmount(goal.currentAmount)
  const progress = goalProgressSnapshot({
    targetAmount: goal.targetAmount,
    currentAmount: trackedAmount,
    baselineAmount: goal.baselineAmount,
    targetMode: goal.targetMode,
  })
  const linkedAccount = goal.bankAccount ? {
    id: goal.bankAccount.id,
    name: goal.bankAccount.cardName,
    type: goal.bankAccount.accountType,
    institution: goal.bankAccount.bank.name,
    balance: toAmount(goal.bankAccount.balance),
    currency: goal.bankAccount.currency,
    color: goal.bankAccount.color,
    isActive: goal.bankAccount.isActive,
  } : null
  const status = goalStatusForProgress(goal.status, progress.progressAmount, progress.targetAmount)

  return {
    id: goal.id,
    accountId: goal.accountId,
    name: goal.name,
    targetAmount: progress.targetAmount,
    currentAmount: progress.progressAmount,
    balanceAmount: progress.trackedAmount,
    baselineAmount: progress.baselineAmount,
    targetMode: progress.targetMode,
    targetTotalAmount: progress.targetTotalAmount,
    remainingAmount: progress.remainingAmount,
    deadline: goal.deadline?.toISOString().slice(0, 10) || null,
    category: goal.category,
    color: goal.color,
    status,
    percentage: progress.percentage,
    linkedAccount,
    accounts,
    createdAt: goal.createdAt.toISOString(),
  }
}
