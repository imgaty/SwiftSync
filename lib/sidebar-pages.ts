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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            name: language === "pt" ? "Planilhas" : "Spreadsheets",
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
            name: t.sidebar_goals || (language === "pt" ? "Metas" : "Goals"),
            url: "/Goals",
            icon: Target,
        },
    ]
}
