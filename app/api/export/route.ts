//
//  route.ts
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Handles the /api/export API endpoint for Argent, keeping request parsing, business
//  operations, and response formatting at the route boundary.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import { NextResponse } from "next/server"
import { getAuthContext } from "@/lib/auth-helpers"
import { scopeFilter, requirePermission } from "@/lib/data-access"
import { ARGENT_BACKUP_SCHEMA } from "@/lib/data-import"
import { prisma } from "@/lib/prisma"

function csvCell(value: unknown): string {
  const val = String(value ?? "")
  const safe = /^[=+\-@]/.test(val) ? `'${val}` : val
  return safe.includes(",") || safe.includes('"') || safe.includes("\n")
    ? `"${safe.replace(/"/g, '""')}"`
    : safe
}

// GET /api/export?format=csv|json&entity=transactions|bills|budgets|accounts|backup|all
export async function GET(request: Request) {
  const ctx = await getAuthContext()
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  const permissionError = await requirePermission(ctx, "data:export")
  if (permissionError) return permissionError

  const { searchParams } = new URL(request.url)
  const format = searchParams.get("format") || "csv"
  const entity = searchParams.get("entity") || "transactions"
  const startDate = searchParams.get("start")
  const endDate = searchParams.get("end")

  try {
    const where = scopeFilter(ctx)

    let exportData: Record<string, unknown>[] | Record<string, unknown>
    let filename: string

    switch (entity) {
      case "backup": {
        if (format !== "json") {
          return NextResponse.json({ error: "Backup exports are available as JSON only" }, { status: 400 })
        }

        const [accounts, tags, txns, bills, budgets, goals, rules, paceRules, spreadsheets] = await Promise.all([
          prisma.bankAccount.findMany({ where, include: { bank: true }, orderBy: { createdAt: "asc" } }),
          prisma.tag.findMany({ where, orderBy: { createdAt: "asc" } }),
          prisma.transaction.findMany({ where, orderBy: { date: "desc" } }),
          prisma.bill.findMany({ where, orderBy: { createdAt: "asc" } }),
          prisma.budget.findMany({ where, orderBy: { createdAt: "asc" } }),
          prisma.financialGoal.findMany({ where, include: { accountLinks: { orderBy: { createdAt: "asc" } } }, orderBy: { createdAt: "asc" } }),
          prisma.rule.findMany({ where, orderBy: [{ priority: "desc" }, { createdAt: "asc" }] }),
          prisma.pACERule.findMany({ where, orderBy: [{ priority: "desc" }, { createdAt: "asc" }] }),
          prisma.spreadsheetDocument.findMany({ where, orderBy: { createdAt: "asc" } }),
        ])

        exportData = {
          schema: ARGENT_BACKUP_SCHEMA,
          version: 1,
          exportedAt: new Date().toISOString(),
          data: {
            accounts: accounts.map((account) => ({
              id: account.id,
              name: account.cardName,
              type: account.accountType,
              institution: account.bank.name,
              balance: Number(account.balance),
              iban: account.iban,
              currency: account.currency,
              color: account.color,
              isActive: account.isActive,
            })),
            tags: tags.map((tag) => ({
              id: tag.id,
              slug: tag.slug,
              name: tag.name,
              color: tag.color,
              icon: tag.icon,
              isSystem: tag.isSystem,
              isArchived: tag.isArchived,
            })),
            transactions: txns.map((transaction) => ({
              id: transaction.id,
              date: transaction.date.toISOString().slice(0, 10),
              type: transaction.type,
              amount: Number(transaction.amount),
              description: transaction.description,
              tags: transaction.tags,
              accountId: transaction.accountId,
            })),
            bills: bills.map((bill) => ({
              id: bill.id,
              name: bill.name,
              amount: Number(bill.amount),
              tags: bill.tags,
              dueDay: bill.dueDay,
              frequency: bill.frequency,
              accountId: bill.accountId,
              category: bill.category,
              autopay: bill.autopay,
              status: bill.status,
            })),
            budgets: budgets.map((budget) => ({
              id: budget.id,
              tag: budget.tag,
              category: budget.category,
              limit: Number(budget.limit),
              color: budget.color,
            })),
            goals: goals.map((goal) => ({
              id: goal.id,
              accountId: goal.accountId,
              name: goal.name,
              targetAmount: Number(goal.targetAmount),
              currentAmount: Number(goal.currentAmount),
              baselineAmount: Number(goal.baselineAmount),
              targetMode: goal.targetMode === "additional" ? "additional" : "total",
              deadline: goal.deadline?.toISOString().slice(0, 10) || null,
              category: goal.category,
              color: goal.color,
              status: goal.status,
              currency: goal.accountLinks[0]?.currency || "EUR",
            })),
            rules: rules.map((rule) => ({
              id: rule.id,
              name: rule.name,
              enabled: rule.enabled,
              filters: rule.filters,
              addTagSlugs: rule.addTagSlugs,
              priority: rule.priority,
            })),
            paceRules: paceRules.map((rule) => ({
              id: rule.id,
              pattern: rule.pattern,
              matchField: rule.matchField,
              tag: rule.tag,
              priority: rule.priority,
            })),
            spreadsheets: spreadsheets.map((sheet) => ({
              id: sheet.id,
              name: sheet.name,
              description: sheet.description,
              sheetType: sheet.sheetType,
              linkedEntity: sheet.linkedEntity,
              content: sheet.content,
            })),
          },
        }
        filename = `argent_backup_${new Date().toISOString().slice(0, 10)}`
        break
      }
      case "transactions": {
        const dateFilter: { gte?: Date; lte?: Date } = {}
        if (startDate) dateFilter.gte = new Date(startDate)
        if (endDate) dateFilter.lte = new Date(endDate)

        const txns = await prisma.transaction.findMany({
          where: {
            ...where,
            ...(startDate || endDate ? { date: dateFilter } : {}),
          },
          orderBy: { date: "desc" },
        })
        exportData = txns.map((t) => ({
          Date: t.date.toISOString().slice(0, 10),
          Description: t.description,
          Type: t.type === "in" ? "Income" : "Expense",
          Amount: Number(t.amount).toFixed(2),
          Tags: t.tags.join(", "),
          Account: t.accountId,
        }))
        filename = `swift_transactions_${new Date().toISOString().slice(0, 10)}`
        break
      }
      case "bills": {
        const bills = await prisma.bill.findMany({ where })
        exportData = bills.map((b) => ({
          Name: b.name,
          Amount: Number(b.amount).toFixed(2),
          "Due Day": b.dueDay,
          Frequency: b.frequency,
          Category: b.category,
          Account: b.accountId,
        }))
        filename = `swift_bills_${new Date().toISOString().slice(0, 10)}`
        break
      }
      case "budgets": {
        const [budgets, txns] = await Promise.all([
          prisma.budget.findMany({ where }),
          prisma.transaction.findMany({ where, select: { tags: true, amount: true, type: true } }),
        ])
        exportData = budgets.map((b) => {
          const spent = txns
            .filter((t) => t.type === "out" && t.tags.includes(b.tag))
            .reduce((s, t) => s + Number(t.amount), 0)
          const limit = Number(b.limit)
          return {
            Category: b.category,
            Tag: b.tag,
            "Budget Limit": limit.toFixed(2),
            "Spent Amount": spent.toFixed(2),
            Remaining: (limit - spent).toFixed(2),
            "% Used": limit > 0 ? ((spent / limit) * 100).toFixed(1) + "%" : "0%",
          }
        })
        filename = `swift_budgets_${new Date().toISOString().slice(0, 10)}`
        break
      }
      case "accounts": {
        const accounts = await prisma.bankAccount.findMany({
          where,
          include: { bank: true },
        })
        const txns = await prisma.transaction.findMany({
          where,
          select: { accountId: true, amount: true, type: true },
        })
        exportData = accounts.map((a) => {
          const accTxns = txns.filter((t) => t.accountId === a.id)
          const totalIn = accTxns.filter((t) => t.type === "in").reduce((s, t) => s + Number(t.amount), 0)
          const totalOut = accTxns.filter((t) => t.type === "out").reduce((s, t) => s + Number(t.amount), 0)
          return {
            Name: a.cardName,
            Type: a.accountType,
            Institution: a.bank.name,
            Balance: Number(a.balance).toFixed(2),
            "Total In": totalIn.toFixed(2),
            "Total Out": totalOut.toFixed(2),
            Transactions: accTxns.length,
          }
        })
        filename = `swift_accounts_${new Date().toISOString().slice(0, 10)}`
        break
      }
      default: {
        // Export all — summary report
        const [accounts, txns, bills] = await Promise.all([
          prisma.bankAccount.findMany({ where, select: { balance: true } }),
          prisma.transaction.findMany({ where, select: { type: true, amount: true } }),
          prisma.bill.count({ where }),
        ])
        const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0)
        const totalIncome = txns.filter((t) => t.type === "in").reduce((s, t) => s + Number(t.amount), 0)
        const totalExpenses = txns.filter((t) => t.type === "out").reduce((s, t) => s + Number(t.amount), 0)
        exportData = [
          { Metric: "Total Balance", Value: totalBalance.toFixed(2) },
          { Metric: "Total Income", Value: totalIncome.toFixed(2) },
          { Metric: "Total Expenses", Value: totalExpenses.toFixed(2) },
          { Metric: "Net", Value: (totalIncome - totalExpenses).toFixed(2) },
          { Metric: "Total Accounts", Value: String(accounts.length) },
          { Metric: "Total Transactions", Value: String(txns.length) },
          { Metric: "Total Bills", Value: String(bills) },
          { Metric: "Report Date", Value: new Date().toISOString().slice(0, 10) },
        ]
        filename = `swift_report_${new Date().toISOString().slice(0, 10)}`
        break
      }
    }

    if (format === "json") {
      return new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${filename}.json"`,
        },
      })
    }

    // CSV format
    if (!Array.isArray(exportData)) {
      return NextResponse.json({ error: "This export is available as JSON only" }, { status: 400 })
    }

    if (exportData.length === 0) {
      return new NextResponse("No data to export", { status: 404 })
    }

    const headers = Object.keys(exportData[0])
    const csvRows = [
      headers.join(","),
      ...exportData.map((row) =>
        headers
          .map((h) => csvCell(row[h]))
          .join(",")
      ),
    ]
    const csv = csvRows.join("\n")

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
      },
    })
  } catch (error) {
    console.error("Export error:", error)
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 })
  }
}
