//
//  mobile-dock.tsx
//  Argent
//
//  Created by OpenAI on 01 June 2026.
//  Description: Provides the compact mobile primary navigation dock for the main finance app shell.
//
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MoreHorizontal } from "lucide-react"

import { useLanguage } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"
import { getSidebarPageDefinitions, type SidebarPageId } from "@/lib/sidebar-pages"
import { getTranslations } from "@/lib/translation-utils"
import { UDS } from "@/lib/UDS"
import { cn } from "@/lib/utils"

const PRIMARY_DOCK_IDS: SidebarPageId[] = ["dashboard", "transactions", "budgets", "accounts"]

export function MobileDock() {
    const pathname = usePathname()
    const { t, language } = useLanguage()
    const { setOpenMobile } = useSidebar()
    const nav = getTranslations(t, "nav")
    const pages = getSidebarPageDefinitions(t, language)
    const primaryPages = PRIMARY_DOCK_IDS
        .map((id) => pages.find((page) => page.id === id))
        .filter((page): page is NonNullable<typeof page> => Boolean(page))

    const isActive = (url: string) => pathname === url || (url !== "/" && pathname.startsWith(`${url}/`))

    return (
        <nav
            aria-label={nav.primary_navigation || "Primary navigation"}
            className="pointer-events-none fixed inset-x-0 bottom-0 z-[950] px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:hidden"
        >
            <div className={cn(UDS.mobileDockSurface, "pointer-events-auto mx-auto grid max-w-md grid-cols-5 gap-1 p-1.5")}>
                {primaryPages.map((page) => {
                    const active = isActive(page.url)
                    const Icon = page.icon

                    return (
                        <Link
                            key={page.id}
                            href={page.url}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                                "flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 px-1.5 py-1.5 text-xs font-medium leading-none text-muted-foreground transition-[background-color,color,transform] duration-150 sq-normal",
                                UDS.itemHover,
                                active && "bg-[color:var(--selection-cell-background)] text-foreground sq-border-strong",
                                "active:scale-[0.97]",
                            )}
                        >
                            <Icon className="size-4 shrink-0" />
                            <span className="max-w-full truncate">{page.name}</span>
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
