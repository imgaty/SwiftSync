//
//  admin-mobile-dock.tsx
//  Argent
//
//  Created by GitHub Copilot on 09 June 2026.
//  Description: Provides the compact mobile navigation dock for the admin app shell.
//
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    Activity,
    ArrowLeftRight,
    LayoutDashboard,
    MoreHorizontal,
    Users,
    type LucideIcon,
} from "lucide-react"

import { useLanguage } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"
import { UDS } from "@/lib/UDS"
import { getTranslations, type LooseTranslations } from "@/lib/translation-utils"
import { cn } from "@/lib/utils"

interface AdminDockItem {
    name: string
    url: string
    icon: LucideIcon
}

function getAdminDockItems(a: LooseTranslations): AdminDockItem[] {
    return [
        { name: a.dashboard || "Dashboard", url: "/admin", icon: LayoutDashboard },
        { name: a.users || "Users", url: "/admin/users", icon: Users },
        { name: a.transactions || "Transactions", url: "/admin/transactions", icon: ArrowLeftRight },
        { name: a.system_health || "Health", url: "/admin/health", icon: Activity },
    ]
}

export function AdminMobileDock() {
    const pathname = usePathname()
    const { t } = useLanguage()
    const { setOpenMobile } = useSidebar()
    const a = React.useMemo(() => getTranslations(t, "admin"), [t])
    const nav = React.useMemo(() => getTranslations(t, "nav"), [t])
    const items = React.useMemo(() => getAdminDockItems(a), [a])

    const isActive = React.useCallback((url: string) => (
        url === "/admin" ? pathname === "/admin" : pathname.startsWith(url)
    ), [pathname])

    return (
        <nav
            aria-label={nav.admin_navigation || "Admin navigation"}
            className="pointer-events-none fixed inset-x-0 bottom-0 z-950 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:hidden"
        >
            <div className={cn(UDS.mobileDockSurface, "pointer-events-auto mx-auto grid max-w-md grid-cols-5 gap-1 p-1.5")}>
                {items.map((item) => {
                    const active = isActive(item.url)
                    const Icon = item.icon

                    return (
                        <Link
                            key={item.url}
                            href={item.url}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                                "flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 px-1.5 py-1.5 text-xs font-medium leading-none text-muted-foreground transition-[background-color,color,transform] duration-150 sq-normal",
                                UDS.itemHover,
                                active && "bg-(--selection-cell-background) text-foreground sq-border-strong",
                                "active:scale-[0.97]",
                            )}
                        >
                            <Icon className="size-4 shrink-0" />
                            <span className="max-w-full truncate">{item.name}</span>
                        </Link>
                    )
                })}

                <Button
                    type="button"
                    variant="ghost"
                    className={cn(
                        "flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 px-1.5 py-1.5 text-xs font-medium leading-none text-muted-foreground sq-normal",
                        UDS.itemHover,
                    )}
                    onClick={() => setOpenMobile(true)}
                    aria-label={nav.more_pages || "More pages"}
                >
                    <MoreHorizontal className="size-4 shrink-0" />
                    <span>{nav.more || "More"}</span>
                </Button>
            </div>
        </nav>
    )
}
