import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth-helpers"

/**
 * POST /api/notifications/check — Check and generate notifications for:
 * - Bills due soon (within 3 days)
 * - Overdue bills
 * - Budget exceeded warnings
 * - Financial goals reached
 */
export async function POST() {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const created: string[] = []
  const today = new Date()
  const todayDay = today.getDate()

  // --- Check bills due soon ---
  const bills = await prisma.bill.findMany({ where: { userId } })
  for (const bill of bills) {
    const daysUntilDue = bill.dueDay - todayDay
    const billName = bill.name

    // Bill due in 1-3 days
    if (daysUntilDue > 0 && daysUntilDue <= 3 && bill.status !== "paid") {
      const existing = await prisma.notification.findFirst({
        where: {
          userId,
          type: "bill_due",
          title: { contains: billName },
          createdAt: { gte: new Date(today.toISOString().slice(0, 10)) },
        },
      })
      if (!existing) {
        await prisma.notification.create({
          data: {
            userId,
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
          userId,
          type: "bill_due",
          title: { contains: "em atraso" },
          message: { contains: billName },
          createdAt: { gte: new Date(today.toISOString().slice(0, 10)) },
        },
      })
      if (!existing) {
        await prisma.notification.create({
          data: {
            userId,
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
  const budgets = await prisma.budget.findMany({ where: { userId } })
  const currentMonth = today.toISOString().slice(0, 7)
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
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
          userId,
          type: "budget_exceeded",
          title: { contains: budget.category },
          createdAt: { gte: new Date(`${currentMonth}-01`) },
        },
      })
      if (!existing) {
        await prisma.notification.create({
          data: {
            userId,
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
          userId,
          type: "budget_exceeded",
          title: { contains: "próximo do limite" },
          message: { contains: budget.category },
          createdAt: { gte: new Date(`${currentMonth}-01`) },
        },
      })
      if (!existing) {
        await prisma.notification.create({
          data: {
            userId,
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
    where: { userId, status: "active" },
  })
  for (const goal of goals) {
    if (Number(goal.currentAmount) >= Number(goal.targetAmount)) {
      await prisma.financialGoal.update({
        where: { id: goal.id },
        data: { status: "completed" },
      })
      await prisma.notification.create({
        data: {
          userId,
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
