import { NextResponse } from "next/server"
import { getAuthContext } from "@/lib/auth-helpers"
import { scopeFilter, requirePermission } from "@/lib/data-access"
import { prisma } from "@/lib/prisma"

function csvCell(value: unknown): string {
  const val = String(value ?? "")
  const safe = /^[=+\-@]/.test(val) ? `'${val}` : val
  return safe.includes(",") || safe.includes('"') || safe.includes("\n")
    ? `"${safe.replace(/"/g, '""')}"`
    : safe
}

// GET /api/export?format=csv|json&entity=transactions|bills|budgets|accounts|all
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

    let exportData: Record<string, unknown>[]
    let filename: string

    switch (entity) {
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
