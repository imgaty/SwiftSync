//
//  sidebar-pages.ts
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Provides shared sidebar pages logic for Argent, centralizing domain behavior, helpers,
//  or integration code used by pages, routes, and components.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import {
    ArrowLeftRight,
    Calendar,
    FileSpreadsheet,
    LayoutDashboard,
    PiggyBank,
    Receipt,
    Target,
    Wallet,
    type LucideIcon,
} from "lucide-react"

export type SidebarPageId =
    | "dashboard"
    | "transactions"
    | "budgets"
    | "bills"
    | "accounts"
    | "spreadsheets"
    | "calendar"
    | "goals"

export interface SidebarPageDefinition {
    id: SidebarPageId
    name: string
    url: string
    icon: LucideIcon
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
export function getSidebarPageDefinitions(t: any, language: string): SidebarPageDefinition[] {
    return [
        {
            id: "dashboard",
            name: t.sidebar_dashboard,
            url: "/",
            icon: LayoutDashboard,
        },
        {
            id: "transactions",
            name: t.finance?.transactions || "Transactions",
            url: "/Transactions",
            icon: ArrowLeftRight,
        },
        {
            id: "budgets",
            name: t.finance?.budgets || "Budgets",
            url: "/Budgets",
            icon: PiggyBank,
        },
        {
            id: "bills",
            name: t.finance?.bills || "Bills",
            url: "/Bills",
            icon: Receipt,
        },
        {
            id: "accounts",
            name: t.finance?.accounts || "Accounts",
            url: "/Accounts",
            icon: Wallet,
        },
        {
            id: "spreadsheets",
            name: t.spreadsheets?.title || "Spreadsheets",
            url: "/Spreadsheets",
            icon: FileSpreadsheet,
        },
        {
            id: "calendar",
            name: t.sidebar_calendar,
            url: "/Calendar",
            icon: Calendar,
        },
        {
            id: "goals",
            name: t.sidebar_goals || "Goals",
            url: "/Goals",
            icon: Target,
        },
    ]
}
