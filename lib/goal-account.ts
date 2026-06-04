//
//  goal-account.ts
//  Argent
//
//  Created by Codex on 31 May 2026.
//  Description: Shared formatting helpers for financial goals and their virtual reserved accounts.
//

export type GoalWithReservedAccounts = {
  id: string
  name: string
  targetAmount: unknown
  currentAmount: unknown
  deadline: Date | null
  category: string
  color: string
  status: string
  createdAt: Date
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

export function toAmount(value: unknown) {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : 0
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
  const targetAmount = toAmount(goal.targetAmount)
  const accountAmount = accounts.reduce((sum, account) => sum + account.balance, 0)
  const currentAmount = accounts.length > 0 ? accountAmount : toAmount(goal.currentAmount)
  const status = goal.status === "cancelled"
    ? "cancelled"
    : currentAmount >= targetAmount
      ? "completed"
      : "active"

  return {
    id: goal.id,
    name: goal.name,
    targetAmount,
    currentAmount,
    deadline: goal.deadline?.toISOString().slice(0, 10) || null,
    category: goal.category,
    color: goal.color,
    status,
    percentage: targetAmount > 0
      ? Math.round((currentAmount / targetAmount) * 100)
      : 0,
    accounts,
    createdAt: goal.createdAt.toISOString(),
  }
}
