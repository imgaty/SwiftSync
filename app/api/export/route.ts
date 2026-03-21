import { NextResponse } from "next/server"
import { getAuthUserId } from "@/lib/auth-helpers"
import type { FinanceData } from "@/lib/types"
import { readFile } from "fs/promises"
import { join } from "path"

// GET /api/export?type=csv|json&entity=transactions|bills|budgets|accounts|all
export async function GET(request: Request) {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const format = searchParams.get("format") || "csv"
  const entity = searchParams.get("entity") || "transactions"
  const startDate = searchParams.get("start")
  const endDate = searchParams.get("end")

  try {
    const dataPath = join(process.cwd(), "public", "data.json")
    const raw = await readFile(dataPath, "utf-8")
    const data: FinanceData = JSON.parse(raw)

    let exportData: Record<string, unknown>[]
    let filename: string

    switch (entity) {
      case "transactions": {
        let txns = data.transactions
        if (startDate) txns = txns.filter((t) => t.date >= startDate)
        if (endDate) txns = txns.filter((t) => t.date <= endDate)
        exportData = txns.map((t) => ({
          Date: t.date,
          Description: t.description,
          Type: t.type === "in" ? "Income" : "Expense",
          Amount: t.amount.toFixed(2),
          Tags: t.tags.join(", "),
          Account: t.accountId,
        }))
        filename = `swift_transactions_${new Date().toISOString().slice(0, 10)}`
        break
      }
      case "bills": {
        exportData = data.bills.map((b) => ({
          Name: b.name,
          Amount: b.amount.toFixed(2),
          "Due Day": b.dueDay,
          Frequency: b.frequency,
          Category: b.category,
          Account: b.accountId,
        }))
        filename = `swift_bills_${new Date().toISOString().slice(0, 10)}`
        break
      }
      case "budgets": {
        exportData = data.budgets.map((b) => ({
          Category: b.category,
          Tag: b.tag,
          "Budget Limit": b.limit.toFixed(2),
          "Spent Amount": b.spentAmount.toFixed(2),
          Remaining: (b.limit - b.spentAmount).toFixed(2),
          "% Used": ((b.spentAmount / b.limit) * 100).toFixed(1) + "%",
        }))
        filename = `swift_budgets_${new Date().toISOString().slice(0, 10)}`
        break
      }
      case "accounts": {
        exportData = data.accounts.map((a) => ({
          Name: a.name,
          Type: a.type,
          Institution: a.institution,
          Balance: a.balance.toFixed(2),
          "Total In": a.totalIn.toFixed(2),
          "Total Out": a.totalOut.toFixed(2),
          Transactions: a.transactionCount,
        }))
        filename = `swift_accounts_${new Date().toISOString().slice(0, 10)}`
        break
      }
      default: {
        // Export all — summary report
        const totalBalance = data.accounts.reduce((s, a) => s + a.balance, 0)
        const totalIncome = data.transactions.filter((t) => t.type === "in").reduce((s, t) => s + t.amount, 0)
        const totalExpenses = data.transactions.filter((t) => t.type === "out").reduce((s, t) => s + t.amount, 0)
        exportData = [
          { Metric: "Total Balance", Value: totalBalance.toFixed(2) },
          { Metric: "Total Income", Value: totalIncome.toFixed(2) },
          { Metric: "Total Expenses", Value: totalExpenses.toFixed(2) },
          { Metric: "Net", Value: (totalIncome - totalExpenses).toFixed(2) },
          { Metric: "Total Accounts", Value: String(data.accounts.length) },
          { Metric: "Total Transactions", Value: String(data.transactions.length) },
          { Metric: "Total Bills", Value: String(data.bills.length) },
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
          .map((h) => {
            const val = String(row[h] ?? "")
            // Escape commas and quotes in CSV
            return val.includes(",") || val.includes('"')
              ? `"${val.replace(/"/g, '""')}"`
              : val
          })
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
