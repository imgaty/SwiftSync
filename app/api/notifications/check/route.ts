//
//  route.ts
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Handles the /api/notifications/check API endpoint for Argent, keeping request parsing,
//  business operations, and response formatting at the route boundary.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
/* Generate event-driven notifications for the caller.
 *
 * Scans the caller's bills, budgets, and goals and creates a notification when
 * a bill is due/overdue, a budget is exceeded (or near its limit), or a goal
 * has been reached. Idempotent — won't duplicate within the same window.
 *
 * Learn more in `docs/Financial Features.md`
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext } from "@/lib/auth-helpers"
import { scopeFilter, scopeCreateData } from "@/lib/data-access"
export async function POST() {
  const ctx = await getAuthContext()
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const created: string[] = []
  const today = new Date()
  const todayDay = today.getDate()
  const baseFilter = scopeFilter(ctx)
  const notificationFilter = { ...baseFilter, userId: ctx.userId }

  // --- Check bills due soon ---
  const bills = await prisma.bill.findMany({ where: baseFilter })
  for (const bill of bills) {
    const daysUntilDue = bill.dueDay - todayDay
    const billName = bill.name

    // Bill due in 1-3 days
    if (daysUntilDue > 0 && daysUntilDue <= 3 && bill.status !== "paid") {
      const existing = await prisma.notification.findFirst({
        where: {
          ...notificationFilter,
          type: "bill_due",
          title: { contains: billName },
          createdAt: { gte: new Date(today.toISOString().slice(0, 10)) },
        },
      })
      if (!existing) {
        await prisma.notification.create({
          data: {
            ...scopeCreateData(ctx),
            title: `${billName} vence em ${daysUntilDue} dia(s)`,
            message: `A conta "${billName}" no valor de €${Number(bill.amount).toFixed(2)} vence no dia ${bill.dueDay}.`,
            type: "bill_due",
            actionUrl: "/Bills",
          },
        })
        created.push(`bill_due:${billName}`)
      }
    }

    // Overdue bill
    if (daysUntilDue < 0 && bill.status !== "paid") {
      const existing = await prisma.notification.findFirst({
        where: {
          ...notificationFilter,
          type: "bill_due",
          title: { contains: "em atraso" },
          message: { contains: billName },
          createdAt: { gte: new Date(today.toISOString().slice(0, 10)) },
        },
      })
      if (!existing) {
        await prisma.notification.create({
          data: {
            ...scopeCreateData(ctx),
            title: `${billName} em atraso!`,
            message: `A conta "${billName}" no valor de €${Number(bill.amount).toFixed(2)} está em atraso há ${Math.abs(daysUntilDue)} dia(s).`,
            type: "bill_due",
            actionUrl: "/Bills",
          },
        })
        created.push(`bill_overdue:${billName}`)
      }
    }
  }

  // --- Check budgets exceeded ---
  const budgets = await prisma.budget.findMany({ where: baseFilter })
  const currentMonth = today.toISOString().slice(0, 7)
  const transactions = await prisma.transaction.findMany({
    where: {
      ...baseFilter,
      type: "out",
      date: {
        gte: new Date(`${currentMonth}-01`),
        lt: new Date(today.getFullYear(), today.getMonth() + 1, 1),
      },
    },
  })

  for (const budget of budgets) {
    const spent = transactions
      .filter((t) => t.tags.includes(budget.tag))
      .reduce((sum, t) => sum + Number(t.amount), 0)
    const limit = Number(budget.limit)

    if (spent >= limit) {
      const existing = await prisma.notification.findFirst({
        where: {
          ...notificationFilter,
          type: "budget_exceeded",
          title: { contains: budget.category },
          createdAt: { gte: new Date(`${currentMonth}-01`) },
        },
      })
      if (!existing) {
        await prisma.notification.create({
          data: {
            ...scopeCreateData(ctx),
            title: `Orçamento "${budget.category}" excedido`,
            message: `Gastou €${spent.toFixed(2)} de €${limit.toFixed(2)} em ${budget.category} este mês.`,
            type: "budget_exceeded",
            actionUrl: "/Budgets",
          },
        })
        created.push(`budget_exceeded:${budget.category}`)
      }
    } else if (spent >= limit * 0.85) {
      // Warning at 85%
      const existing = await prisma.notification.findFirst({
        where: {
          ...notificationFilter,
          type: "budget_exceeded",
          title: { contains: "próximo do limite" },
          message: { contains: budget.category },
          createdAt: { gte: new Date(`${currentMonth}-01`) },
        },
      })
      if (!existing) {
        await prisma.notification.create({
          data: {
            ...scopeCreateData(ctx),
            title: `Orçamento "${budget.category}" próximo do limite`,
            message: `Já gastou ${Math.round((spent / limit) * 100)}% do orçamento de ${budget.category}.`,
            type: "budget_exceeded",
            actionUrl: "/Budgets",
          },
        })
        created.push(`budget_warning:${budget.category}`)
      }
    }
  }

  // --- Check financial goals reached ---
  const goals = await prisma.financialGoal.findMany({
    where: { ...baseFilter, status: "active" },
  })
  for (const goal of goals) {
    if (Number(goal.currentAmount) >= Number(goal.targetAmount)) {
      // Re-apply the scope filter on the write so a future refactor of the read
      // query above can't accidentally turn this into a cross-scope write.
      await prisma.financialGoal.updateMany({
        where: { id: goal.id, ...baseFilter },
        data: { status: "completed" },
      })
      await prisma.notification.create({
        data: {
          ...scopeCreateData(ctx),
          title: `Meta "${goal.name}" atingida! 🎉`,
          message: `Parabéns! Atingiu a sua meta de €${Number(goal.targetAmount).toFixed(2)} para "${goal.name}".`,
          type: "goal_reached",
          actionUrl: "/Goals",
        },
      })
      created.push(`goal_reached:${goal.name}`)
    }
  }

  return NextResponse.json({ created, count: created.length })
}
